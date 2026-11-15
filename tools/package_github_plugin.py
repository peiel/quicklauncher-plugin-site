#!/usr/bin/env python3
"""Package a local QuickLauncher plugin as a GitHub Release asset.

This tool never uploads or executes plugin code. Inspect the listed files before
publishing: no automatic check can identify every secret or private file.
"""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import unicodedata

MAX_FILES = 1000
MAX_CONTENT = 10_000_000
MAX_ASSET = 16_000_000
SENSITIVE_NAMES = {".git", ".env", ".envrc", ".ssh", ".aws", ".gnupg", ".netrc", ".npmrc", ".pypirc",
                   "credentials", "credentials.json", "id_rsa", "id_ed25519", "signing.local.xcconfig"}
SENSITIVE_SUFFIXES = {".pem", ".p12", ".pfx", ".key"}


def check_name(name: str) -> None:
    lower = name.lower()
    if (not name or name in {".", ".."} or "\\" in name or ":" in name
            or len(name.encode("utf-8")) > 255
            or any(unicodedata.category(character) == "Cc" for character in name)
            or lower in SENSITIVE_NAMES or lower.startswith(".env.")
            or Path(lower).suffix in SENSITIVE_SUFFIXES):
        raise ValueError(f"不允许的文件名或可能包含敏感信息的文件：{name}")


def read_regular_file(path: Path, expected: os.stat_result, remaining: int) -> bytes:
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags)
    try:
        actual = os.fstat(fd)
        if not stat.S_ISREG(actual.st_mode) or (actual.st_dev, actual.st_ino) != (expected.st_dev, expected.st_ino):
            raise ValueError(f"文件在打包过程中发生变化：{path.name}")
        chunks = []
        total = 0
        while True:
            chunk = os.read(fd, min(65536, remaining - total + 1))
            if not chunk:
                break
            total += len(chunk)
            if total > remaining:
                raise ValueError("插件文件总大小超过 10 MB")
            chunks.append(chunk)
        after = os.fstat(fd)
        if (after.st_size != actual.st_size or after.st_mtime_ns != actual.st_mtime_ns
                or after.st_ctime_ns != actual.st_ctime_ns):
            raise ValueError(f"文件在打包过程中发生变化：{path.name}")
        return b"".join(chunks)
    finally:
        os.close(fd)


def gather(root: Path) -> list[dict]:
    entries = []
    seen = set()
    total = 0

    def visit(directory: Path, parts: tuple[str, ...]) -> None:
        nonlocal total
        for child in sorted(os.scandir(directory), key=lambda item: item.name):
            check_name(child.name)
            components = parts + (child.name,)
            relative = "/".join(components)
            if len(relative.encode("utf-8")) > 512:
                raise ValueError(f"文件路径超过 512 字节：{relative}")
            normalized = unicodedata.normalize("NFD", relative).casefold()
            if normalized in seen:
                raise ValueError(f"文件名发生冲突：{relative}")
            seen.add(normalized)
            info = child.stat(follow_symlinks=False)
            if stat.S_ISLNK(info.st_mode):
                raise ValueError(f"不支持符号链接：{relative}")
            if stat.S_ISDIR(info.st_mode):
                visit(Path(child.path), components)
            elif stat.S_ISREG(info.st_mode):
                if len(entries) >= MAX_FILES:
                    raise ValueError("插件文件数量超过 1000")
                content = read_regular_file(Path(child.path), info, MAX_CONTENT - total)
                total += len(content)
                entries.append({"path": relative, "data": base64.b64encode(content).decode("ascii"),
                                "executable": bool(info.st_mode & 0o111)})
            else:
                raise ValueError(f"不支持特殊文件：{relative}")
    visit(root, ())
    return entries


