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
