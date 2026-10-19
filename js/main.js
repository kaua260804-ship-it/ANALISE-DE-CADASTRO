/* =====================================================
   ORQUESTRAÇÃO / INICIALIZAÇÃO
   A planilha é carregada automaticamente da pasta dados/.
   ===================================================== */

const App = (() => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  const lastUpdateEl = document.getElementById('lastUpdate');
  const footerStatus = document.getElementById('footerStatus');
  const errorBanner = document.getElementById('loadErrorBanner');
  const errorMsg = document.getElementById('loadErrorMsg');

  function showLoading(msg = 'Processando...') {
    loadingText.textContent = msg;
    loadingOverlay.classList.add('show');
  }

  function hideLoading() {
    loadingOverlay.classList.remove('show');
  }

  function showLoadError(msg) {
    if (!errorBanner) return;
    errorMsg.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function hideLoadError() {
    if (!errorBanner) return;
    errorBanner.classList.add('hidden');
  }

  function applyAllFilters() {
    let result = SearchEngine.apply(STATE.produtos, STATE.searchTerm);
    result = Filters.apply(result);
    if (STATE.customFilter) {
      result = result.filter(STATE.customFilter);
    }
    STATE.filtered = result;
    STATE.currentPage = 1;
    Table.render();
    Filters.renderContext();
  }

  function updateFooter() {
    if (!STATE.produtos.length) {
      footerStatus.textContent = 'Aguardando dados...';
      return;
    }
    footerStatus.textContent =
      `${formatNumber(STATE.produtos.length)} produtos carregados` +
      (STATE.lastUpdate ? ` | Última atualização: ${formatDateTime(STATE.lastUpdate)}` : '');
    if (STATE.lastUpdate) {
      lastUpdateEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${formatDateTime(STATE.lastUpdate)}`;
    }
  }

  function processData(raw) {
    const produtos = DataProcessor.process(raw);
    STATE.produtos = produtos;
    STATE.filtered = produtos.slice();
    STATE.selected.clear();
    STATE.customFilter = null;
    STATE.lastUpdate = new Date();

    Filters.resetAfterLoad();
    Dashboard.render();
    Charts.refreshAll();
    Audit.render();
    Divisoes.render();
    Table.render();
    updateFooter();
    hideLoadError();
  }

  async function loadAuto() {
    try {
      showLoading('Carregando planilha de dados/...');
      const res = await SheetLoader.loadAuto();

      if (!res.ok) {
        hideLoading();
        showLoadError(res.erro);
        footerStatus.textContent = 'Erro ao carregar planilha';
        Toast.danger('Não foi possível carregar a planilha');
        return;
      }

      showLoading('Cruzando dados e calculando auditoria...');
      await new Promise(r => setTimeout(r, 100));
      processData(res.data);
      Toast.success(`Planilha carregada: ${res.data.arvore.length} linhas (${STATE.produtos.length} produtos únicos)`);
    } catch (err) {
      console.error(err);
      hideLoading();
      showLoadError(err.message || 'Erro inesperado ao carregar');
      Toast.danger('Erro ao carregar planilha');
    } finally {
      hideLoading();
    }
  }

  function initToggleFilters() {
    const btn = document.getElementById('toggleFilters');
    const panel = document.getElementById('filtersPanel');
    if (btn && panel) {
      btn.addEventListener('click', () => panel.classList.toggle('hidden'));
    }
  }

  function initReload() {
    const btn = document.getElementById('reloadDataBtn');
    if (btn) btn.addEventListener('click', () => loadAuto());
  }

  async function init() {
    Theme.init();
    Sidebar.init();
    SearchEngine.init();
    Filters.init();
    Table.init();
    Drawer.init();
    Exporter.init();
    Divisoes.init();
    initToggleFilters();
    initReload();
    updateFooter();

    await loadAuto();
  }

  return { init, applyAllFilters, loadAuto };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
