const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const cards = [...html.matchAll(/<article class="plugin-card" id="([^"]+)" data-search="([^"]+)" data-repository="([^"]+)">/g)]
  .map((m) => ({ id: m[1], dataset: { search: m[2], repository: m[3] }, version: { textContent: '版本待同步' },
    querySelector(selector) { return selector === '.version' ? this.version : null; } }));
assert.equal(cards.length, 6);
assert.ok(!/<span class="version">v\d/.test(html), '卡片不能写死版本');
const elements = Object.fromEntries(['plugin-search', 'empty-state', 'result-count', 'search-status', 'plugin-count']
  .map((id) => [id, { value: '', textContent: '', hidden: false, addEventListener() {} }]));
const document = { querySelector: (s) => elements[s.slice(1)], querySelectorAll: () => cards };
const sample = { version: 1, generatedAt: Math.floor(Date.now() / 1000), entries: [
  { fullName: 'peiel/quicklauncher-password-plugin', tag: 'v1.1.1' },
  { fullName: 'peiel/quicklauncher-calculator-plugin', tag: 'v1.0.0' },
  { fullName: 'peiel/quicklauncher-reminder-plugin', tag: 'v1.0.2' },
  { fullName: 'peiel/quicklauncher-timestamp-plugin', tag: 'v1.0.0' },
  { fullName: 'peiel/quicklauncher-text-stats-plugin', tag: 'v1.0.0' },
  { fullName: 'peiel/quicklauncher-url-codec-plugin', tag: 'v1.0.0' }
] };
async function run(fetcher) {
  for (const card of cards) card.version.textContent = '版本待同步';
  vm.runInNewContext(script, { document, fetch: fetcher });
  await new Promise((resolve) => setImmediate(resolve));
}
(async () => {
  await run((url, options) => {
    assert.equal(url, 'catalog.json');
    assert.equal(options.cache, 'no-store');
    return Promise.resolve({ ok: true, json: () => Promise.resolve(sample) });
  });
  assert.deepEqual(cards.map((card) => card.version.textContent), ['v1.1.1', 'v1.0.0', 'v1.0.2', 'v1.0.0', 'v1.0.0', 'v1.0.0']);
  const changed = { ...sample, entries: sample.entries.map((e, i) => i === 0 ? { ...e, tag: 'v1.2.0' } : e) };
  await run(() => Promise.resolve({ ok: true, json: () => Promise.resolve(changed) }));
  assert.equal(cards[0].version.textContent, 'v1.2.0');
  const missing = { ...sample, entries: sample.entries.slice(1) };
  await run(() => Promise.resolve({ ok: true, json: () => Promise.resolve(missing) }));
  assert.equal(cards[0].version.textContent, '版本暂不可用');
  assert.equal(cards[1].version.textContent, 'v1.0.0');
  const stale = { ...sample, generatedAt: sample.generatedAt - 49 * 3600 };
  const duplicate = { ...sample, entries: [...sample.entries, sample.entries[0]] };
  for (const bad of [stale, duplicate, { version: 2, generatedAt: sample.generatedAt, entries: [] }]) {
    await run(() => Promise.resolve({ ok: true, json: () => Promise.resolve(bad) }));
    assert.ok(cards.every((card) => card.version.textContent === '版本暂不可用'));
  }
  await run(() => Promise.reject(new Error('offline')));
  assert.ok(cards.every((card) => card.version.textContent === '版本暂不可用'));
  console.log('目录版本同步、未来版本变更、缺失、过期与断网检查通过。');
})().catch((error) => { console.error(error); process.exitCode = 1; });
