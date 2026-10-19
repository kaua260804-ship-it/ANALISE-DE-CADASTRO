/* =====================================================
   BUSCA INTELIGENTE COM AUTOCOMPLETE + HISTÓRICO
   ===================================================== */

const SearchEngine = (() => {
  const input = document.getElementById('globalSearch');
  const wrapper = document.getElementById('searchWrapper');
  const autocomplete = document.getElementById('autocomplete');
  const clearBtn = document.getElementById('clearSearch');

  const HISTORY_KEY = CONFIG.SEARCH_HISTORY_KEY;
  let autocompleteItems = [];
  let activeIndex = -1;

  // Colunas indexáveis para autocomplete
  const AC_COLUMNS = [
    { key: 'seqProd', label: 'SEQ PROD' },
    { key: 'desc', label: 'DESC' },
    { key: 'embalagem', label: 'EMBALAGEM' },
    { key: 'divisao', label: 'DIVISÃO' },
    { key: 'categoria', label: 'CATEGORIA' },
    { key: 'grupo', label: 'GRUPO' },
    { key: 'subgrupo', label: 'SUBGRUPO' },
    { key: 'subgrupo1', label: 'SUBGRUPO 1' },
    { key: 'subgrupo2', label: 'SUBGRUPO 2' },
    { key: 'comprador', label: 'COMPRADOR' }
  ];

  /** Retorna histórico do localStorage */
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }

  /** Salva termo no histórico (máx 10) */
  function pushHistory(term) {
    if (!term || term.length < 2) return;
    const hist = getHistory().filter(t => t !== term);
    hist.unshift(term);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 10))); }
    catch {}
  }

  /** Retorna tokens normalizados do termo */
  function tokenize(term) {
    return normalizeText(term).split(/\s+/).filter(Boolean);
  }

  /**
   * Verifica se um produto "match" em todos os tokens (AND).
   * Retorna true/false.
   */
  function matchProduct(produto, tokens) {
    if (!tokens.length) return true;
    // Concatena todos os campos pesquisáveis
    const haystack = normalizeText([
      produto.seqProd, produto.desc, produto.embalagem, produto.divisao,
      produto.categoria, produto.grupo, produto.subgrupo, produto.subgrupo1,
      produto.subgrupo2, produto.comprador
    ].join(' '));
    return tokens.every(t => haystack.includes(t));
  }

  /** Aplica busca sobre o array de produtos */
  function apply(produtos, term) {
    const tokens = tokenize(term);
    if (!tokens.length) return produtos.slice();
    return produtos.filter(p => matchProduct(p, tokens));
  }

  /** Gera sugestões de autocomplete */
  function generateSuggestions(term) {
    const t = normalizeText(term);
    if (t.length < 2) return [];
    const seen = new Set();
    const suggestions = [];

    for (const col of AC_COLUMNS) {
      for (const p of STATE.produtos) {
        const val = p[col.key];
        if (!val) continue;
        const normVal = normalizeText(val);
        if (!normVal.includes(t)) continue;
        const key = `${col.key}:${normVal}`;
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push({ type: col.label, value: String(val), key: col.key });
        if (suggestions.length >= 10) return suggestions;
      }
    }
    return suggestions;
  }

  /** Renderiza dropdown */
  function renderSuggestions(term) {
    const suggestions = term.length >= 2
      ? generateSuggestions(term)
      : getHistory().map(h => ({ type: 'histórico', value: h, key: null }));

    if (!suggestions.length) {
      autocomplete.classList.remove('show');
      autocompleteItems = [];
      return;
    }

    autocomplete.innerHTML = suggestions.map((s, i) => `
      <div class="autocomplete-item ${i === activeIndex ? 'active' : ''}" data-index="${i}" data-value="${escapeHtml(s.value)}">
        <span class="ac-type">${escapeHtml(s.type)}</span>
        <span>${escapeHtml(s.value)}</span>
      </div>
    `).join('');
    autocomplete.classList.add('show');
    autocompleteItems = suggestions;

    autocomplete.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pickSuggestion(el.dataset.value);
      });
    });
  }

  function pickSuggestion(value) {
    input.value = value;
    wrapper.classList.add('has-text');
    autocomplete.classList.remove('show');
    submit(value);
  }

  /** Executa a busca */
  function submit(term) {
    STATE.searchTerm = term || '';
    pushHistory(term);
    if (window.App && App.applyAllFilters) App.applyAllFilters();
  }

  function clear() {
    input.value = '';
    wrapper.classList.remove('has-text');
    autocomplete.classList.remove('show');
    STATE.searchTerm = '';
    if (window.App && App.applyAllFilters) App.applyAllFilters();
  }

  function init() {
    const debouncedSuggest = debounce((val) => {
      activeIndex = -1;
      renderSuggestions(val);
    }, 150);

    const debouncedSubmit = debounce((val) => {
      submit(val);
    }, 350);

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      wrapper.classList.toggle('has-text', val.length > 0);
      debouncedSuggest(val);
      debouncedSubmit(val);
    });

    input.addEventListener('focus', () => {
      if (input.value.length < 2 && getHistory().length) renderSuggestions('');
    });

    input.addEventListener('blur', () => {
      // delay para permitir clique
      setTimeout(() => autocomplete.classList.remove('show'), 200);
    });

    input.addEventListener('keydown', (e) => {
      if (!autocomplete.classList.contains('show')) {
        if (e.key === 'Enter') submit(input.value);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, autocompleteItems.length - 1);
        renderSuggestions(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, -1);
        renderSuggestions(input.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && autocompleteItems[activeIndex]) {
          pickSuggestion(autocompleteItems[activeIndex].value);
        } else {
          autocomplete.classList.remove('show');
          submit(input.value);
        }
      } else if (e.key === 'Escape') {
        autocomplete.classList.remove('show');
      }
    });

    clearBtn.addEventListener('click', clear);
  }

  return { init, apply, tokenize, matchProduct, submit, clear };
})();