// ================================================================
// تداول+ · محرك التعلم الذاتي المتصل بـ Supabase
// lib/learningEngine.js
// ================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kdgqncnmaifrmohjoemc.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

/* ── HTTP helper ── */
const sbFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey":        SUPABASE_ANON,
      "Authorization": `Bearer ${SUPABASE_ANON}`,
      "Content-Type":  "application/json",
      "Prefer":        "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

/* ── RLS helper: set user context ── */
const withUser = (userId) => ({
  headers: { "x-user-id": userId }
});

/* ================================================================
   CRUD Operations
================================================================ */

export const db = {

  /* حفظ سجل جديد */
  async saveRecord(userId, record) {
    return sbFetch("/analysis_records", {
      method: "POST",
      body: JSON.stringify({
        id:             record.id,
        user_id:        userId,
        sym:            record.sym,
        name:           record.name,
        type:           record.type,
        type_label:     record.typeLabel,
        recommendation: record.recommendation,
        target_price:   record.targetPrice,
        current_price:  record.currentPrice,
        analysis_text:  record.analysisText,
        created_at:     record.createdAt,
        evaluate_at30:  record.evaluateAt30,
        evaluate_at90:  record.evaluateAt90,
        evaluate_at180: record.evaluateAt180,
        outcome:        record.outcome,
        error_patterns: record.errorPatterns,
        notes:          record.notes,
      }),
      ...withUser(userId),
    });
  },

  /* تحديث نتيجة التقييم */
  async updateOutcome(userId, recordId, { outcome, actualPrice, errorPatterns, daysAgo }) {
    const update = {
      outcome,
      error_patterns: errorPatterns,
    };
    if (daysAgo >= 30)  update.actual_price30  = actualPrice;
    if (daysAgo >= 90)  update.actual_price90  = actualPrice;
    if (daysAgo >= 180) update.actual_price180 = actualPrice;

    return sbFetch(`/analysis_records?id=eq.${recordId}&user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      ...withUser(userId),
    });
  },

  /* جلب جميع سجلات المستخدم */
  async getRecords(userId) {
    return sbFetch(`/analysis_records?user_id=eq.${userId}&order=created_at.desc`, {
      ...withUser(userId),
    });
  },

  /* حذف سجل */
  async deleteRecord(userId, recordId) {
    return sbFetch(`/analysis_records?id=eq.${recordId}&user_id=eq.${userId}`, {
      method: "DELETE",
      ...withUser(userId),
    });
  },

  /* جلب إحصاءات المستخدم */
  async getUserStats(userId) {
    const data = await sbFetch(`/user_stats?user_id=eq.${userId}`, {
      ...withUser(userId),
    });
    return data?.[0] || null;
  },

  /* ── للمطور فقط: إحصاءات كاملة ── */
  async getGlobalStats() {
    return sbFetch("/global_stats?id=eq.1");
  },

  /* تحديث الإحصاءات العامة (استدعاء من الـ admin panel) */
  async refreshGlobalStats() {
    return sbFetch("/rpc/refresh_global_stats", {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

/* ================================================================
   User ID Generator — معرّف فريد لكل جهاز/مستخدم
================================================================ */
export const getUserId = () => {
  const key = "tadawul_uid";
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(key, uid);
  }
  return uid;
};

/* ================================================================
   Sync Manager — يزامن بين localStorage والـ cloud
================================================================ */
export const syncManager = {

  /* رفع السجلات المحلية للـ cloud */
  async pushLocal(userId, localRecords) {
    const results = { synced: 0, failed: 0 };
    for (const record of localRecords) {
      try {
        await db.saveRecord(userId, record);
        results.synced++;
      } catch (e) {
        // قد يكون موجود مسبقاً - تجاهل
        if (!e.message.includes("duplicate")) results.failed++;
      }
    }
    return results;
  },

  /* جلب السجلات من الـ cloud وإضافة المفقودة محلياً */
  async pullCloud(userId) {
    try {
      const cloudRecords = await db.getRecords(userId);
      return cloudRecords?.map(r => ({
        id:             r.id,
        sym:            r.sym,
        name:           r.name,
        type:           r.type,
        typeLabel:      r.type_label,
        recommendation: r.recommendation,
        targetPrice:    r.target_price,
        currentPrice:   r.current_price,
        analysisText:   r.analysis_text,
        createdAt:      r.created_at,
        evaluateAt30:   r.evaluate_at30,
        evaluateAt90:   r.evaluate_at90,
        evaluateAt180:  r.evaluate_at180,
        outcome:        r.outcome,
        actualPrice30:  r.actual_price30,
        actualPrice90:  r.actual_price90,
        actualPrice180: r.actual_price180,
        errorPatterns:  r.error_patterns || [],
        improvement:    r.improvement,
        score:          r.score,
        notes:          r.notes || "",
      })) || [];
    } catch {
      return null;
    }
  },
};
