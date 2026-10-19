/* =====================================================
   CONFIGURAÇÕES GLOBAIS E MAPEAMENTOS
   ===================================================== */

const CONFIG = {
  // Caminhos da planilha — tentados em ordem
  DATA_PATHS: [
    'dados/BASE CADASTRO.xlsx',
    'dados/BASE%20CADASTRO.xlsx',
    'dados/base cadastro.xlsx',
    'dados/BASE_CADASTRO.xlsx',
    'dados/base_cadastro.xlsx',
    'dados/BASE CADASTRO.xls',
    'dados/BASE%20CADASTRO.xls',
    'dados/BASE CADASTRO.csv'
  ],

  SHEETS: {
    ARVORE: 'ARVORE',
    COMPRADOR: 'COMPRADORXGRUPO',
    DATACAD: 'DATA CADASTRO'
  },

  COLUNAS_ARVORE: [
    'SEQ FML', 'SEQ PROD', 'DESC', 'EMBALAGEM', 'DIVISAO', 'CATEGORIA',
    'GRUPO', 'SUBGRUPO', 'SUBGRUPO 1', 'SUBGRUPO 2',
    'EMBALAGEM DE COMPRA', 'EMBALAGEM DE TRANSFERENCIA'
  ],

  COLUNAS_COMPRADOR: ['CATEGORIA', 'GRUPO', 'SUBGRUPO', 'SUBGRUPO 1', 'COMPRADOR'],
  COLUNAS_DATACAD: ['SEQ FAM', 'SEQ PROD', 'PROD', 'TEM FORN', 'TEM COD ACESS', 'DATA CAD', 'USUARIO', 'DATA ALT', 'USUARIO ALT'],

  SCORE_LIMITS: { completo: 90, incompleto: 50 },

  PAGE_SIZE_DEFAULT: 100,

  SEARCH_HISTORY_KEY: 'analise_cadastro_search_history',
  THEME_KEY: 'analise_cadastro_theme',

  // Divisões conhecidas (usadas para separar as variantes por produto)
  DIVISOES: {
    VAREJO: '1 - VAREJO',
    DISTRIBUICAO: '2 - DISTRIBUICAO'
  },

  // Campos comparados entre Varejo e Distribuição no comparador de divisões
  CAMPOS_COMPARACAO: [
    { key: 'categoria', label: 'Categoria' },
    { key: 'grupo', label: 'Grupo' },
    { key: 'subgrupo', label: 'Subgrupo' },
    { key: 'subgrupo1', label: 'Subgrupo 1' },
    { key: 'subgrupo2', label: 'Subgrupo 2' },
    { key: 'embalagem', label: 'Embalagem' },
    { key: 'embalagemCompra', label: 'Embalagem de Compra' },
    { key: 'embalagemTransferencia', label: 'Embalagem de Transferência' },
    { key: 'comprador', label: 'Comprador' }
  ],

  ALIASES: {
    'SEQ FML': ['seqfml', 'seq fml'],
    'SEQ PROD': ['seqprod', 'seq prod', 'codigo', 'código'],
    'DESC': ['desc', 'descricao', 'descrição', 'produto'],
    'EMBALAGEM': ['embalagem'],
    'DIVISAO': ['divisao', 'divisão'],
    'CATEGORIA': ['categoria'],
    'GRUPO': ['grupo'],
    'SUBGRUPO': ['subgrupo'],
    'SUBGRUPO 1': ['subgrupo 1', 'subgrupo1'],
    'SUBGRUPO 2': ['subgrupo 2', 'subgrupo2'],
    'EMBALAGEM DE COMPRA': ['embalagem de compra', 'embalagemcompra'],
    'EMBALAGEM DE TRANSFERENCIA': ['embalagem de transferencia', 'embalagem de transferência', 'embalagemtransferencia'],
    'TEM FORN': ['tem forn', 'temforn'],
    'TEM COD ACESS': ['tem cod acess', 'temcodacess'],
    'DATA CAD': ['data cad', 'datacad', 'data cadastro'],
    'USUARIO': ['usuario', 'usuário'],
    'DATA ALT': ['data alt', 'dataalt', 'data alteracao', 'data alteração'],
    'USUARIO ALT': ['usuario alt', 'usuarioalt'],
    'COMPRADOR': ['comprador', 'buyer']
  }
};

// Estado global
const STATE = {
  produtos: [],         // já deduplicados por SEQ PROD
  filtered: [],
  currentPage: 1,
  pageSize: CONFIG.PAGE_SIZE_DEFAULT,
  sortKey: 'seqProd',
  sortDir: 'asc',
  searchTerm: '',
  filters: {},
  customFilter: null,
  selected: new Set(),
  loading: false,
  lastUpdate: null,
  charts: {}
};