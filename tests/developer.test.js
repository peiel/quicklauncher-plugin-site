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
for (const id of ['quickstart', 'manifest', 'protocol', 'capabilities', 'install', 'publish', 'catalog']) {
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
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
console.log('开发者导航、示例执行及公开打包工具检查通过。');
