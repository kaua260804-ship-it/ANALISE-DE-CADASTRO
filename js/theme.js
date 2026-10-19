/* =====================================================
   TEMA — fixo em escuro (sem toggle)
   ===================================================== */

const Theme = (() => {

  function init() {
    // Aplica o tema escuro fixo no <html>
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  return { init };
})();
