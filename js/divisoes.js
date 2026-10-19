/* =====================================================
   COMPARADOR DE DIVISÕES
   Mostra diferenças entre VAREJO e DISTRIBUIÇÃO por produto
   ===================================================== */

const Divisoes = (() => {
  const summaryEl = document.getElementById('divisoesSummary');
  const bodyEl = document.getElementById('divisoesBody');
  const infoEl = document.getElementById('divisoesInfo');
  const filtroEl = document.getElementById('divisoesFiltro');
  const exportBtn = document.getElementById('exportDivergencesBtn');

  function computeStats() {
    const total = STATE.produtos.length;
    const comVarejo = STATE.produtos.filter(p => p.temVarejo).length;
    const comDist = STATE.produtos.filter(p => p.temDistribuicao).length;
    const soVarejo = STATE.produtos.filter(p => p.temVarejo && !p.temDistribuicao).length;
    const soDist = STATE.produtos.filter(p => p.temDistribuicao && !p.temVarejo).length;
    const divergentes = STATE.produtos.filter(p => p.divergente).length;
    return { total, comVarejo, comDist, soVarejo, soDist, divergentes };
  }

  function renderSummary() {
    const s = computeStats();
    summaryEl.innerHTML = `
      <div class="summary-card info">
        <div class="card-label">Total de produtos únicos</div>
        <div class="card-value">${formatNumber(s.total)}</div>
        <div class="card-sub">deduplicados por SEQ PROD</div>
      </div>
      <div class="summary-card success">
        <div class="card-label">Em Varejo</div>
        <div class="card-value">${formatNumber(s.comVarejo)}</div>
        <div class="card-sub">existem na divisão 1</div>
      </div>
      <div class="summary-card warning">
        <div class="card-label">Em Distribuição</div>
        <div class="card-value">${formatNumber(s.comDist)}</div>
        <div class="card-sub">existem na divisão 2</div>
      </div>
      <div class="summary-card danger">
        <div class="card-label">Divergentes</div>
        <div class="card-value">${formatNumber(s.divergentes)}</div>
        <div class="card-sub">dados diferentes entre divisões</div>
      </div>
      <div class="summary-card info">
        <div class="card-label">Só em Varejo</div>
        <div class="card-value">${formatNumber(s.soVarejo)}</div>
        <div class="card-sub">não cadastrado na distribuição</div>
      </div>
      <div class="summary-card info">
        <div class="card-label">Só em Distribuição</div>
        <div class="card-value">${formatNumber(s.soDist)}</div>
        <div class="card-sub">não cadastrado no varejo</div>
      </div>
    `;

    // Clique nos cards filtra a tabela principal
    summaryEl.querySelectorAll('.summary-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        const modo = ['', '1 - VAREJO', '2 - DISTRIBUICAO', '__DIVERGENTES__', '__SO_VAREJO__', '__SO_DIST__'][i];
        if (!modo) return;
        document.getElementById('filterDivisaoModo').value = modo;
        Sidebar.navigate('produtos');
        if (window.App) App.applyAllFilters();
      });
    });
  }

  function renderTable() {
    const filtro = filtroEl.value;
    let itens = STATE.produtos.slice();
    if (filtro === 'divergentes') itens = itens.filter(p => p.divergente);
    else if (filtro === 'so_varejo') itens = itens.filter(p => p.temVarejo && !p.temDistribuicao);
    else if (filtro === 'so_dist') itens = itens.filter(p => p.temDistribuicao && !p.temVarejo);

    infoEl.textContent = `${formatNumber(itens.length)} produto(s)`;

    if (!itens.length) {
      bodyEl.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhum produto encontrado</td></tr>`;
      return;
    }

    // Limita a 200 linhas para performance (o restante fica no export)
    const MAX_RENDER = 200;
    const shown = itens.slice(0, MAX_RENDER);

    const rows = [];
    for (const p of shown) {
      const v = p.porDivisao[CONFIG.DIVISOES.VAREJO];
      const d = p.porDivisao[CONFIG.DIVISOES.DISTRIBUICAO];

      // Linha de cabeçalho do produto
      const headerRow = `
        <tr style="background: var(--bg-muted); font-weight: 600;">
          <td>${escapeHtml(p.seqProd || '—')}</td>
          <td colspan="5">${escapeHtml(p.desc || '—')}</td>
        </tr>
      `;
      rows.push(headerRow);

      if (!v && !d) continue;

      if (v && d) {
        // Comparar campo por campo
        for (const campo of CONFIG.CAMPOS_COMPARACAO) {
          const vv = v[campo.key] || '—';
          const dd = d[campo.key] || '—';
          const igual = normalizeText(vv) === normalizeText(dd);
          const statusBadge = igual
            ? `<span class="badge badge-success">✓ Igual</span>`
            : `<span class="badge badge-danger">≠ Diferente</span>`;
          rows.push(`
            <tr>
              <td></td>
              <td></td>
              <td><strong>${escapeHtml(campo.label)}</strong></td>
              <td>${escapeHtml(vv)}</td>
              <td>${escapeHtml(dd)}</td>
              <td>${statusBadge}</td>
            </tr>
          `);
        }
      } else if (v && !d) {
        rows.push(`
          <tr>
            <td></td><td></td>
            <td><em>Todos os campos</em></td>
            <td>${escapeHtml(v.categoria || '—')} / ${escapeHtml(v.grupo || '—')}</td>
            <td class="text-muted">— não cadastrado —</td>
            <td><span class="badge badge-warning">Só Varejo</span></td>
          </tr>
        `);
      } else if (d && !v) {
        rows.push(`
          <tr>
            <td></td><td></td>
            <td><em>Todos os campos</em></td>
            <td class="text-muted">— não cadastrado —</td>
            <td>${escapeHtml(d.categoria || '—')} / ${escapeHtml(d.grupo || '—')}</td>
            <td><span class="badge badge-warning">Só Distribuição</span></td>
          </tr>
        `);
      }
    }

    if (itens.length > MAX_RENDER) {
      rows.push(`<tr><td colspan="6" class="table-empty">
        Mostrando ${MAX_RENDER} de ${formatNumber(itens.length)} produtos. Use "Exportar divergências" para a lista completa.
      </td></tr>`);
    }

    bodyEl.innerHTML = rows.join('');
  }

  function exportDivergences() {
    const divergentes = STATE.produtos.filter(p => p.divergente);
    if (!divergentes.length) { Toast.info('Nenhuma divergência encontrada'); return; }

    const linhas = [];
    for (const p of divergentes) {
      const v = p.porDivisao[CONFIG.DIVISOES.VAREJO] || {};
      const d = p.porDivisao[CONFIG.DIVISOES.DISTRIBUICAO] || {};
      for (const campo of CONFIG.CAMPOS_COMPARACAO) {
        const vv = v[campo.key] || '';
        const dd = d[campo.key] || '';
        if (normalizeText(vv) !== normalizeText(dd)) {
          linhas.push({
            'SEQ PROD': p.seqProd,
            'DESC': p.desc,
            'CAMPO': campo.label,
            'VAREJO': vv,
            'DISTRIBUICAO': dd
          });
        }
      }
    }

    if (!linhas.length) { Toast.info('Nenhuma divergência para exportar'); return; }

    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Divergencias');
    XLSX.writeFile(wb, `divergencias_divisoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Toast.success(`${linhas.length} divergências exportadas`);
  }

  function render() {
    if (!STATE.produtos.length) {
      summaryEl.innerHTML = '';
      bodyEl.innerHTML = `<tr><td colspan="6" class="table-empty">Aguardando dados...</td></tr>`;
      return;
    }
    renderSummary();
    renderTable();
  }

  function init() {
    if (filtroEl) filtroEl.addEventListener('change', renderTable);
    if (exportBtn) exportBtn.addEventListener('click', exportDivergences);
  }

  return { init, render };
})();