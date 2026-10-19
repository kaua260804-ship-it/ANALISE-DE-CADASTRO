/* =====================================================
   LEITURA DA PLANILHA VIA SHEETJS
   Módulo renomeado para SheetLoader (evita conflito
   com o FileReader nativo do navegador).
   ===================================================== */

const SheetLoader = (() => {

  /** Tenta baixar o arquivo testando múltiplos caminhos e variações de URL */
  async function tryFetchFromPaths() {
    const erros = [];
    for (const rawPath of CONFIG.DATA_PATHS) {
      const candidatos = [rawPath];
      if (rawPath.includes(' ')) candidatos.push(rawPath.replace(/ /g, '%20'));

      for (const path of candidatos) {
        try {
          const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
          if (!res.ok) { erros.push(`${path}: HTTP ${res.status}`); continue; }
          const blob = await res.blob();
          if (!blob || blob.size === 0) { erros.push(`${path}: vazio`); continue; }
          return { blob, filename: path };
        } catch (e) {
          erros.push(`${path}: ${e.message}`);
        }
      }
    }
    return { notFound: true, erros };
  }

  function parseWorkbook(workbook) {
    const result = {};
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      result[name] = json;
    }
    return result;
  }

  function findSheet(sheets, desiredName) {
    const norm = normalizeText(desiredName);
    for (const name of Object.keys(sheets)) {
      if (normalizeText(name) === norm) return name;
    }
    for (const name of Object.keys(sheets)) {
      if (normalizeText(name).includes(norm)) return name;
    }
    return null;
  }

  function extractSheets(sheets) {
    const arvoreName = findSheet(sheets, CONFIG.SHEETS.ARVORE);
    const compradorName = findSheet(sheets, CONFIG.SHEETS.COMPRADOR);
    const dataCadName = findSheet(sheets, CONFIG.SHEETS.DATACAD);

    if (!arvoreName) throw new Error(
      `Aba "${CONFIG.SHEETS.ARVORE}" não encontrada. Abas disponíveis: ${Object.keys(sheets).join(', ')}`
    );

    return {
      arvore: sheets[arvoreName],
      comprador: compradorName ? sheets[compradorName] : [],
      dataCad: dataCadName ? sheets[dataCadName] : []
    };
  }

  function mapRow(row, canonicalKeys) {
    const mapped = {};
    const normalizedRow = {};
    for (const [k, v] of Object.entries(row)) {
      normalizedRow[normalizeText(k)] = v;
    }
    for (const canon of canonicalKeys) {
      const aliases = CONFIG.ALIASES[canon] || [normalizeText(canon)];
      let found;
      for (const alias of aliases) {
        const n = normalizeText(alias);
        if (n in normalizedRow) { found = normalizedRow[n]; break; }
      }
      mapped[canon] = found ?? '';
    }
    return mapped;
  }

  /**
   * Lê um Blob e devolve os dados já normalizados.
   * Usa o FileReader NATIVO do navegador (window.FileReader).
   */
  function readBlob(blob, filename) {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader(); // <-- explícito no escopo global
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheets = parseWorkbook(workbook);
          const extracted = extractSheets(sheets);

          const arvore = extracted.arvore.map(r => mapRow(r, CONFIG.COLUNAS_ARVORE));
          const comprador = extracted.comprador.map(r => mapRow(r, CONFIG.COLUNAS_COMPRADOR));
          const dataCad = extracted.dataCad.map(r => mapRow(r, CONFIG.COLUNAS_DATACAD));

          resolve({ arvore, comprador, dataCad, filename });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * Carrega automaticamente da pasta dados/.
   * Retorna { ok: true, data } ou { ok: false, erro: msg, erros: [...] }
   */
  async function loadAuto() {
    const found = await tryFetchFromPaths();
    if (found.notFound) {
      return {
        ok: false,
        erro: 'Planilha não encontrada em dados/. Verifique se o arquivo "BASE CADASTRO.xlsx" ' +
              'está na pasta dados/ do repositório.',
        erros: found.erros
      };
    }
    try {
      const data = await readBlob(found.blob, found.filename);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, erro: err.message, erros: [] };
    }
  }

  return { loadAuto, readBlob };
})();
