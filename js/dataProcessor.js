/* =====================================================
   PROCESSAMENTO: CRUZAMENTOS, SCORE, AUDITORIA
   Deduplicação por SEQ PROD + separação por DIVISÃO
   ===================================================== */

const DataProcessor = (() => {

  function buildBuyerIndex(compradores) {
    const index = { nivel3: new Map(), nivel2: new Map(), nivel1: new Map() };

    for (const c of compradores) {
      const cat = normalizeText(c['CATEGORIA']);
      const grp = normalizeText(c['GRUPO']);
      const sub = normalizeText(c['SUBGRUPO']);
      const comprador = c['COMPRADOR'];
      if (!comprador) continue;

      if (cat && grp && sub) {
        const k = `${cat}|${grp}|${sub}`;
        if (!index.nivel3.has(k)) index.nivel3.set(k, []);
        index.nivel3.get(k).push(comprador);
      }
      if (cat && grp) {
        const k = `${cat}|${grp}`;
        if (!index.nivel2.has(k)) index.nivel2.set(k, []);
        index.nivel2.get(k).push(comprador);
      }
      if (cat) {
        const k = cat;
        if (!index.nivel1.has(k)) index.nivel1.set(k, []);
        index.nivel1.get(k).push(comprador);
      }
    }
    return index;
  }

  function lookupBuyer(index, produto) {
    const cat = normalizeText(produto['CATEGORIA']);
    const grp = normalizeText(produto['GRUPO']);
    const sub = normalizeText(produto['SUBGRUPO']);

    const tryGet = (map, key, nivel) => {
      if (!key || !map.has(key)) return null;
      const arr = map.get(key);
      return { comprador: arr[0], nivel, conflito: new Set(arr).size > 1 };
    };

    if (cat && grp && sub) {
      const r = tryGet(index.nivel3, `${cat}|${grp}|${sub}`, 'CATEGORIA|GRUPO|SUBGRUPO');
      if (r) return r;
    }
    if (cat && grp) {
      const r = tryGet(index.nivel2, `${cat}|${grp}`, 'CATEGORIA|GRUPO');
      if (r) return r;
    }
    if (cat) {
      const r = tryGet(index.nivel1, cat, 'CATEGORIA');
      if (r) return r;
    }
    return { comprador: '', nivel: 'NÃO ENCONTRADO', conflito: false };
  }

  function buildDataCadIndex(dataCad) {
    const map = new Map();
    for (const row of dataCad) {
      const key = String(row['SEQ PROD'] ?? '').trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }

  function normalizeYesNo(v) {
    if (v == null || v === '') return '—';
    const s = normalizeText(v);
    if (['sim', 's', '1', 'true', 'x', 'yes', 'y'].includes(s)) return 'Sim';
    if (['nao', 'não', 'n', '0', 'false', 'no'].includes(s)) return 'Não';
    return String(v);
  }

  /** Normaliza um nome de divisão para uma chave canônica (VAREJO ou DISTRIBUICAO) */
  function divisaoKey(divisao) {
    const norm = normalizeText(divisao);
    if (!norm) return null;
    if (norm.includes('varejo') || norm.startsWith('1')) return CONFIG.DIVISOES.VAREJO;
    if (norm.includes('distribui')) return CONFIG.DIVISOES.DISTRIBUICAO;
    return divisao; // valor original se não reconhecido
  }

  /** Calcula auditoria sobre a linha "principal" (a primeira variante encontrada) */
  function calcAudit(produto) {
    const indicadores = [];
    const problemas = [];

    if (produto.temForn === 'Sim') {
      indicadores.push({ label: 'Tem fornecedor', ok: true });
    } else {
      indicadores.push({ label: 'Tem fornecedor', ok: false });
      problemas.push('Sem fornecedor cadastrado');
    }

    const temDivisao = !!produto.divisao && produto.divisao !== '—';
    indicadores.push({ label: 'Tem divisão', ok: temDivisao });
    if (!temDivisao) problemas.push('Divisão não preenchida');

    const temCategoria = !!produto.categoria && produto.categoria !== '—';
    indicadores.push({ label: 'Tem categoria', ok: temCategoria });
    if (!temCategoria) problemas.push('Categoria não preenchida');

    const temGrupo = !!produto.grupo && produto.grupo !== '—';
    indicadores.push({ label: 'Tem grupo', ok: temGrupo });
    if (!temGrupo) problemas.push('Grupo não preenchido');

    const temComprador = !!produto.comprador && produto.comprador !== '—';
    indicadores.push({ label: 'Tem comprador', ok: temComprador });
    if (!temComprador) problemas.push('Comprador não encontrado');

    const temDataCad = !!produto.dataCad;
    indicadores.push({ label: 'Data de cadastro', ok: temDataCad });
    if (!temDataCad) problemas.push('Sem data de cadastro');

    const embCompraDif = !!produto.embalagemCompra && !!produto.divisao &&
      normalizeText(produto.embalagemCompra) !== normalizeText(produto.divisao);
    if (embCompraDif) problemas.push('Embalagem de compra ≠ divisão');

    const embTransfDif = !!produto.embalagemTransferencia && !!produto.divisao &&
      normalizeText(produto.embalagemTransferencia) !== normalizeText(produto.divisao);
    if (embTransfDif) problemas.push('Embalagem de transferência ≠ divisão');

    const baseChecks = [
      produto.temForn === 'Sim',
      temDivisao,
      temCategoria,
      temGrupo,
      temComprador
    ];
    let score = (baseChecks.filter(Boolean).length / baseChecks.length) * 100;
    if (embCompraDif) score -= 5;
    if (embTransfDif) score -= 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    let status;
    if (score >= CONFIG.SCORE_LIMITS.completo) status = 'COMPLETO';
    else if (score >= CONFIG.SCORE_LIMITS.incompleto) status = 'INCOMPLETO';
    else status = 'CRITICO';

    let antigoSemAlt = false;
    const dtAlt = produto.dataAlt ? parseDate(produto.dataAlt) : null;
    const dtCad = produto.dataCad ? parseDate(produto.dataCad) : null;
    const ref = dtAlt || dtCad;
    if (ref) {
      const diffDays = (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        antigoSemAlt = true;
        problemas.push('Cadastro com mais de 1 ano sem alteração');
      }
    }

    return { score, status, indicadores, problemas, antigoSemAlt };
  }

  /** Converte uma linha crua da ARVORE em objeto produto (sem cruzamentos ainda) */
  function rawToProduto(row, idx) {
    return {
      _id: String(row['SEQ PROD'] ?? '').trim() || `row_${idx}`,
      seqFml: row['SEQ FML'] ?? '',
      seqProd: String(row['SEQ PROD'] ?? '').trim(),
      desc: row['DESC'] ?? '',
      embalagem: row['EMBALAGEM'] ?? '',
      divisao: row['DIVISAO'] ?? '',
      categoria: row['CATEGORIA'] ?? '',
      grupo: row['GRUPO'] ?? '',
      subgrupo: row['SUBGRUPO'] ?? '',
      subgrupo1: row['SUBGRUPO 1'] ?? '',
      subgrupo2: row['SUBGRUPO 2'] ?? '',
      embalagemCompra: row['EMBALAGEM DE COMPRA'] ?? '',
      embalagemTransferencia: row['EMBALAGEM DE TRANSFERENCIA'] ?? '',
      // campos vindos de outros cruzamentos (preenchidos depois)
      comprador: '',
      compradorNivel: '',
      compradorConflito: false,
      temForn: '—',
      temCodAcess: '—',
      dataCad: '',
      usuario: '',
      dataAlt: '',
      usuarioAlt: ''
    };
  }

  /** Detecta se um produto (linha) tem diferenças entre Varejo e Distribuição */
  function compararDivisoes(produto) {
    const v = produto.porDivisao[CONFIG.DIVISOES.VAREJO];
    const d = produto.porDivisao[CONFIG.DIVISOES.DISTRIBUICAO];
    if (!v || !d) return { status: 'apenas_um', divergencias: [] };

    const divergencias = [];
    for (const campo of CONFIG.CAMPOS_COMPARACAO) {
      const vv = normalizeText(v[campo.key]);
      const dd = normalizeText(d[campo.key]);
      if (vv !== dd) {
        divergencias.push({
          campo: campo.key,
          label: campo.label,
          varejo: v[campo.key] || '—',
          distribuicao: d[campo.key] || '—'
        });
      }
    }
    return {
      status: divergencias.length ? 'divergente' : 'igual',
      divergencias
    };
  }

  function process({ arvore, comprador, dataCad }) {
    const buyerIndex = buildBuyerIndex(comprador);
    const dataCadIndex = buildDataCadIndex(dataCad);

    // ============= ETAPA 1: agrupar linhas por SEQ PROD =============
    // A ARVORE tem 2 linhas por produto (VAREJO + DISTRIBUIÇÃO).
    // Agrupamos para gerar UM objeto único por SEQ PROD.
    const grupos = new Map(); // seqProd -> { rows: [], desc }

    for (let i = 0; i < arvore.length; i++) {
      const row = arvore[i];
      const seqProd = String(row['SEQ PROD'] ?? '').trim();
      const key = seqProd || `row_${i}`;
      if (!grupos.has(key)) grupos.set(key, { seqProd, rows: [] });
      grupos.get(key).rows.push(row);
    }

    // ============= ETAPA 2: gerar produtos deduplicados =============
    const produtos = [];
    let idx = 0;
    for (const [key, grupo] of grupos) {
      // Escolhe a linha principal: preferir VAREJO como representativa (se existir)
      const rowsPorDivisao = {};
      for (const row of grupo.rows) {
        const dk = divisaoKey(row['DIVISAO']);
        if (dk && !rowsPorDivisao[dk]) rowsPorDivisao[dk] = row;
      }

      // Linha "principal" = VAREJO, senão primeira disponível
      const principalRow = rowsPorDivisao[CONFIG.DIVISOES.VAREJO]
        || grupo.rows[0];

      const base = rawToProduto(principalRow, idx++);
      base.seqProd = grupo.seqProd || base.seqProd;

      // Guarda as variantes por divisão (cada uma como produto "cru" para consulta)
      base.porDivisao = {};
      for (const row of grupo.rows) {
        const dk = divisaoKey(row['DIVISAO']);
        if (!dk) continue;
        if (!base.porDivisao[dk]) {
          base.porDivisao[dk] = rawToProduto(row, idx++);
          base.porDivisao[dk].seqProd = base.seqProd;
        }
      }

      // ---- Cruzamento COMPRADOR (usando a linha principal) ----
      const buyer = lookupBuyer(buyerIndex, principalRow);
      base.comprador = buyer.comprador || '';
      base.compradorNivel = buyer.nivel;
      base.compradorConflito = buyer.conflito;

      // Aplica o comprador em cada variante também
      for (const dk of Object.keys(base.porDivisao)) {
        const variante = base.porDivisao[dk];
        const bv = lookupBuyer(buyerIndex, {
          CATEGORIA: variante.categoria,
          GRUPO: variante.grupo,
          SUBGRUPO: variante.subgrupo
        });
        variante.comprador = bv.comprador || '';
        variante.compradorNivel = bv.nivel;
        variante.compradorConflito = bv.conflito;
      }

      // ---- Cruzamento DATA CADASTRO (chave = SEQ PROD) ----
      const dc = dataCadIndex.get(base.seqProd) || {};
      base.temForn = normalizeYesNo(dc['TEM FORN']);
      base.temCodAcess = normalizeYesNo(dc['TEM COD ACESS']);
      base.dataCad = dc['DATA CAD'] ?? '';
      base.usuario = dc['USUARIO'] ?? '';
      base.dataAlt = dc['DATA ALT'] ?? '';
      base.usuarioAlt = dc['USUARIO ALT'] ?? '';

      for (const dk of Object.keys(base.porDivisao)) {
        base.porDivisao[dk].temForn = base.temForn;
        base.porDivisao[dk].temCodAcess = base.temCodAcess;
        base.porDivisao[dk].dataCad = base.dataCad;
        base.porDivisao[dk].usuario = base.usuario;
        base.porDivisao[dk].dataAlt = base.dataAlt;
        base.porDivisao[dk].usuarioAlt = base.usuarioAlt;
      }

      // ---- Status por divisão (comparação) ----
      const comp = compararDivisoes(base);
      base.comparacao = comp;
      base.temVarejo = !!base.porDivisao[CONFIG.DIVISOES.VAREJO];
      base.temDistribuicao = !!base.porDivisao[CONFIG.DIVISOES.DISTRIBUICAO];
      base.divergente = comp.status === 'divergente';

      produtos.push(base);
    }

    // ============= ETAPA 3: auditoria + duplicidades =============
    const descCount = new Map();
    for (const p of produtos) {
      const k = normalizeText(p.desc);
      if (k) descCount.set(k, (descCount.get(k) || 0) + 1);
    }

    for (const p of produtos) {
      const audit = calcAudit(p);
      p.score = audit.score;
      p.status = audit.status;
      p.indicadores = audit.indicadores;
      p.problemas = [...audit.problemas];
      p.antigoSemAlt = audit.antigoSemAlt;

      const descKey = normalizeText(p.desc);
      if (descKey && descCount.get(descKey) > 1) p.problemas.push('Descrição duplicada');

      // Marca divergência entre divisões
      if (p.divergente) p.problemas.push(`Divergência entre Varejo e Distribuição (${p.comparacao.divergencias.length} campo(s))`);

      p.temProblema = p.problemas.length > 0;
    }

    return produtos;
  }

  return { process, divisaoKey };
})();