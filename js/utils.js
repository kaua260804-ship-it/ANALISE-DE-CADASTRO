/* =====================================================
   UTILITÁRIOS GERAIS
   ===================================================== */

/** Normaliza texto para comparação: minúsculo + sem acentos */
function normalizeText(str) {
  if (str == null) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Debounce: atrasa execução até o usuário parar de digitar */
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/** Escapa HTML para evitar injeção */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formata número com separador de milhar */
function formatNumber(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('pt-BR');
}

/** Formata data para dd/mm/aaaa */
function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Formata data+hora */
function formatDateTime(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : parseDate(date);
  if (!d || isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

/** Parse de datas: dd/mm/aaaa, aaaa-mm-dd, serial Excel, Date */
function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;

  // Número serial do Excel (dias desde 30/12/1899)
  if (typeof value === 'number') {
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  // dd/mm/aaaa ou dd-mm-aaaa ou dd.mm.aaaa
  const m1 = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m1) {
    let [, dd, mm, yy] = m1;
    if (yy.length === 2) yy = '20' + yy;
    const d = new Date(Number(yy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }

  // aaaa-mm-dd
  const m2 = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (m2) {
    const d = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Gera ID único a partir do SEQ PROD (mantém zeros à esquerda como string) */
function makeId(seqProd) {
  if (seqProd == null) return '';
  return String(seqProd).trim();
}

/** Copia texto para clipboard com fallback */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); return true; }
    catch { return false; }
    finally { document.body.removeChild(ta); }
  }
}

/** Dispara download de um Blob */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Highlight de termos de busca em HTML */
function highlightTerms(text, terms) {
  if (!text) return '';
  if (!terms || !terms.length) return escapeHtml(text);
  const normalized = normalizeText(text);
  const raw = String(text);

  // Encontra posições dos matches no texto normalizado
  const ranges = [];
  for (const term of terms) {
    if (!term) continue;
    let idx = 0;
    while ((idx = normalized.indexOf(term, idx)) !== -1) {
      ranges.push([idx, idx + term.length]);
      idx += term.length;
    }
  }
  if (!ranges.length) return escapeHtml(raw);

  // Mescla ranges sobrepostos
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    } else merged.push([...r]);
  }

  // Importante: raw e normalized têm o mesmo length porque NFD quebra em caracteres
  // Então precisamos trabalhar com o raw original indexado igual ao normalized.
  // Se houver diferença de tamanho, caímos para highlight simples.
  if (raw.length !== normalized.length) {
    // fallback: substituição por regex case-insensitive
    let result = escapeHtml(raw);
    const sortedTerms = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length);
    for (const term of sortedTerms) {
      const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(re, m => `<mark class="highlight">${m}</mark>`);
    }
    return result;
  }

  let result = '';
  let cursor = 0;
  for (const [s, e] of merged) {
    result += escapeHtml(raw.slice(cursor, s));
    result += `<mark class="highlight">${escapeHtml(raw.slice(s, e))}</mark>`;
    cursor = e;
  }
  result += escapeHtml(raw.slice(cursor));
  return result;
}

/** Retorna lista de valores únicos não vazios de um array de objetos */
function uniqueValues(arr, key) {
  const set = new Set();
  for (const item of arr) {
    const v = item[key];
    if (v != null && v !== '' && v !== '—') set.add(v);
  }
  return [...set].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

/** Exporta um objeto como CSV */
function toCSV(rows, columns) {
  const sep = ';';
  const escapeCSV = (v) => {
    if (v == null) return '';
    let s = String(v);
    if (s.includes(sep) || s.includes('"') || s.includes('\n')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const header = columns.map(c => escapeCSV(c.label)).join(sep);
  const body = rows.map(r => columns.map(c => escapeCSV(r[c.key])).join(sep)).join('\n');
  return '\uFEFF' + header + '\n' + body; // BOM para Excel
}