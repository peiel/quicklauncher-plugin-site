const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'developer.html'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(home, /href="developer\.html">开发者<\/a>/);
assert.match(page, /href="developer\.html" aria-current="page">开发者<\/a>/);
assert.match(page, /插件目录<\/a>\s*<a href="install\.html">安装指南<\/a>\s*<a class="nav-current" href="developer\.html"/);
for (const id of ['quickstart', 'manifest', 'protocol', 'capabilities', 'install', 'publish', 'catalog', 'verification']) {
  assert.ok(page.includes(`id="${id}"`), `缺少 ${id}`);
  assert.ok(page.includes(`href="#${id}"`), `缺少 ${id} 目录链接`);
}
assert.ok(page.includes('href="tools/package_github_plugin.py" download'));
assert.ok(page.includes('href="tools/LICENSE"'));
assert.ok(page.includes('topic 不会自动出现在展示站'));

function example(name) {
  const pattern = new RegExp(`<code data-example="${name}">([\\s\\S]*?)<\\/code>`);
  const match = page.match(pattern);
  assert.ok(match, `缺少 ${name} 示例`);
  return match[1].replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}
const manifestText = example('manifest');
const manifest = JSON.parse(manifestText);
const passiveTrigger = JSON.parse(example('passive-trigger'));
assert.match(page, /previewOnKeyword/);
assert.match(page, /明文显示/);
assert.match(page, /当前显示的同一结果/);
assert.equal(passiveTrigger.type, 'characterSet');
assert.deepEqual(passiveTrigger.requiredCharacterGroups, ['0123456789', '+-*/×÷']);
assert.equal(manifest.input, 'arguments');
assert.equal(manifest.acceptsSelectedText, true);
assert.equal(manifest.entry, 'main.py');
const script = example('script');
function runExample(request) {
  const run = spawnSync('python3', ['-c', script], { input: JSON.stringify(request), encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}
assert.deepEqual(runExample({version: 1, arguments: 'Hello'}), {version: 1, action: 'copyAndShow', text: 'Hello'});
assert.deepEqual(runExample({version: 1, arguments: '选中文本'}), {version: 1, action: 'copyAndShow', text: '选中文本'});
assert.equal(runExample({version: 1, arguments: 'x'.repeat(201)}).action, 'error');
assert.equal(runExample({version: 1, arguments: '一\n二'}).action, 'error');
assert.equal(runExample({version: 2}).action, 'error');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quicklauncher-guide-'));
try {
  const plugin = path.join(tmp, 'example');
  fs.mkdirSync(plugin);
  fs.writeFileSync(path.join(plugin, 'manifest.json'), manifestText);
  fs.writeFileSync(path.join(plugin, 'main.py'), script);
  const output = path.join(tmp, 'example.quicklauncher.json');
  const packaged = spawnSync('python3', [path.join(root, 'tools/package_github_plugin.py'), plugin, output], { encoding: 'utf8' });
  assert.equal(packaged.status, 0, packaged.stderr);
  const asset = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(asset.version, 1);
  assert.deepEqual(asset.files.map((file) => file.path).sort(), ['main.py', 'manifest.json']);
  assert.equal(Buffer.from(asset.files.find((file) => file.path === 'main.py').data, 'base64').toString(), script);

  const packWith = (changes) => {
    fs.rmSync(output, {force: true});
    fs.writeFileSync(path.join(plugin, 'manifest.json'), JSON.stringify({...manifest, ...changes}));
    return spawnSync('python3', [path.join(root, 'tools/package_github_plugin.py'), plugin, output], {encoding: 'utf8'});
  };
  assert.equal(packWith({passiveTrigger}).status, 0);
  for (const valid of [true, false, null]) {
    assert.equal(packWith({previewOnKeyword: valid}).status, 0, `合法的预览设置 ${valid}`);
  }
  for (const invalid of ['true', 1, {}, []]) {
    assert.notEqual(packWith({previewOnKeyword: invalid}).status, 0, `非法的预览设置 ${JSON.stringify(invalid)}`);
    assert.equal(fs.existsSync(output), false);
  }
  const invalidTriggers = [
    'characterSet', {}, {...passiveTrigger, type: 'regex'},
    {...passiveTrigger, allowedCharacters: ''},
    {...passiveTrigger, allowedCharacters: 'x'.repeat(129)},
    {...passiveTrigger, allowedCharacters: '1+\n'},
    {...passiveTrigger, allowedCharacters: '1+\u2028'},
    {...passiveTrigger, allowedCharacters: '1+\u200b'},
    {...passiveTrigger, requiredCharacterGroups: []},
    {...passiveTrigger, requiredCharacterGroups: ['1'].concat(Array(8).fill('1'))},
    {...passiveTrigger, requiredCharacterGroups: ['']},
    {...passiveTrigger, requiredCharacterGroups: ['1'.repeat(129)]},
    {...passiveTrigger, requiredCharacterGroups: ['z']},
    {...passiveTrigger, requiredCharacterGroups: '1'},
  ];
  for (const invalid of invalidTriggers) {
    assert.notEqual(packWith({passiveTrigger: invalid}).status, 0, JSON.stringify(invalid));
    assert.equal(fs.existsSync(output), false);
  }
  assert.notEqual(packWith({input: 'passwordLength', acceptsSelectedText: false, passiveTrigger}).status, 0);
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
console.log('开发者导航、示例执行及公开打包工具检查通过。');
