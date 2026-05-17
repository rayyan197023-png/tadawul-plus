'use client';
/**
 * @module features/stock/StockDetail
 * @description المكون الرئيسي لتفاصيل السهم -- يربط كل التبويبات
 *
 * ✨ نسخة جديدة:
 * - يستخدم useSahmkData hook لجلب البيانات الحية
 * - 6 تبويبات: نظرة عامة، تقني، أساسي، الملاك، محركات
 * - بيانات حية من sahmk API + Claude AI
 */
import { useState, useEffect } from 'react';
import { C, haptic } from './tabs/StockDetailShared';
import { useSahmkData, SDApiEngines } from './tabs/SDApiEnginesTab';
import { SDOverview } from './tabs/SDOverviewTab';
import { SDTechnical } from './tabs/SDTechnicalTab';
import { SDFundamental } from './tabs/SDFundamentalTab';
import { SDShareholders } from './tabs/SDShareholdersTab';
import StockHeader from './StockHeader';

/* ═══════════════════════════════════════════════════════════════
   StockDetail -- المكون الرئيسي
═══════════════════════════════════════════════════════════════ */

export default function StockDetail({ stk: baseStk, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [expanded, setExpanded] = useState(false);
  // استماع لرسالة الإغلاق من chart.html
  useEffect(() => {
    const handler = (e) => {
      if (e.data === 'closeChart') setExpanded(false);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);
  // جلب البيانات الحية من sahmk
  const { stk, loading, lastFetch, apiStatus, apiError } = useSahmkData(baseStk);

  // التبويبات
  const tabs = [
    { id: "overview",     label: "نظرة عامة", icon: "📊" },
    { id: "technical",    label: "تقني",       icon: "📈" },
    { id: "fundamental",  label: "أساسي",      icon: "💰" },
    { id: "shareholders", label: "الملاك",     icon: "👥" },
    { id: "engines",      label: "محركات",     icon: "⚡" },
  ];

  // Animations
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes skeletonShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: C.ink,
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      direction: "rtl",
      fontFamily: "Cairo, system-ui, sans-serif",
    }}>
      {/* الرأس */}
      <StockHeader stk={stk} onClose={onClose} apiStatus={apiStatus}/>

      {/* شريط حالة API */}
      {apiStatus !== "live" && (
        <div style={{
          padding: "6px 14px",
          background:
            apiStatus === "loading" ? C.electric + "10" :
            apiStatus === "delayed" ? C.amber + "10" :
            apiStatus === "error"   ? C.coral + "10" : "transparent",
          borderBottom: `1px solid ${
            apiStatus === "loading" ? C.electric + "33" :
            apiStatus === "delayed" ? C.amber + "33" :
            apiStatus === "error"   ? C.coral + "33" : C.line
          }`,
          fontSize: 10,
          color:
            apiStatus === "loading" ? C.electric :
            apiStatus === "delayed" ? C.amber :
            apiStatus === "error"   ? C.coral : C.smoke,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}>
          {apiStatus === "loading" && (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"
                style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <span>جارٍ جلب البيانات من SAHMK API...</span>
            </>
          )}
          {apiStatus === "delayed" && <span>⏱ بيانات متأخرة من sahmk</span>}
          {apiStatus === "error" && <span>⚠ خطأ في الاتصال: {apiError || "تعذّر الوصول للـ API"}</span>}
        </div>
      )}

      {/* شريط التبويبات */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "8px 10px",
        background: C.layer1,
        borderBottom: `1px solid ${C.line}`,
        overflowX: "auto",
        flexShrink: 0,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { haptic(); setActiveTab(t.id); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              background: activeTab === t.id ? C.electric + "22" : "transparent",
              border: `1px solid ${activeTab === t.id ? C.electric : "transparent"}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: activeTab === t.id ? C.electric : C.smoke,
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              whiteSpace: "nowrap",
              minHeight: 38,
            }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px",
        background: C.ink,
      }}>
        <div style={{ animation: "fadeIn 0.3s ease" }}>
                    {activeTab === "overview"     && <SDOverview     stk={stk} onExpand={() => setExpanded(true)}/>}
          {activeTab === "technical"    && <SDTechnical    stk={stk}/>}
          {activeTab === "fundamental"  && <SDFundamental  stk={stk}/>}
          {activeTab === "shareholders" && <SDShareholders stk={stk}/>}
          {activeTab === "engines"      && <SDApiEngines   stk={stk}/>}
        </div>

        {/* Footer مع آخر تحديث */}
        {lastFetch && (
          <div style={{
            marginTop: 16,
            padding: "10px",
            textAlign: "center",
            fontSize: 9,
            color: C.smoke,
            opacity: 0.6,
          }}>
            آخر تحديث: {lastFetch} • SAHMK API
          </div>
        )}
      </div>
      {/* شارت احترافي - شاشة كاملة عبر chart.html */}
      {expanded && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: C.ink,
          display: "flex",
          flexDirection: "column",
        }}>
          <iframe
            src={`/chart.html?sym=${stk?.sym}&per=1D&name=${encodeURIComponent(stk?.name || '')}`}
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              border: "none",
              background: C.ink,
            }}
            title={`شارت ${stk?.name}`}
            allow="fullscreen"
          />
        </div>
      )}
    </div>
  );
}
