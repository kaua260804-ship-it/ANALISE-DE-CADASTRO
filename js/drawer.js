/* =====================================================
   PAINEL LATERAL DE DETALHES
   ===================================================== */

const Drawer = (() => {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  const title = document.getElementById('drawerTitle');
  const subtitle = document.getElementById('drawerSubtitle');
  const body = document.getElementById('drawerBody');
  const closeBtn = document.getElementById('closeDrawer');

  function close() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  }

  function rowHtml(k, v) {
    return `<div class="drawer-row"><span class="key">${escapeHtml(k)}</span><span class="val">${escapeHtml(v || '—')}</span></div>`;
  }

  /** Renderiza bloco da variante (por divisão) */
  function renderVariante(label, pv, color) {
    if (!pv) {
      return `<div class="drawer-section">
        <h4 style="color:${color}">${label}</h4>
        <p class="text-muted" style="font-size:.85rem">— não cadastrado nesta divisão —</p>
      </div>`;
    }
    return `<div class="drawer-section">
      <h4 style="color:${color}">${label}</h4>
      ${rowHtml('Categoria', pv.categoria)}
      ${rowHtml('Grupo', pv.grupo)}
      ${rowHtml('Subgrupo', pv.subgrupo)}
      ${rowHtml('Subgrupo 1', pv.subgrupo1)}
      ${rowHtml('Subgrupo 2', pv.subgrupo2)}
      ${rowHtml('Embalagem', pv.embalagem)}
      ${rowHtml('Embalagem de Compra', pv.embalagemCompra)}
      ${rowHtml('Embalagem de Transferência', pv.embalagemTransferencia)}
      ${rowHtml('Comprador', pv.comprador)}
      ${rowHtml('Nível match', pv.compradorNivel)}
    </div>`;
  }

  function open(produto) {
    title.textContent = `SEQ PROD ${produto.seqProd || '—'}`;
    subtitle.textContent = produto.desc || '—';

    const v = produto.porDivisao[CONFIG.DIVISOES.VAREJO];
    const d = produto.porDivisao[CONFIG.DIVISOES.DISTRIBUICAO];

    const indicadoresHtml = produto.indicadores.map(i =>
      `<li class="${i.ok ? 'ok' : 'fail'}">
        <i class="fa-solid ${i.ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        ${escapeHtml(i.label)}
      </li>`
    ).join('');

    const problemasHtml = produto.problemas.length
      ? `<ul class="audit-list">${produto.problemas.map(p => `
          <li class="fail"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(p)}</li>
        `).join('')}</ul>`
      : `<p class="text-muted"><i class="fa-solid fa-circle-check" style="color:var(--success)"></i> Nenhum problema detectado</p>`;

    // Divergências entre divisões
    let divergenciasHtml = '';
    if (produto.comparacao && produto.comparacao.status === 'divergente') {
      divergenciasHtml = `<div class="drawer-section">
        <h4 style="color:var(--danger)">⚠ Divergências entre Divisões</h4>
        <table style="width:100%;font-size:.8rem;border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left;padding:4px;border-bottom:1px solid var(--border)">Campo</th>
            <th style="text-align:left;padding:4px;border-bottom:1px solid var(--border)">Varejo</th>
            <th style="text-align:left;padding:4px;border-bottom:1px solid var(--border)">Distribuição</th>
          </tr></thead>
          <tbody>
          ${produto.comparacao.divergencias.map(dv => `
            <tr>
              <td style="padding:4px;border-bottom:1px solid var(--border)">${escapeHtml(dv.label)}</td>
              <td style="padding:4px;border-bottom:1px solid var(--border);color:var(--primary)">${escapeHtml(dv.varejo)}</td>
              <td style="padding:4px;border-bottom:1px solid var(--border);color:var(--warning)">${escapeHtml(dv.distribuicao)}</td>
            </tr>
          `).join('')}
          </tbody>
        </table>
      </div>`;
    }

    body.innerHTML = `
      <div class="drawer-section">
        <h4>Dados Gerais</h4>
        ${rowHtml('SEQ FML', produto.seqFml)}
        ${rowHtml('SEQ PROD', produto.seqProd)}
        ${rowHtml('DESC', produto.desc)}
        ${rowHtml('Divisões presentes', [produto.temVarejo ? 'Varejo' : '', produto.temDistribuicao ? 'Distribuição' : ''].filter(Boolean).join(' + ') || '—')}
      </div>

      ${renderVariante('🛒 Varejo (1)', v, 'var(--primary)')}
      ${renderVariante('🚚 Distribuição (2)', d, 'var(--warning)')}

      ${divergenciasHtml}

      <div class="drawer-section">
        <h4>Data Cadastro</h4>
        ${rowHtml('DATA CAD', formatDate(produto.dataCad))}
        ${rowHtml('Usuário', produto.usuario)}
        ${rowHtml('DATA ALT', formatDate(produto.dataAlt))}
        ${rowHtml('Usuário Alt', produto.usuarioAlt)}
        ${rowHtml('Tem Fornecedor', produto.temForn)}
        ${rowHtml('Tem Cód. Acesso', produto.temCodAcess)}
      </div>

      <div class="drawer-section">
        <h4>Auditoria (${produto.score}% — ${produto.status})</h4>
        <ul class="audit-list">${indicadoresHtml}</ul>
      </div>

      <div class="drawer-section">
        <h4>Problemas</h4>
        ${problemasHtml}
      </div>

      <div class="drawer-section">
        <h4>Ações</h4>
        <button class="btn btn-primary btn-sm" id="copySeqBtn"><i class="fa-regular fa-copy"></i> Copiar SEQ PROD</button>
        <button class="btn btn-secondary btn-sm" id="openComparacaoBtn"><i class="fa-solid fa-code-compare"></i> Ver na aba Comparar Divisões</button>
      </div>
    `;

    document.getElementById('copySeqBtn').addEventListener('click', async () => {
      const ok = await copyToClipboard(produto.seqProd);
      if (ok) Toast.success('SEQ PROD copiado');
      else Toast.danger('Falha ao copiar');
    });

    document.getElementById('openComparacaoBtn').addEventListener('click', () => {
      close();
      Sidebar.navigate('divisoes');
    });

    drawer.classList.add('open');
    overlay.classList.add('open');
  }

  function init() {
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) close();
    });
  }

  return { init, open, close };
})();