/* =====================================================
   TABELA: RENDERIZAÇÃO, PAGINAÇÃO, ORDENAÇÃO, SELEÇÃO
   ===================================================== */

const Table = (() => {
  const tbody = document.getElementById('tableBody');
  const pagination = document.getElementById('pagination');
  const tableInfo = document.getElementById('tableInfo');
  const resultsCounter = document.getElementById('resultsCounter');
  const filteredTotalEl = document.getElementById('filteredTotal');
  const selectPageCb = document.getElementById('selectPageCheckbox');

  function sortData(data) {
    const key = STATE.sortKey;
    const dir = STATE.sortDir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      let va = a[key], vb = b[key];
      const na = Number(va), nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
        return (na - nb) * dir;
      }
      if (key === 'dataCad') {
        const da = parseDate(va), db = parseDate(vb);
        if (da && db) return (da - db) * dir;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR') * dir;
    });
  }

  function statusBadge(status) {
    const map = {
      COMPLETO: 'badge-success',
      INCOMPLETO: 'badge-warning',
      CRITICO: 'badge-danger'
    };
    const label = { COMPLETO: '🟢 COMPLETO', INCOMPLETO: '🟡 INCOMPLETO', CRITICO: '🔴 CRÍTICO' };
    return `<span class="badge ${map[status] || 'badge-neutral'}">${label[status] || status}</span>`;
  }

  function highlight(text) {
    const tokens = SearchEngine.tokenize(STATE.searchTerm);
    return highlightTerms(text, tokens);
  }

  /** Renderiza as tags de divisão (V / D / divergente) */
  function renderDivisaoTags(p) {
    const tags = [];
    if (p.temVarejo) tags.push('<span class="badge badge-info" title="Varejo">V</span>');
    if (p.temDistribuicao) tags.push('<span class="badge badge-warning" title="Distribuição">D</span>');
    if (p.divergente) tags.push('<span class="badge badge-danger" title="Divergente entre divisões">≠</span>');
    return tags.join(' ');
  }

  function renderRow(p) {
    const selected = STATE.selected.has(p._id);
    const rowClass = selected ? 'selected' : '';
    const warnIcon = p.temProblema
      ? `<i class="fa-solid fa-triangle-exclamation row-warn" title="Produto com problemas"></i>`
      : '';
    const problemasText = p.problemas.length
      ? p.problemas.map(x => '• ' + x).join('\n')
      : 'Sem problemas';

    return `
      <tr class="${rowClass}" data-id="${escapeHtml(p._id)}">
        <td class="col-check" data-label="">
          <input type="checkbox" class="row-check" ${selected ? 'checked' : ''} data-id="${escapeHtml(p._id)}">
        </td>
        <td class="col-fixed-1" data-label="SEQ PROD">${highlight(String(p.seqProd || '—'))}</td>
        <td class="col-fixed-2" data-label="DESC"><span class="cell-truncate" title="${escapeHtml(p.desc)}">${highlight(p.desc || '—')}</span></td>
        <td data-label="DIVISÃO">${renderDivisaoTags(p)}</td>
        <td data-label="EMBALAGEM">${highlight(p.embalagem || '—')}</td>
        <td data-label="CATEGORIA">${highlight(p.categoria || '—')}</td>
        <td data-label="GRUPO">${highlight(p.grupo || '—')}</td>
        <td data-label="SUBGRUPO">${highlight(p.subgrupo || '—')}</td>
        <td data-label="SUBGRUPO 1">${highlight(p.subgrupo1 || '—')}</td>
        <td data-label="SUBGRUPO 2">${highlight(p.subgrupo2 || '—')}</td>
        <td data-label="COMPRADOR">
          ${highlight(p.comprador || '—')}
          ${p.compradorConflito ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--warning)" title="Múltiplos compradores"></i>' : ''}
        </td>
        <td data-label="DATA CAD">${formatDate(p.dataCad)}</td>
        <td data-label="USUÁRIO">${escapeHtml(p.usuario || '—')}</td>
        <td data-label="TEM FORN">${p.temForn === 'Sim' ? '✅' : '❌'} ${p.temForn || '—'}</td>
        <td data-label="CÓD ACESS">${p.temCodAcess === 'Sim' ? '✅' : '❌'} ${p.temCodAcess || '—'}</td>
        <td data-label="STATUS">${statusBadge(p.status)}</td>
        <td data-label="PROBLEMAS">
          <span class="problems-cell" data-problems="${escapeHtml(problemasText)}">${warnIcon} ${p.problemas.length}</span>
        </td>
        <td class="col-actions" data-label="">
          <button class="btn-icon view-details" data-id="${escapeHtml(p._id)}" title="Ver detalhes">
            <i class="fa-solid fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }

  function renderPagination(total, page, pages) {
    if (pages <= 1) { pagination.innerHTML = ''; return; }
    const buttons = [];
    const add = (label, p, active = false, disabled = false) => {
      buttons.push(`<button data-page="${p}" class="${active ? 'active' : ''}" ${disabled ? 'disabled' : ''}>${label}</button>`);
    };

    add('<i class="fa-solid fa-angle-left"></i>', page - 1, false, page === 1);

    const range = [];
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(pages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i++) range.push(i);

    if (start > 1) { add('1', 1); if (start > 2) buttons.push('<span style="padding:0 6px">…</span>'); }
    for (const r of range) add(r, r, r === page);
    if (end < pages) { if (end < pages - 1) buttons.push('<span style="padding:0 6px">…</span>'); add(pages, pages); }

    add('<i class="fa-solid fa-angle-right"></i>', page + 1, false, page === pages);

    pagination.innerHTML = buttons.join('');
    pagination.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.dataset.page);
        if (p >= 1 && p <= pages) { STATE.currentPage = p; render(); }
      });
    });
  }

  function render() {
    const filtered = STATE.filtered;
    const total = filtered.length;
    const pageSize = STATE.pageSize;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (STATE.currentPage > pages) STATE.currentPage = pages;

    const sorted = sortData(filtered);
    const start = (STATE.currentPage - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    if (!total) {
      tbody.innerHTML = `<tr><td colspan="18" class="table-empty">
        <i class="fa-regular fa-face-frown" style="font-size:2rem;display:block;margin-bottom:10px"></i>
        Nenhum produto encontrado com os filtros atuais.
      </td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(renderRow).join('');
    }

    resultsCounter.textContent = `${formatNumber(total)} de ${formatNumber(STATE.produtos.length)} produtos`;
    tableInfo.textContent = `Página ${STATE.currentPage} de ${pages}`;
    filteredTotalEl.textContent = formatNumber(total);

    renderPagination(total, STATE.currentPage, pages);
    bindRowEvents();
    updateBulkBar();
  }

  function bindRowEvents() {
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('input, button')) return;
        const id = tr.dataset.id;
        const p = STATE.produtos.find(x => x._id === id);
        if (p) Drawer.open(p);
      });
    });

    tbody.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = cb.dataset.id;
        if (cb.checked) STATE.selected.add(id);
        else STATE.selected.delete(id);
        cb.closest('tr').classList.toggle('selected', cb.checked);
        updateBulkBar();
      });
    });

    tbody.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const p = STATE.produtos.find(x => x._id === id);
        if (p) Drawer.open(p);
      });
    });
  }

  function updateBulkBar() {
    const count = STATE.selected.size;
    document.getElementById('selectionCount').textContent = `${formatNumber(count)} selecionado${count === 1 ? '' : 's'}`;
    const disabled = count === 0;
    ['exportSelectedBtn', 'copySelectedBtn', 'analyzeSelectedBtn', 'clearSelection'].forEach(id => {
      document.getElementById(id).disabled = disabled;
    });
  }

  function initSort() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (STATE.sortKey === key) {
          STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          STATE.sortKey = key;
          STATE.sortDir = 'asc';
        }
        document.querySelectorAll('th[data-sort]').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(STATE.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        render();
      });
    });
  }

  function initPageCheckbox() {
    selectPageCb.addEventListener('change', () => {
      const sorted = sortData(STATE.filtered);
      const start = (STATE.currentPage - 1) * STATE.pageSize;
      const pageItems = sorted.slice(start, start + STATE.pageSize);
      pageItems.forEach(p => {
        if (selectPageCb.checked) STATE.selected.add(p._id);
        else STATE.selected.delete(p._id);
      });
      render();
    });
  }

  function init() {
    initSort();
    initPageCheckbox();

    document.getElementById('pageSize').addEventListener('change', (e) => {
      STATE.pageSize = Number(e.target.value);
      STATE.currentPage = 1;
      render();
    });

    document.getElementById('selectAllFiltered').addEventListener('click', () => {
      STATE.filtered.forEach(p => STATE.selected.add(p._id));
      Toast.success(`${formatNumber(STATE.filtered.length)} itens selecionados`);
      render();
    });

    document.getElementById('clearSelection').addEventListener('click', () => {
      STATE.selected.clear();
      render();
    });
  }

  return { init, render, updateBulkBar, statusBadge };
})();