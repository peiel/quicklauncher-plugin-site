(() => {
  // Redirect old installation-guide bookmarks to the dedicated page.
  if (typeof window !== 'undefined' && window.location.hash === '#install') {
    window.location.replace('install.html');
    return;
  }
  const search = document.querySelector('#plugin-search');
  const cards = [...document.querySelectorAll('.plugin-card')];
  const empty = document.querySelector('#empty-state');
  const count = document.querySelector('#result-count');
  const status = document.querySelector('#search-status');
  const total = document.querySelector('#plugin-count');
  if (!search || !empty || !count || !status || !total) return;
  total.textContent = String(cards.length);
  async function refreshVersions() {
    try {
      const response = await fetch('catalog.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('目录不可用');
      const catalog = await response.json();
      const now = Date.now() / 1000;
      if (catalog.version !== 1 || !Number.isFinite(catalog.generatedAt) ||
          catalog.generatedAt < now - 48 * 3600 || catalog.generatedAt > now + 300 ||
          !Array.isArray(catalog.entries)) throw new Error('目录无效或过期');
      const versions = new Map();
      for (const entry of catalog.entries) {
        if (typeof entry.fullName !== 'string' || typeof entry.tag !== 'string' ||
            !/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(entry.tag)) throw new Error('版本无效');
        const name = entry.fullName.toLowerCase();
        if (versions.has(name)) throw new Error('目录存在重复仓库');
        versions.set(name, entry.tag);
      }
      for (const card of cards) {
        const version = card.querySelector('.version');
        if (!version) continue;
        const tag = versions.get((card.dataset.repository || '').toLowerCase());
        version.textContent = tag || '版本暂不可用';
        version.title = tag ? '来自插件目录的最新正式发布标签' : '目录中未找到此插件的版本';
      }
    } catch (_) {
      for (const card of cards) {
        const version = card.querySelector('.version');
        if (version) {
          version.textContent = '版本暂不可用';
          version.title = '版本目录暂不可用或已过期，请稍后刷新';
        }
      }
    }
  }
  void refreshVersions();
  search.addEventListener('input', () => {
    const value = search.value.trim().toLocaleLowerCase();
    let matches = 0;
    for (const card of cards) {
      const matched = !value || card.dataset.search.toLocaleLowerCase().includes(value);
      card.hidden = !matched;
      if (matched) matches += 1;
    }
    empty.hidden = matches > 0;
    count.textContent = String(matches);
    status.textContent = matches ? `找到 ${matches} 个插件` : '没有找到匹配的插件';
  });
})();
