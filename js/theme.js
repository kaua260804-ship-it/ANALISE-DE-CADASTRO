/* =====================================================
   TEMA — fixo em escuro (sem toggle)
   ===================================================== */

const Theme = (() => {
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function init() {
    // Tema escuro fixo
    apply('dark');
  }

  return { init };
})();