def validate_manifest(entries: list[dict]) -> None:
    indexed = {entry["path"]: entry for entry in entries}
    if "manifest.json" not in indexed:
        raise ValueError("插件根目录缺少 manifest.json")
    try:
        data = base64.b64decode(indexed["manifest.json"]["data"])
        if len(data) > 65536:
            raise ValueError
        manifest = json.loads(data)
        if not isinstance(manifest, dict):
            raise ValueError
        for field in ("id", "name", "description", "keyword", "version", "author", "runtime", "entry"):
            if not isinstance(manifest.get(field), str):
                raise ValueError
        identifier = manifest["id"]
        keyword = manifest["keyword"]
        entry = manifest["entry"]
        if (len(identifier) > 120 or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", identifier)
                or not manifest["name"].strip() or not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", keyword)
                or manifest["runtime"] not in {"shell", "python", "ruby", "applescript", "executable"}
                or entry not in indexed):
            raise ValueError
        input_type = manifest.get("input")
        selected_text = manifest.get("acceptsSelectedText")
        preview_on_keyword = manifest.get("previewOnKeyword")
        if (input_type not in (None, "passwordLength", "arguments")
                or (selected_text is not None and not isinstance(selected_text, bool))
                or (selected_text is True and input_type != "arguments")
                or (preview_on_keyword is not None and not isinstance(preview_on_keyword, bool))):
            raise ValueError
        passive_trigger = manifest.get("passiveTrigger")
        if passive_trigger is not None:
            if not isinstance(passive_trigger, dict) or input_type != "arguments":
                raise ValueError
            allowed = passive_trigger.get("allowedCharacters")
            groups = passive_trigger.get("requiredCharacterGroups")

            def valid_characters(value: object) -> bool:
                return (isinstance(value, str) and 1 <= len(value) <= 128
                        and all(unicodedata.category(character) not in {"Cc", "Cf"}
                                and character not in "\u2028\u2029"
                                and not 0xD800 <= ord(character) <= 0xDFFF for character in value))

            if (passive_trigger.get("type") != "characterSet" or not valid_characters(allowed)
                    or not isinstance(groups, list) or not 1 <= len(groups) <= 8
                    or any(not valid_characters(group) or not set(group).issubset(allowed) for group in groups)):
                raise ValueError
        if manifest["runtime"] == "executable" and not indexed[entry]["executable"]:
            raise ValueError("executable 类型的入口必须具有执行权限")
    except (ValueError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("manifest.json 无效，或入口文件不存在/不可执行") from exc


def package(source: Path, output: Path) -> None:
    root_info = source.lstat()
    if not stat.S_ISDIR(root_info.st_mode):
        raise ValueError("插件源必须是普通目录，不能是符号链接")
    root = source.resolve(strict=True)
    destination = output.absolute()
    if not destination.name.endswith(".quicklauncher.json"):
        raise ValueError("输出文件名必须以 .quicklauncher.json 结尾")
    if destination.parent.resolve() == root or root in destination.parent.resolve().parents:
        raise ValueError("输出文件必须位于插件目录之外")
    entries = gather(root)
    validate_manifest(entries)
    asset = json.dumps({"version": 1, "files": entries}, ensure_ascii=False,
                       separators=(",", ":"), sort_keys=True).encode("utf-8") + b"\n"
    if len(asset) > MAX_ASSET:
        raise ValueError("打包后的资产超过 16 MB")
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(asset)
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    print(f"已生成：{destination}")
    print(f"SHA-256：{hashlib.sha256(asset).hexdigest()}")
    print("包含以下文件，请逐项检查后再发布：")
    for entry in entries:
        print(f"  {entry['path']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="将本地插件目录打包为 GitHub Release 资产；不会执行脚本或上传文件。")
    parser.add_argument("source", type=Path, help="包含 manifest.json 的插件目录")
    parser.add_argument("output", type=Path, help="插件目录之外的输出文件，后缀为 .quicklauncher.json")
    args = parser.parse_args()
    try:
        package(args.source, args.output)
    except (OSError, ValueError) as exc:
        print(f"打包失败：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
