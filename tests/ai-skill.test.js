const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'developer.html'), 'utf8');
const prompt = html.match(/<code id="ai-plugin-prompt">([\s\S]*?)<\/code>/)?.[1];
assert.ok(prompt, '提示词应存在于页面中');
assert.ok(prompt.includes('https://plugin.quicklauncher.flyee.tech/skills/quicklauncher-plugin/SKILL.md'));
assert.ok(fs.existsSync(path.join(root, 'skills/quicklauncher-plugin/SKILL.md')), 'Skill 下载文件应存在');

async function checkCopy(clipboard, expectedStatus, expectedText) {
  let handler;
  const button = { disabled: true, addEventListener: (_, fn) => { handler = fn; } };
  const status = { textContent: '' };
  const elements = { 'copy-ai-prompt': button, 'ai-plugin-prompt': { textContent: prompt }, 'copy-ai-status': status };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'developer.js'), 'utf8'), {
    document: { getElementById: id => elements[id] }, navigator: { clipboard }
  });
  assert.equal(button.disabled, false);
  await handler();
  assert.match(status.textContent, expectedStatus);
  if (expectedText) assert.equal(expectedText(), prompt);
}

(async () => {
  let copied;
  await checkCopy({ writeText: async text => { copied = text; } }, /已复制/, () => copied);
  await checkCopy(undefined, /手动选中/);
  await checkCopy({ writeText: async () => { throw new Error('denied'); } }, /手动选中/);
  console.log('AI Skill 提示词复制测试通过');
})().catch(error => { console.error(error); process.exitCode = 1; });
