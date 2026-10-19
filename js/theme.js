/* =====================================================
   TOGGLE DE TEMA CLARO/ESCURO
   ===================================================== */

const Theme = (() => {
  const btn = document.getElementById('themeToggle');
  const icon = btn.querySelector('i');

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    try { localStorage.setItem(CONFIG.THEME_KEY, theme); } catch {}
  }

  function init() {
    let saved = 'light';
    try { saved = localStorage.getItem(CONFIG.THEME_KEY) || 'light'; } catch {}
    apply(saved);

    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      apply(current === 'dark' ? 'light' : 'dark');
    });
  }

  return { init };
})();