/**
 * STOCK DATA MODEL — Unified Contract
 *
 * This is the single source of truth for what a Stock object looks like.
 * Every component, store, engine, and service MUST use this shape.
 * Never define stock fields inline in a component.
 */

/**
 * @typedef {Object} Stock
 * @property {string}      sym         - Symbol (e.g. "2222")
 * @property {string}      name        - Arabic name
 * @property {string}      nameEn      - English name
 * @property {string}      sec         - Sector (Arabic short)
 * @property {string}      sectorId    - Sector ID for filtering
 * @property {number}      p           - Current price
 * @property {number}      ch          - Change amount
 * @property {number}      pct         - Change percent
 * @property {number}      v           - Today's volume
 * @property {number}      avgV        - Average daily volume
 * @property {number}      hi          - Today's high
 * @property {number}      lo          - Today's low
 * @property {number}      w52h        - 52-week high
 * @property {number}      w52l        - 52-week low
 * @property {number|null} target      - Analyst price target
 * @property {number|null} eps         - EPS (TTM)
 * @property {number|null} pe          - P/E ratio
 * @property {number|null} pb          - P/B ratio
 * @property {number|null} divY        - Dividend yield %
 * @property {number|null} roe         - Return on equity %
 * @property {number|null} mktCap      - Market cap (billions SAR)
 * @property {number|null} debt        - Debt/equity ratio
 * @property {number|null} revGrw      - Revenue growth %
 * @property {number|null} epsGrw      - EPS growth %
 * @property {number|null} freeCashFlow- FCF per share
 * @property {number|null} beta        - Beta vs TASI
 * @property {number|null} oilCorr     - Correlation to oil price
 * @property {number}      rating      - Internal rating score (0-100)
 * @property {string|null} desc        - Arabic description
 * @property {string|null} earnDate    - Next earnings date
 */

/**
 * Create a normalized stock object.
 * Ensures all fields exist with proper defaults.
 * Use when receiving data from API to normalize it.
 *
 * @param {Object} raw - Raw data from any source
 * @returns {Stock}
 */
export function createStock(raw) {
  return {
    sym:          raw.sym          ?? '',
    name:         raw.name         ?? '',
    nameEn:       raw.nameEn       ?? raw.name ?? '',
    sec:          raw.sec          ?? '',
    sectorId:     raw.sectorId     ?? normalizeSectorId(raw.sec ?? ''),
    o:            raw.o            ?? raw.open  ?? null,     // today's open price
    prev:         raw.prev         ?? (raw.p && raw.ch ? +(raw.p - raw.ch).toFixed(2) : null), // prev close
    p:            raw.p            ?? raw.price ?? 0,
    ch:           raw.ch           ?? raw.change ?? 0,
    pct:          raw.pct          ?? raw.changePct ?? 0,
    v:            raw.v            ?? raw.vol ?? 0,
    avgV:         raw.avgV         ?? raw.avgVol ?? 0,
    hi:           raw.hi           ?? raw.high ?? raw.p ?? 0,
    lo:           raw.lo           ?? raw.low  ?? raw.p ?? 0,
    w52h:         raw.w52h         ?? raw.hi52 ?? null,
    w52l:         raw.w52l         ?? raw.lo52 ?? null,
    target:       raw.target       ?? null,
    eps:          raw.eps          ?? null,
    pe:           raw.pe           ?? null,
    pb:           raw.pb           ?? null,
    divY:         raw.divY         ?? raw.div ?? null,
    roe:          raw.roe          ?? null,
    mktCap:       raw.mktCap       ?? null,
    debt:         raw.debt         ?? raw.debt_eq ?? null,
    revGrw:       raw.revGrw       ?? null,
    epsGrw:       raw.epsGrw       ?? null,
    freeCashFlow: raw.freeCashFlow ?? raw.fcf ?? null,
    net_margin:   raw.net_margin   ?? null,  // net profit margin % (from API)
    beta:         raw.beta         ?? null,
    oilCorr:      raw.oilCorr      ?? null,
    rating:       raw.rating       ?? 0,
    desc:         raw.desc         ?? null,
    earnDate:     raw.earnDate     ?? raw.earn ?? null,
    // Quarterly EPS (optional)
    eps_q1:       raw.eps_q1       ?? null,
    eps_q2:       raw.eps_q2       ?? null,
    eps_q3:       raw.eps_q3       ?? null,
    eps_q4:       raw.eps_q4       ?? null,
  };
}

/**
 * Normalize sector string to a consistent ID
 */
function normalizeSectorId(sec) {
  const map = {
    'بنوك': 'banks', 'بنك': 'banks',
    'طاقة': 'energy',
    'بترو': 'petro', 'بتروكيم': 'petro', 'البتروكيماويات': 'petro',
    'تقنية': 'tech', 'اتصالات': 'telecom',
    'غذاء': 'food',
    'تعدين': 'mining',
    'تأمين': 'insurance',
    'عقارات': 'realestate',
    'بناء': 'construction',
    'صناعة': 'industrial',
    'تجزئة': 'retail',
  };
  for (const [key, val] of Object.entries(map)) {
    if (sec.includes(key)) return val;
  }
  return 'other';
}

/**
 * @typedef {Object} OHLCBar
 * @property {string} d    - Date string (YYYY-MM-DD)
 * @property {number} o    - Open
 * @property {number} hi   - High
 * @property {number} lo   - Low
 * @property {number} c    - Close
 * @property {number} vol  - Volume
 */

/**
 * @typedef {Object} MarketIndex
 * @property {string} id    - Index ID
 * @property {string} name  - Arabic name
 * @property {number} value - Current value
 * @property {number} pct   - Change percent
 * @property {number} ch    - Change amount
 */

/**
 * @typedef {Object} Sector
 * @property {string} id    - Sector ID
 * @property {string} name  - Arabic name
 * @property {number} pct   - Change percent
 * @property {number} w     - Weight in index
 */
