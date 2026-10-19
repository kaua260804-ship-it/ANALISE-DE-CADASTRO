/* =====================================================
   GRÁFICOS COM CHART.JS
   ===================================================== */

const Charts = (() => {
  const CHART_COLORS = {
    success: '#16a34a',
    warning: '#ca8a04',
    danger: '#dc2626',
    primary: '#2563eb',
    palette: ['#2563eb','#16a34a','#ca8a04','#dc2626','#9333ea','#0891b2','#ea580c','#65a30d','#db2777','#475569']
  };

  function destroyChart(key) {
    if (STATE.charts[key]) { STATE.charts[key].destroy(); delete STATE.charts[key]; }
  }

  function commonOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#0f172a' }
        }
      },
      scales: {
        x: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b' },
          grid: { color: 'rgba(0,0,0,.06)' }
        },
        y: {
          ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#64748b' },
          grid: { color: 'rgba(0,0,0,.06)' }
        }
      }
    };
  }

  function buildStatusPie(canvasId) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const all = STATE.produtos;
    const counts = { COMPLETO: 0, INCOMPLETO: 0, CRITICO: 0 };
    for (const p of all) counts[p.status] = (counts[p.status] || 0) + 1;

    STATE.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completo', 'Incompleto', 'Crítico'],
        datasets: [{
          data: [counts.COMPLETO, counts.INCOMPLETO, counts.CRITICO],
          backgroundColor: [CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function buildTopBuyers(canvasId) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const counts = new Map();
    for (const p of STATE.produtos) {
      const key = p.comprador || '— SEM COMPRADOR —';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    STATE.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(x => x[0]),
        datasets: [{
          label: 'Produtos',
          data: sorted.map(x => x[1]),
          backgroundColor: CHART_COLORS.primary,
          borderRadius: 4
        }]
      },
      options: {
        ...commonOptions(),
        indexAxis: 'y',
        plugins: { legend: { display: false } }
      }
    });
  }

  function buildTopCategories(canvasId) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const counts = new Map();
    for (const p of STATE.produtos) {
      const key = p.categoria || '— SEM CATEGORIA —';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    STATE.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(x => x[0]),
        datasets: [{
          label: 'Produtos',
          data: sorted.map(x => x[1]),
          backgroundColor: CHART_COLORS.palette.slice(0, sorted.length),
          borderRadius: 4
        }]
      },
      options: { ...commonOptions(), plugins: { legend: { display: false } } }
    });
  }

  function buildMonthly(canvasId) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const now = new Date();
    const labels = [];
    const dataMap = new Map();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      labels.push(label);
      dataMap.set(key, 0);
    }

    for (const p of STATE.produtos) {
      const d = p.dataCad ? parseDate(p.dataCad) : null;
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (dataMap.has(key)) dataMap.set(key, dataMap.get(key) + 1);
    }

    STATE.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cadastros',
          data: [...dataMap.values()],
          borderColor: CHART_COLORS.primary,
          backgroundColor: 'rgba(37,99,235,.15)',
          fill: true,
          tension: .35,
          pointRadius: 4
        }]
      },
      options: commonOptions()
    });
  }

  function buildStatusByBuyer(canvasId) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const map = new Map();
    for (const p of STATE.produtos) {
      const key = p.comprador || '— SEM COMPRADOR —';
      if (!map.has(key)) map.set(key, { COMPLETO: 0, INCOMPLETO: 0, CRITICO: 0 });
      const item = map.get(key);
      item[p.status] = (item[p.status] || 0) + 1;
    }
    const top = [...map.entries()]
      .map(([k, v]) => ({ comprador: k, total: v.COMPLETO + v.INCOMPLETO + v.CRITICO, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    STATE.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top.map(t => t.comprador),
        datasets: [
          { label: 'Completo', data: top.map(t => t.COMPLETO), backgroundColor: CHART_COLORS.success },
          { label: 'Incompleto', data: top.map(t => t.INCOMPLETO), backgroundColor: CHART_COLORS.warning },
          { label: 'Crítico', data: top.map(t => t.CRITICO), backgroundColor: CHART_COLORS.danger }
        ]
      },
      options: {
        ...commonOptions(),
        scales: { x: { stacked: true, ...commonOptions().scales.x }, y: { stacked: true, ...commonOptions().scales.y } }
      }
    });
  }

  function refreshAll() {
    if (!STATE.produtos.length) return;
    buildStatusPie('chartStatus');
    buildTopBuyers('chartBuyers');
    buildTopCategories('chartCategories');
    buildMonthly('chartMonthly');
    buildStatusByBuyer('chartStatusByBuyer');
    buildFullCharts();
  }

  function buildFullCharts() {
    const container = document.getElementById('chartsFull');
    if (!container || container.dataset.built === '1') {
      // reconstrói apenas se já foi montado
      if (container && container.querySelector('canvas')) return;
    }
    container.innerHTML = `
      <div class="chart-card">
        <h3>Distribuição por Status</h3>
        <div class="chart-container"><canvas id="chartFull1"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Top 10 Compradores</h3>
        <div class="chart-container"><canvas id="chartFull2"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Top 10 Categorias</h3>
        <div class="chart-container"><canvas id="chartFull3"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>Cadastros por Mês (12m)</h3>
        <div class="chart-container"><canvas id="chartFull4"></canvas></div>
      </div>
      <div class="chart-card chart-wide">
        <h3>Status por Comprador (Top 10)</h3>
        <div class="chart-container"><canvas id="chartFull5"></canvas></div>
      </div>
    `;
    container.dataset.built = '1';
    buildStatusPie('chartFull1');
    buildTopBuyers('chartFull2');
    buildTopCategories('chartFull3');
    buildMonthly('chartFull4');
    buildStatusByBuyer('chartFull5');
  }

  return { refreshAll, buildFullCharts };
})();