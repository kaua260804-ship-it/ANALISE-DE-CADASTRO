/* =====================================================
   MÓDULO DE AUDITORIA
   ===================================================== */

const Audit = (() => {
  const grid = document.getElementById('auditGrid');

  function groupProblems() {
    const all = STATE.produtos;
    const now = Date.now();
    const d2y = 2 * 365 * 24 * 3600 * 1000;

    const groups = [
      {
        key: 'semForn', cls: 'danger',
        icon: 'fa-truck-field',
        label: 'Sem fornecedor',
        filter: p => p.temForn !== 'Sim'
      },
      {
        key: 'semComprador', cls: 'danger',
        icon: 'fa-user-slash',
        label: 'Sem comprador',
        filter: p => !p.comprador
      },
      {
        key: 'semCat', cls: 'warning',
        icon: 'fa-tags',
        label: 'Sem categoria',
        filter: p => !p.categoria
      },
      {
        key: 'semGrupo', cls: 'warning',
        icon: 'fa-layer-group',
        label: 'Sem grupo',
        filter: p => !p.grupo
      },
      {
        key: 'dataAntiga', cls: 'warning',
        icon: 'fa-clock-rotate-left',
        label: 'Data de cadastro > 2 anos',
        filter: p => {
          const d = p.dataCad ? parseDate(p.dataCad) : null;
          return d && (now - d.getTime()) > d2y;
        }
      },
      {
        key: 'duplicados', cls: 'warning',
        icon: 'fa-clone',
        label: 'Registros duplicados',
        filter: p => p.problemas.some(x => x.includes('duplicad'))
      },
      {
        key: 'embDivCompra', cls: 'info',
        icon: 'fa-boxes-packing',
        label: 'Embalagem de compra ≠ divisão',
        filter: p => p.problemas.some(x => x.includes('compra ≠'))
      },
      {
        key: 'embDivTransf', cls: 'info',
        icon: 'fa-arrows-turn-to-dots',
        label: 'Embalagem de transferência ≠ divisão',
        filter: p => p.problemas.some(x => x.includes('transferência ≠'))
      }
    ];

    return groups.map(g => ({
      ...g,
      count: all.filter(g.filter).length,
      items: all.filter(g.filter)
    }));
  }

  function topBuyersQuality() {
    const map = new Map();
    for (const p of STATE.produtos) {
      const key = p.comprador || '— SEM COMPRADOR —';
      if (!map.has(key)) map.set(key, { total: 0, incompletos: 0 });
      const item = map.get(key);
      item.total++;
      if (p.status !== 'COMPLETO') item.incompletos++;
    }
    return [...map.entries()]
      .map(([comprador, v]) => ({
        comprador, ...v,
        pct: v.total ? (v.incompletos / v.total) * 100 : 0
      }))
      .filter(x => x.total >= 3)
      .sort((a, b) => b.incompletos - a.incompletos)
      .slice(0, 10);
  }

  function render() {
    const groups = groupProblems();
    const ranking = topBuyersQuality();

    grid.innerHTML = groups.map(g => `
      <div class="audit-item ${g.cls}" data-audit="${g.key}">
        <div class="audit-icon"><i class="fa-solid ${g.icon}"></i></div>
        <div class="audit-info">
          <div class="audit-count">${formatNumber(g.count)}</div>
          <div class="audit-label">${escapeHtml(g.label)}</div>
        </div>
        <i class="fa-solid fa-chevron-right text-muted"></i>
      </div>
    `).join('') + `
      <div class="chart-card" style="grid-column:1/-1">
        <h3><i class="fa-solid fa-ranking-star"></i> Top 10 compradores com mais cadastros incompletos</h3>
        <table class="data-table" style="min-width:0;font-size:.82rem">
          <thead>
            <tr>
              <th>#</th>
              <th>Comprador</th>
              <th>Total</th>
              <th>Incompletos</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.length ? ranking.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.comprador)}</td>
                <td>${formatNumber(r.total)}</td>
                <td>${formatNumber(r.incompletos)}</td>
                <td><span class="badge ${r.pct > 50 ? 'badge-danger' : 'badge-warning'}">${r.pct.toFixed(1)}%</span></td>
              </tr>
            `).join('') : '<tr><td colspan="5" class="table-empty">Sem dados suficientes</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    // Clique em cada grupo aplica o filtro correspondente
    grid.querySelectorAll('.audit-item').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.audit;
        applyAuditFilter(key);
      });
    });
  }

  function applyAuditFilter(key) {
    Filters.clear();
    const map = {
      semForn: () => { document.getElementById('filterTemForn').value = 'Não'; },
      semComprador: () => { document.getElementById('filterTemComprador').value = 'Não'; },
      semCat: () => {
        // Filtra produtos sem categoria (não há filtro dropdown para "vazio")
        // Aplicamos um filtro customizado
        STATE.customFilter = p => !p.categoria;
      },
      semGrupo: () => { STATE.customFilter = p => !p.grupo; },
      dataAntiga: () => {
        const d = new Date(); d.setFullYear(d.getFullYear() - 2);
        document.getElementById('filterDataAte').value = d.toISOString().slice(0, 10);
      },
      duplicados: () => { STATE.customFilter = p => p.problemas.some(x => x.includes('duplicad')); },
      embDivCompra: () => { STATE.customFilter = p => p.problemas.some(x => x.includes('compra ≠')); },
      embDivTransf: () => { STATE.customFilter = p => p.problemas.some(x => x.includes('transferência ≠')); }
    };
    (map[key] || (() => {}))();
    Sidebar.navigate('produtos');
    if (window.App) App.applyAllFilters();
  }

  return { render };
})();