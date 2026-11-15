const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cards = [...html.matchAll(/<article class="plugin-card" id="([^"]+)" data-search="([^"]+)">/g)]
  .map((match) => ({ id: match[1], dataset: { search: match[2] }, hidden: false }));
assert.deepEqual(cards.map((card) => card.id), ['password-plugin', 'calculator-plugin', 'reminder-plugin', 'timestamp-plugin']);

const elements = Object.fromEntries(['plugin-search', 'empty-state', 'result-count', 'search-status', 'plugin-count', 'sidebar-count']
  .map((id) => [id, { value: '', textContent: '', hidden: false }]));
elements['plugin-search'].addEventListener = (event, handler) => {
  assert.equal(event, 'input');
  elements['plugin-search'].trigger = handler;
};
const document = {
  querySelector: (selector) => elements[selector.slice(1)],
  querySelectorAll: (selector) => selector === '.plugin-card' ? cards : []
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), { document });
assert.equal(elements['plugin-count'].textContent, '4');
assert.equal(elements['sidebar-count'].textContent, '4');

function search(query, visible) {
  elements['plugin-search'].value = query;
  elements['plugin-search'].trigger();
  assert.deepEqual(cards.filter((card) => !card.hidden).map((card) => card.id), visible);
  assert.equal(elements['result-count'].textContent, String(visible.length));
  assert.equal(elements['empty-state'].hidden, visible.length > 0);
  assert.equal(elements['search-status'].textContent, visible.length ? `找到 ${visible.length} 个插件` : '没有找到匹配的插件');
}
search(' CALC ', ['calculator-plugin']);
search('提醒', ['reminder-plugin']);
search('password', ['password-plugin']);
search('timestamp', ['timestamp-plugin']);
search('时间戳', ['timestamp-plugin']);
search('不存在', []);
search('', cards.map((card) => card.id));

for (const repo of ['quicklauncher-password-plugin', 'quicklauncher-calculator-plugin', 'quicklauncher-reminder-plugin', 'quicklauncher-timestamp-plugin']) {
  const deepLink = `quicklauncher://install?repo=peiel%2F${repo}`;
  const github = `https://github.com/peiel/${repo}`;
  assert.ok(html.includes(`href="${deepLink}"`), deepLink);
  assert.ok(html.includes(`href="${github}"`), github);
  assert.equal(new URL(deepLink).searchParams.get('repo'), `peiel/${repo}`);
}
console.log('插件目录搜索、数量、空状态和四个安装及源码链接检查通过。');
