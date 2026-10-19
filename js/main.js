/* =====================================================
   ORQUESTRAÇÃO / INICIALIZAÇÃO
   -----------------------------------------------------
   DEPLOY:
   1) Commit de todos os arquivos no repositório Git
   2) Settings → Pages → branch main / pasta /root
   3) Envie o arquivo dados/BASE CADASTRO.xlsx junto
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
    errorMsg.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function hideLoadError() {
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
      showLoading('Localizando planilha em dados/...');
      const res = await FileReader.loadAuto();
      if (!res.ok) {
        // Mostra banner na tela inicial
        hideLoading();
        showLoadError(res.erro);
        footerStatus.textContent = 'Planilha não encontrada — use "Carregar arquivo"';
        Toast.danger('Não foi possível carregar a planilha automaticamente');
        // Abre a seção de upload automaticamente
        Sidebar.navigate('config');
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

  async function loadManual(file) {
    try {
      showLoading('Lendo arquivo...');
      const raw = await FileReader.readBlob(file, file.name);
      showLoading('Cruzando dados e calculando auditoria...');
      await new Promise(r => setTimeout(r, 100));
      processData(raw);
      Toast.success(`Arquivo carregado: ${file.name} (${STATE.produtos.length} produtos únicos)`);
      Sidebar.navigate('dashboard');
    } catch (err) {
      console.error(err);
      Toast.danger('Erro ao ler arquivo: ' + err.message);
    } finally {
      hideLoading();
    }
  }

  function initConfig() {
    document.getElementById('loadManualFile').addEventListener('click', () => {
      const f = document.getElementById('manualFile').files[0];
      if (!f) { Toast.warning('Selecione um arquivo primeiro'); return; }
      loadManual(f);
    });

    document.getElementById('reloadDataBtn').addEventListener('click', () => {
      loadAuto();
    });

    document.getElementById('openUploadBtn').addEventListener('click', () => {
      Sidebar.navigate('config');
    });
  }

  function initToggleFilters() {
    const btn = document.getElementById('toggleFilters');
    const panel = document.getElementById('filtersPanel');
    btn.addEventListener('click', () => {
      panel.classList.toggle('hidden');
    });
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
    initConfig();
    initToggleFilters();
    updateFooter();

    await loadAuto();
  }

  return { init, applyAllFilters, loadAuto, loadManual };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});