/* =====================================================
   SISTEMA DE NOTIFICAÇÕES (TOASTS)
   ===================================================== */

const Toast = (() => {
  const container = document.getElementById('toastContainer');

  const ICONS = {
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    danger: 'fa-circle-xmark',
    info: 'fa-circle-info'
  };

  function show(message, type = 'info', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${ICONS[type] || ICONS.info}"></i>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  return {
    success: (m, d) => show(m, 'success', d),
    warning: (m, d) => show(m, 'warning', d),
    danger: (m, d) => show(m, 'danger', d),
    info: (m, d) => show(m, 'info', d)
  };
})();