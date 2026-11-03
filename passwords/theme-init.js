// Применяем тему до отрисовки, чтобы не было «вспышки» светлой темы.
(function () {
  try {
    var t = localStorage.getItem('pm-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
