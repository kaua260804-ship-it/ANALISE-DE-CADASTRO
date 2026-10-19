/* =====================================================
   FILTROS DINÂMICOS + DEPENDÊNCIAS + DIVISÃO
   ===================================================== */

const Filters = (() => {
  const els = {
    divisaoModo: document.getElementById('filterDivisaoModo'),
    comprador: document.getElementById('filterComprador'),
    categoria: document.getElementById('filterCategoria'),
    grupo: document.getElementById('filterGrupo'),
    subgrupo: document.getElementById('filterSubgrupo'),
    embalagem: document.getElementById('filterEmbalagem'),
    status: document.getElementById('filterStatus'),
    temForn: document.getElementById('filterTemForn'),
    temCodAcess: document.getElementById('filterTemCodAcess'),
    temComprador: document.getElementById('filterTemComprador'),
    dataDe: document.getElementById('filterDataDe'),
    dataAte: document.getElementById('filterDataAte')
  };

  function fillSelect(select, values, placeholder, extra = []) {
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    for (const extraOpt of extra) {
      const opt = document.createElement('option');
      opt.value = extraOpt.value;
      opt.textContent = extraOpt.label;
      select.appendChild(opt);
    }
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

  function populate() {
    const produtos = STATE.produtos;

    const compradores = uniqueValues(produtos, 'comprador');
    fillSelect(els.comprador, compradores, 'Todos', [
      { value: '__SEM__', label: '— SEM COMPRADOR —' }
    ]);

    fillSelect(els.categoria, uniqueValues(produtos, 'categoria'), 'Todas');
    fillSelect(els.grupo, uniqueValues(produtos, 'grupo'), 'Todos');
    fillSelect(els.subgrupo, uniqueValues(produtos, 'subgrupo'), 'Todos');
    fillSelect(els.embalagem, uniqueValues(produtos, 'embalagem'), 'Todas');
  }

  function updateSubgrupo() {
    const grupo = els.grupo.value;
    const cat = els.categoria.value;
    let base = STATE.produtos;
    if (grupo) base = base.filter(p => p.grupo === grupo);
    if (cat) base = base.filter(p => p.categoria === cat);
    const subs = uniqueValues(base, 'subgrupo');
    fillSelect(els.subgrupo, subs, 'Todos');
  }

  function read() {
    return {
      divisaoModo: els.divisaoModo.value,
      comprador: els.comprador.value,
      categoria: els.categoria.value,
      grupo: els.grupo.value,
      subgrupo: els.subgrupo.value,
      embalagem: els.embalagem.value,
      status: els.status.value,
      temForn: els.temForn.value,
      temCodAcess: els.temCodAcess.value,
      temComprador: els.temComprador.value,
      dataDe: els.dataDe.value ? parseDate(els.dataDe.value) : null,
      dataAte: els.dataAte.value ? parseDate(els.dataAte.value) : null
    };
  }

  function apply(produtos) {
    const f = read();
    STATE.filters = f;

    return produtos.filter(p => {
      // ---- filtro por divisão ----
      if (f.divisaoModo === '1 - VAREJO' && !p.temVarejo) return false;
      if (f.divisaoModo === '2 - DISTRIBUICAO' && !p.temDistribuicao) return false;
      if (f.divisaoModo === '__SO_VAREJO__' && !(p.temVarejo && !p.temDistribuicao)) return false;
      if (f.divisaoModo === '__SO_DIST__' && !(p.temDistribuicao && !p.temVarejo)) return false;
      if (f.divisaoModo === '__DIVERGENTES__' && !p.divergente) return false;

      if (f.comprador === '__SEM__' && p.comprador) return false;
      if (f.comprador && f.comprador !== '__SEM__' && p.comprador !== f.comprador) return false;
      if (f.categoria && p.categoria !== f.categoria) return false;
      if (f.grupo && p.grupo !== f.grupo) return false;
      if (f.subgrupo && p.subgrupo !== f.subgrupo) return false;
      if (f.embalagem && p.embalagem !== f.embalagem) return false;
      if (f.status && p.status !== f.status) return false;
      if (f.temForn && p.temForn !== f.temForn) return false;
      if (f.temCodAcess && p.temCodAcess !== f.temCodAcess) return false;
      if (f.temComprador === 'Sim' && !p.comprador) return false;
      if (f.temComprador === 'Não' && p.comprador) return false;

      if (f.dataDe || f.dataAte) {
        const d = p.dataCad ? parseDate(p.dataCad) : null;
        if (!d) return false;
        if (f.dataDe && d < f.dataDe) return false;
        if (f.dataAte) {
          const ate = new Date(f.dataAte);
          ate.setHours(23, 59, 59, 999);
          if (d > ate) return false;
        }
      }
      return true;
    });
  }

  function renderContext() {
    const ctx = document.getElementById('filterContext');
    const comp = els.comprador.value;
    if (!comp || comp === '__SEM__') { ctx.classList.remove('show'); return; }

    const subset = STATE.produtos.filter(p => p.comprador === comp);
    const cats = [...new Set(subset.map(p => p.categoria).filter(Boolean))];
    const grps = [...new Set(subset.map(p => p.grupo).filter(Boolean))];

    if (!cats.length && !grps.length) { ctx.classList.remove('show'); return; }

    ctx.innerHTML = `<strong>${escapeHtml(comp)}</strong> atende
      ${cats.length ? cats.length + ' categoria(s)' : ''}
      ${grps.length ? ' • ' + grps.length + ' grupo(s)' : ''}`;
    ctx.classList.add('show');
  }

  function clear() {
    els.divisaoModo.value = '';
    els.comprador.value = '';
    els.categoria.value = '';
    els.grupo.value = '';
    els.subgrupo.value = '';
    els.embalagem.value = '';
    els.status.value = '';
    els.temForn.value = '';
    els.temCodAcess.value = '';
    els.temComprador.value = '';
    els.dataDe.value = '';
    els.dataAte.value = '';
    STATE.customFilter = null;
    document.getElementById('filterContext').classList.remove('show');
    if (window.App && App.applyAllFilters) App.applyAllFilters();
  }

  function resetAfterLoad() {
    populate();
    updateSubgrupo();
  }

  const triggerFilter = debounce(() => {
    if (window.App && App.applyAllFilters) App.applyAllFilters();
  }, 200);

  function init() {
    els.grupo.addEventListener('change', () => { updateSubgrupo(); triggerFilter(); });
    els.categoria.addEventListener('change', () => { updateSubgrupo(); triggerFilter(); });
    els.subgrupo.addEventListener('change', triggerFilter);
    els.divisaoModo.addEventListener('change', triggerFilter);
    els.comprador.addEventListener('change', () => { renderContext(); triggerFilter(); });
    els.embalagem.addEventListener('change', triggerFilter);
    els.status.addEventListener('change', triggerFilter);
    els.temForn.addEventListener('change', triggerFilter);
    els.temCodAcess.addEventListener('change', triggerFilter);
    els.temComprador.addEventListener('change', triggerFilter);
    els.dataDe.addEventListener('change', triggerFilter);
    els.dataAte.addEventListener('change', triggerFilter);

    document.getElementById('clearFilters').addEventListener('click', clear);
  }

  return { init, populate, apply, read, clear, resetAfterLoad, updateSubgrupo };
})();