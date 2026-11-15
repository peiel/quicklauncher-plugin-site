---
name: quicklauncher-plugin
description: Develop, test, package, and publish script plugins for QuickLauncher. Use when creating or updating a QuickLauncher plugin or preparing its GitHub distribution and catalog submission.
---

# QuickLauncher 插件开发

根据用户需求创建或修改 QuickLauncher 脚本插件。先阅读最新的[开发者指南](https://plugin.quicklauncher.flyee.tech/developer.html)，以其中的协议、限制和发布步骤为准；无法访问时说明限制，不要猜测未记录的宿主能力。先确定功能、触发词、输入输出、运行语言和是否需要读取选区；根据已有信息合理决定，不必要求用户填写所有项目。

## 开发和测试

- 插件目录根部需要 `manifest.json` 和清单中指定的入口脚本。使用稳定、唯一的插件 ID；触发词、运行环境、入口和输入类型遵循指南。优先选择目标环境可用的运行时，说明额外依赖及其安装方式。
- 用户执行插件时，应用通过标准输入发送一个协议版本为 1 的 JSON 对象；脚本只向标准输出写一个响应 JSON，并以成功状态退出。使用指南中支持的 `action`；不要把日志写入标准输出。校验输入，处理错误，遵守执行时间和输出大小限制。
- 需要选中文字时，在清单声明 `input: "arguments"` 和 `acceptsSelectedText: true`。只有用户无参数执行时应用才尝试将选区作为 `arguments` 提供，可能需要辅助功能授权，选区不可用时应提供明确提示或支持手动输入。不要声称插件可通过宿主 API 直接访问剪贴板、书签或使用历史。
- 使用 `copyAndShow` 显示并复制普通结果，敏感结果使用不在面板显示内容的 `copy`。一次性提醒通过 `scheduleReminder` 交给应用安排，不让脚本后台等待。根据需求选择动作，不要编造宿主 API。
- 脚本以当前用户身份运行，可能访问本机文件和网络。只请求功能所需的权限，说明数据如何处理；不要将凭据写入插件包，也不要未经用户授权上传选区或其他数据。
- 用代表性输入直接运行入口脚本，验证输出 JSON、错误处理和所需边界；给出本地导入、审查和启用步骤。真实的选区读取、通知和应用内行为需要在 QuickLauncher 中验证；未实际验证时明确说明。

## 按需发布和收录

只有用户要求时才准备 GitHub 发布或目录收录。在用户授权范围内操作：遵循指南创建公开仓库和正式 Release，使用公开打包工具生成唯一的 `.quicklauncher.json` 附件，并确认版本、标签和包内容一致。应用从 GitHub 获取插件并由用户审核安装；网站本身不托管插件包。

目录收录需要向[插件官网仓库](https://github.com/peiel/quicklauncher-plugin-site)提交 Pull Request：按指南更新仓库白名单和插件卡片，不手动修改自动生成的 `catalog.json`。提交 PR 不代表自动收录；发布、收录或测试未实际完成时如实说明。
