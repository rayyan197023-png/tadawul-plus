/**
 * SUPABASE SERVICE
 *
 * All Supabase operations in one place.
 * Key comes from env vars only — never hardcoded.
 *
 * ══ SECURITY REQUIREMENTS (must be done in Supabase Dashboard) ══
 * 1. Enable RLS on ALL tables: analysis_records, user_stats, global_stats
 * 2. Create policies:
 *    - analysis_records: INSERT to anon, SELECT to anon (public stats OK)
 *    - user_stats: INSERT/SELECT restricted by user_id
 *    - global_stats: INSERT/UPDATE to service_role only
 * 3. Never use service_role key in client — anon key only
 * 4. Add check constraints: sym TEXT CHECK (sym ~ '^[0-9]{4}$')
 *
 * Tables:
 * - analysis_records
 * - user_stats
 * - global_stats
 */

// ── Input sanitizer — block SQL injection and XSS
function sanitizeField(val, maxLen = 200) {
  if (val === null || val === undefined) return null;
  const str = String(val).slice(0, maxLen);
  // Block SQL injection patterns
  const _SQL_PATTERNS=['--',';','/*','*/',"'","xp_",'UNION','SELECT','DROP','INSERT','UPDATE','DELETE','ALTER'];
  if (_SQL_PATTERNS.some(function(p){return str.toUpperCase().includes(p.toUpperCase());})) {
    console.warn('[supabase] Blocked suspicious input:', str.slice(0, 20));
    return null;
  }
  return str;
}

function sanitizeRecord(rec) {
  const safe = {};
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v === 'number' && !isNaN(v)) safe[k] = v;
    else if (typeof v === 'boolean') safe[k] = v;
    else if (typeof v === 'string') {
      const s = sanitizeField(v);
      if (s !== null) safe[k] = s;
    }
    // skip objects/arrays — serialize them safely
    else if (typeof v === 'object' && v !== null) {
      try { safe[k] = JSON.stringify(v).slice(0, 1000); } catch {}
    }
  }
  return safe;
}

import config from '../../constants/config';

// ── Headers builder
function headers() {
  const key = config.supabaseKey;
  return {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

function endpoint(path) {
  return `${config.supabaseUrl}/rest/v1${path}`;
}

/**
 * Insert analysis record
 * @param {Object} record
 */
export async function insertAnalysisRecord(record) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('[Supabase] Not configured — skipping insert');
    return null;
  }
  // Sanitize string fields before sending to Supabase
  const safeRecord = {
    ...record,
    id:       sanitizeId(record.id       ?? ''),
    user_id:  sanitizeId(record.user_id  ?? ''),
    sym:      sanitizeId(record.sym      ?? ''),
    // Cap text fields to prevent oversized payloads
    analysis_text: String(record.analysis_text ?? '').slice(0, 2000),
    notes:         String(record.notes         ?? '').slice(0, 500),
  };

  const res = await fetch(endpoint('/analysis_records'), {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify(safeRecord),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed: ${text}`);
  }

  return true;
}

/**
 * Fetch analysis records
 * @param {{ limit?, userId?, sym? }} options
 * @returns {Promise<Object[]>}
 */
// Sanitize ID params: allow only alphanumeric, underscore, hyphen
function sanitizeId(val) {
  return typeof val === 'string' ? val.replace(/[^a-zA-Z0-9_-]/g, '') : '';
}

export async function fetchAnalysisRecords({ limit = 50, userId, sym } = {}) {
  if (!config.supabaseUrl || !config.supabaseKey) return [];

  const safeLimit  = Math.min(Math.max(1, parseInt(limit) || 50), 200);
  const safeUser   = sanitizeId(userId);
  const safeSym    = sanitizeId(sym);

  let url = endpoint(`/analysis_records?order=created_at.desc&limit=${safeLimit}`);
  if (safeUser) url += `&user_id=eq.${safeUser}`;
  if (safeSym)  url += `&stock_symbol=eq.${safeSym}`;

  const res = await fetch(url, {
    headers: { ...headers(), 'Prefer': 'return=representation' },
  });

  if (!res.ok) return [];
  return res.json();
}

/**
 * Update analysis record (for outcome tracking)
 * @param {string} id
 * @param {Object} updates
 */
export async function updateAnalysisRecord(id, updates) {
  if (!config.supabaseUrl || !config.supabaseKey) return null;
  const safeId = sanitizeId(id);
  if (!safeId) return null;

  const res = await fetch(endpoint(`/analysis_records?id=eq.${safeId}`), {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify(updates),
  });

  return res.ok;
}

/**
 * Fetch global stats
 */
export async function fetchGlobalStats() {
  if (!config.supabaseUrl || !config.supabaseKey) return null;

  const res = await fetch(endpoint('/global_stats?limit=1'), {
    headers: { ...headers(), 'Prefer': 'return=representation' },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data[0] ?? null;
}
