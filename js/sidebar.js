/* =====================================================
   NAVEGAÇÃO ENTRE SEÇÕES (SIDEBAR)
   ===================================================== */

const Sidebar = (() => {
  const items = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.section');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const mobileBtn = document.getElementById('mobileMenuBtn');

  function openMobile() { sidebar.classList.add('open'); overlay.classList.add('open'); }
  function closeMobile() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

  function navigate(section) {
    items.forEach(i => i.classList.toggle('active', i.dataset.section === section));
    sections.forEach(s => s.classList.toggle('active', s.id === `section-${section}`));

    if (section === 'graficos' && window.Charts) Charts.refreshAll();
    if (section === 'auditoria' && window.Audit) Audit.render();
    if (section === 'dashboard' && window.Dashboard) Dashboard.render();
    if (section === 'divisoes' && window.Divisoes) Divisoes.render();
  }

  function init() {
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.section);
        closeMobile();
      });
    });
    if (mobileBtn) mobileBtn.addEventListener('click', openMobile);
    if (overlay) overlay.addEventListener('click', closeMobile);
  }

  return { init, navigate };
})();
