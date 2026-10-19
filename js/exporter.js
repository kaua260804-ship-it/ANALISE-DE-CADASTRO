/* =====================================================
   EXPORTAÇÃO XLSX / CSV
   ===================================================== */

const Exporter = (() => {

  const EXPORT_COLUMNS = [
    { key: 'seqFml', label: 'SEQ FML' },
    { key: 'seqProd', label: 'SEQ PROD' },
    { key: 'desc', label: 'DESC' },
    { key: 'divisoes', label: 'DIVISÕES', format: (_, p) => [p.temVarejo ? 'VAREJO' : '', p.temDistribuicao ? 'DISTRIBUICAO' : ''].filter(Boolean).join(' + ') },
    { key: 'divergente', label: 'DIVERGENTE', format: v => v ? 'SIM' : 'NÃO' },
    { key: 'embalagem', label: 'EMBALAGEM' },
    { key: 'categoria', label: 'CATEGORIA' },
    { key: 'grupo', label: 'GRUPO' },
    { key: 'subgrupo', label: 'SUBGRUPO' },
    { key: 'subgrupo1', label: 'SUBGRUPO 1' },
    { key: 'subgrupo2', label: 'SUBGRUPO 2' },
    { key: 'embalagemCompra', label: 'EMBALAGEM DE COMPRA' },
    { key: 'embalagemTransferencia', label: 'EMBALAGEM DE TRANSFERÊNCIA' },
    { key: 'comprador', label: 'COMPRADOR' },
    { key: 'compradorNivel', label: 'NÍVEL MATCH' },
    { key: 'temForn', label: 'TEM FORN' },
    { key: 'temCodAcess', label: 'TEM COD ACESS' },
    { key: 'dataCad', label: 'DATA CAD' },
    { key: 'usuario', label: 'USUÁRIO' },
    { key: 'dataAlt', label: 'DATA ALT' },
    { key: 'usuarioAlt', label: 'USUÁRIO ALT' },
    { key: 'score', label: 'SCORE' },
    { key: 'status', label: 'STATUS' },
    { key: 'problemas', label: 'PROBLEMAS', format: v => (v || []).join(' | ') }
  ];

  function toRows(produtos) {
    return produtos.map(p => {
      const row = {};
      for (const col of EXPORT_COLUMNS) {
        let v = col.format ? col.format(p[col.key], p) : p[col.key];
        if (v === undefined || v === null) v = '';
        row[col.label] = v;
      }
      return row;
    });
  }

  function exportXLSX(produtos, filename, sheetName = 'Produtos') {
    if (!produtos.length) { Toast.warning('Nada para exportar'); return; }
    const rows = toRows(produtos);
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.min(40, Math.max(12, k.length + 2)) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    Toast.success(`${produtos.length} produtos exportados`);
  }

  function exportCSV(produtos, filename) {
    if (!produtos.length) { Toast.warning('Nada para exportar'); return; }
    const rows = toRows(produtos);
    const columns = EXPORT_COLUMNS.map(c => ({ key: c.label, label: c.label }));
    const csv = toCSV(rows, columns);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
    Toast.success(`${produtos.length} produtos exportados (CSV)`);
  }

  function exportInconsistencies() {
    const problemas = STATE.produtos.filter(p => p.status !== 'COMPLETO');
    if (!problemas.length) { Toast.info('Nenhuma inconsistência encontrada'); return; }

    const wb = XLSX.utils.book_new();
    const groups = {
      'Sem Fornecedor': STATE.produtos.filter(p => p.temForn !== 'Sim'),
      'Sem Comprador': STATE.produtos.filter(p => !p.comprador),
      'Sem Categoria': STATE.produtos.filter(p => !p.categoria),
      'Sem Grupo': STATE.produtos.filter(p => !p.grupo),
      'Duplicados': STATE.produtos.filter(p => p.problemas.some(x => x.includes('duplicad'))),
      'Divergentes': STATE.produtos.filter(p => p.divergente),
      'Criticos': STATE.produtos.filter(p => p.status === 'CRITICO')
    };

    let hasSheet = false;
    for (const [name, items] of Object.entries(groups)) {
      if (!items.length) continue;
      const rows = toRows(items);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      hasSheet = true;
    }

    if (!hasSheet) { Toast.info('Nenhuma inconsistência para exportar'); return; }
    XLSX.writeFile(wb, `inconsistencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Toast.success('Relatório exportado');
  }

  function init() {
    document.getElementById('exportAllBtn').addEventListener('click', () => {
      exportXLSX(STATE.filtered, `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    document.getElementById('exportSelectedBtn').addEventListener('click', () => {
      const selected = STATE.produtos.filter(p => STATE.selected.has(p._id));
      exportXLSX(selected, `produtos_selecionados_${new Date().toISOString().slice(0, 10)}.xlsx`);
    });

    document.getElementById('copySelectedBtn').addEventListener('click', async () => {
      const selected = STATE.produtos.filter(p => STATE.selected.has(p._id));
      const text = selected.map(p => p.seqProd).join('\n');
      const ok = await copyToClipboard(text);
      if (ok) Toast.success(`${selected.length} códigos copiados`);
      else Toast.danger('Falha ao copiar');
    });

    document.getElementById('analyzeSelectedBtn').addEventListener('click', () => {
      const selected = STATE.produtos.filter(p => STATE.selected.has(p._id));
      if (!selected.length) return;
      Toast.info(`Analisando ${selected.length} itens...`);
      Sidebar.navigate('auditoria');
    });

    document.getElementById('exportInconsistBtn').addEventListener('click', exportInconsistencies);
  }

  return { init, exportXLSX, exportCSV, exportInconsistencies };
})();