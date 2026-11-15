const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const installation = fs.readFileSync(path.join(root, 'install.html'), 'utf8');
const cards = [...html.matchAll(/<article class="plugin-card" id="([^"]+)" data-search="([^"]+)" data-repository="([^"]+)">/g)]
  .map((match) => ({ id: match[1], dataset: { search: match[2], repository: match[3] }, hidden: false, querySelector: () => ({}) }));
assert.deepEqual(cards.map((card) => card.id), ['password-plugin', 'calculator-plugin', 'reminder-plugin', 'timestamp-plugin', 'date-plugin', 'time-plugin', 'text-stats-plugin', 'url-codec-plugin']);
const repositories = JSON.parse(fs.readFileSync(path.join(root, 'catalog-repositories.json'), 'utf8'));
assert.deepEqual(repositories, cards.map((card) => card.dataset.repository), '插件卡片与目录收录仓库应一致');
for (const id of ['date-plugin', 'time-plugin']) {
  const card = html.match(new RegExp(`<article class="plugin-card" id="${id}"[\\s\\S]*?</article>`));
  assert.ok(card, `缺少 ${id}`);
  assert.match(card[0], /需要 QuickLauncher 1\.5 或更新版本/);
}

const elements = Object.fromEntries(['plugin-search', 'empty-state', 'result-count', 'search-status', 'plugin-count']
  .map((id) => [id, { value: '', textContent: '', hidden: false }]));
elements['plugin-search'].addEventListener = (event, handler) => {
  assert.equal(event, 'input');
  elements['plugin-search'].trigger = handler;
};
const document = {
  querySelector: (selector) => elements[selector.slice(1)],
  querySelectorAll: (selector) => selector === '.plugin-card' ? cards : []
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), { document, fetch: () => Promise.reject(new Error('offline')) });
assert.equal(elements['plugin-count'].textContent, '8');
assert.ok(!html.includes('id="sidebar-count"'));
assert.match(html, /插件目录<\/a>\s*<a href="install\.html">安装指南<\/a>\s*<a href="developer\.html">开发者<\/a>/);
assert.match(installation, /插件目录<\/a>\s*<a class="nav-current" href="install\.html" aria-current="page">安装指南<\/a>\s*<a href="developer\.html">开发者<\/a>/);
assert.match(installation, /href="\.\/">插件目录<\/a>/);
assert.ok(!html.includes('id="install"'));
assert.ok(html.includes('href="install.html">查看安装说明'));
let redirected = '';
vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), {
  document, window: { location: { hash: '#install', replace: (url) => { redirected = url; } } }
});
assert.equal(redirected, 'install.html');

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
search('date', ['date-plugin']);
search('time', ['timestamp-plugin', 'time-plugin']);
search('textstats', ['text-stats-plugin']);
search('urlcodec', ['url-codec-plugin']);
search('32', ['password-plugin']);
search('10m', ['reminder-plugin']);
search('now', ['timestamp-plugin']);
search('不存在', []);
search('', cards.map((card) => card.id));

for (const repo of ['quicklauncher-password-plugin', 'quicklauncher-calculator-plugin', 'quicklauncher-reminder-plugin', 'quicklauncher-timestamp-plugin', 'quicklauncher-date-plugin', 'quicklauncher-time-plugin', 'quicklauncher-text-stats-plugin', 'quicklauncher-url-codec-plugin']) {
  const deepLink = `quicklauncher://install?repo=peiel%2F${repo}`;
  const github = `https://github.com/peiel/${repo}`;
  assert.ok(html.includes(`href="${deepLink}"`), deepLink);
  assert.ok(html.includes(`href="${github}"`), github);
  assert.equal(new URL(deepLink).searchParams.get('repo'), `peiel/${repo}`);
}
console.log('插件目录搜索、数量、空状态和安装及源码链接检查通过。');
