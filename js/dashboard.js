/* =====================================================
   CARDS DE RESUMO (DASHBOARD)
   ===================================================== */

const Dashboard = (() => {
  const grid = document.getElementById('cardsGrid');

  function computeStats() {
    const all = STATE.produtos;
    const total = all.length;

    let completo = 0, incompleto = 0, critico = 0;
    let semComprador = 0, semForn = 0, semCatGrupo = 0;
    let ult30 = 0, antigos = 0, divergentes = 0;

    const now = Date.now();
    const d30 = 30 * 24 * 3600 * 1000;
    const d365 = 365 * 24 * 3600 * 1000;

    for (const p of all) {
      if (p.status === 'COMPLETO') completo++;
      else if (p.status === 'INCOMPLETO') incompleto++;
      else critico++;

      if (!p.comprador) semComprador++;
      if (p.temForn !== 'Sim') semForn++;
      if (!p.categoria || !p.grupo) semCatGrupo++;
      if (p.divergente) divergentes++;

      const dCad = p.dataCad ? parseDate(p.dataCad) : null;
      if (dCad && (now - dCad.getTime()) <= d30) ult30++;
      const dAlt = p.dataAlt ? parseDate(p.dataAlt) : null;
      const ref = dAlt || dCad;
      if (ref && (now - ref.getTime()) > d365) antigos++;
    }

    const pct = (n) => total ? ((n / total) * 100).toFixed(1) + '%' : '0%';
    return {
      total, completo, incompleto, critico, divergentes,
      pctCompleto: pct(completo), pctIncompleto: pct(incompleto), pctCritico: pct(critico),
      semComprador, semForn, semCatGrupo, ult30, antigos
    };
  }

  function makeCard(label, value, sub, cls, action = '') {
    return `<div class="summary-card ${cls}" data-action="${action}">
      <div class="card-label">${label}</div>
      <div class="card-value">${value}</div>
      ${sub ? `<div class="card-sub">${sub}</div>` : ''}
    </div>`;
  }

  function render() {
    const s = computeStats();
    grid.innerHTML = [
      makeCard('Total de produtos', formatNumber(s.total), 'únicos (deduplicados)', 'info', ''),
      makeCard('Completos', formatNumber(s.completo), s.pctCompleto + ' do total', 'success', 'status:COMPLETO'),
      makeCard('Incompletos', formatNumber(s.incompleto), s.pctIncompleto + ' do total', 'warning', 'status:INCOMPLETO'),
      makeCard('Críticos', formatNumber(s.critico), s.pctCritico + ' do total', 'danger', 'status:CRITICO'),
      makeCard('Sem comprador', formatNumber(s.semComprador), '⚠ cadastro incompleto', 'danger', 'semComprador'),
      makeCard('Sem fornecedor', formatNumber(s.semForn), 'TEM FORN ≠ Sim', 'warning', 'semForn'),
      makeCard('Sem categoria/grupo', formatNumber(s.semCatGrupo), 'estrutura incompleta', 'warning', ''),
      makeCard('Divergentes Varejo × Distribuição', formatNumber(s.divergentes), 'campos diferentes', 'danger', 'divergentes'),
      makeCard('Últimos 30 dias', formatNumber(s.ult30), 'novos cadastros', 'success', ''),
      makeCard('Sem alteração > 1 ano', formatNumber(s.antigos), 'revisar cadastro', 'warning', '')
    ].join('');

    grid.querySelectorAll('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        if (!action) return;
        applyCardAction(action);
      });
    });
  }

  function applyCardAction(action) {
    Filters.clear();
    if (action.startsWith('status:')) {
      document.getElementById('filterStatus').value = action.split(':')[1];
    } else if (action === 'semComprador') {
      document.getElementById('filterTemComprador').value = 'Não';
    } else if (action === 'semForn') {
      document.getElementById('filterTemForn').value = 'Não';
    } else if (action === 'divergentes') {
      document.getElementById('filterDivisaoModo').value = '__DIVERGENTES__';
    }
    Sidebar.navigate('produtos');
    if (window.App) App.applyAllFilters();
  }

  return { init: () => {}, render, computeStats };
})();