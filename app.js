(() => {
  const search = document.querySelector('#plugin-search');
  const card = document.querySelector('#password-plugin');
  const empty = document.querySelector('#empty-state');
  const count = document.querySelector('#result-count');
  const status = document.querySelector('#search-status');
  if (!search || !card || !empty || !count || !status) return;
  search.addEventListener('input', () => {
    const value = search.value.trim().toLocaleLowerCase();
    const matches = !value || card.dataset.search.toLocaleLowerCase().includes(value);
    card.hidden = !matches;
    empty.hidden = matches;
    count.textContent = matches ? '1' : '0';
    status.textContent = matches ? '找到 1 个插件' : '没有找到匹配的插件';
  });
})();
