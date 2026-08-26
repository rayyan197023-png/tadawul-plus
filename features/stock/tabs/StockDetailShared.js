'use client';
/**
 * @module features/stock/tabs/StockDetailShared
 * @description ثوابت ومكونات UI مشتركة بين جميع تبويبات StockDetail
 *
 * ✨ نسخة منظفة:
 * - تمت إزالة كل البيانات الوهمية (DEMO_STK, FINANCIALS_FULL, EARNINGS_DATA, إلخ)
 * - الخانات والمكونات تبقى كما هي في التصميم الأصلي
 * - البيانات تأتي حصرياً من sahmk API + Claude AI
 * - عند غياب البيانات تظهر "--" أو 0 أو EmptyState
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/* ================================================================
   StockDetail -- مستوى عالمي | Terminal Obsidian x Saudi Gold
================================================================ */

// ── Color tokens
const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#141d2b", layer2:"#1e2d42", layer3:"#243352",
  edge:"#2e3e60", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a", coralL:"#ff7a84",
  amber:"#fbbf24", teal:"#22d3ee",
};

const haptic = () => {};
const nowStr = () => {
  const d = new Date(), p = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/* ─────────────────────────────────────────────────────────────────
   البيانات الثابتة -- كلها فارغة حالياً
   تُملأ مستقبلاً من sahmk أو Supabase
─────────────────────────────────────────────────────────────────── */

const SHAREHOLDERS = { default: [] };
const INSIDER_TX = { default: [] };
const FINANCIALS_FULL = {
  default: {
    income:   { quarterly: [], annual: [] },
    balance:  { quarterly: [], annual: [] },
    cashflow: { quarterly: [], annual: [] },
  },
};
const EARNINGS_DATA = { default: [] };
const DIVIDENDS_DETAIL = { default: [] };
const PROS_CONS = { default: { pros: [], cons: [] } };
const DISCLOSURES = { default: [] };
const ANALYST_BANKS = { default: [] };
const PEERS = { default: [] };
const FIN_SCORES = {
  default: {
    // ✨ null لا صفر -- الصفر يعني "خطر إفلاس" في Altman و"مراقبة" في Beneish
    altmanZ: null, piotroski: null, beneish: null,
    cashScore: null, profitScore: null, growthScore: null, debtScore: null,
    overallLabel: "--", overallColor: "smoke",
  },
};
const TECH_DATA = {
  default: {
    m5:"--", m15:"--", m30:"--", h1:"--", h5:"--",
    d1:"--", w1:"--", mo1:"--",
    priceScore: 50, maBuy: 0, maSell: 0, indBuy: 0, indSell: 0,
  },
};

/* ─────────────────────────────────────────────────────────────────
   UI Primitives
─────────────────────────────────────────────────────────────────── */

const Skeleton = ({ w="100%", h=14, r=6, mb=0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r, marginBottom: mb,
    background: `linear-gradient(90deg,${C.layer3} 25%,${C.edge} 50%,${C.layer3} 75%)`,
    backgroundSize: "200% 100%",
    animation: "skeletonShimmer 1.4s ease infinite",
  }}/>
);

const SkeletonCard = ({ rows=3 }) => (
  <div style={{
    background: `linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
    borderRadius: 16, border: `1px solid ${C.line}`,
    boxShadow: `inset 0 1px 0 ${C.layer3}`,
    overflow: "hidden", marginBottom: 10,
  }}>
    <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.line}44` }}>
      <Skeleton h={13} w="50%"/>
    </div>
    <div style={{ padding: "12px 16px" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < rows-1 ? 10 : 0 }}>
          <Skeleton h={11} w="40%"/>
          <Skeleton h={11} w="25%"/>
        </div>
      ))}
    </div>
  </div>
);

const EmptyState = ({ icon="📭", title, subtitle, action, onAction }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "40px 24px", textAlign: "center",
  }}>
    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 800, color: C.mist, marginBottom: 8 }}>{title}</div>
    {subtitle && (
      <div style={{ fontSize: 12, color: C.smoke, lineHeight: 1.6, maxWidth: 260, marginBottom: action ? 20 : 0 }}>
        {subtitle}
      </div>
    )}
    {action && onAction && (
      <button onClick={onAction} style={{
        background: `${C.electric}18`, border: `1px solid ${C.electric}44`,
        borderRadius: 10, padding: "10px 20px",
        color: C.electric, fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "Cairo,sans-serif", minHeight: 44,
      }}>{action}</button>
    )}
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "32px 24px", textAlign: "center",
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 22,
      background: C.coral + "18", border: `1px solid ${C.coral}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20, marginBottom: 14,
    }}>⚠</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: C.mist, marginBottom: 6 }}>حدث خطأ</div>
    <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.6, marginBottom: onRetry ? 16 : 0 }}>
      {message || "تعذّر تحميل البيانات"}
    </div>
    {onRetry && (
      <button onClick={onRetry} style={{
        background: `${C.coral}15`, border: `1px solid ${C.coral}33`,
        borderRadius: 10, padding: "9px 20px",
        color: C.coralL, fontSize: 12, fontWeight: 700,
        cursor: "pointer", fontFamily: "Cairo,sans-serif", minHeight: 44,
      }}>إعادة المحاولة</button>
    )}
  </div>
);

const SectionCard = ({ title, children, accent, badge, infoBtn }) => (
  <div style={{
    background: `linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
    borderRadius: 16, border: `1px solid ${C.line}`,
    boxShadow: `inset 0 1px 0 ${C.layer3}`,
    overflow: "hidden", marginBottom: 10,
  }}>
    {title && (
      <div style={{
        padding: "13px 16px", borderBottom: `1px solid ${C.line}44`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {accent && <div style={{ width: 3, height: 16, background: accent, borderRadius: 2, flexShrink: 0 }}/>}
          <span style={{ fontSize: 13, fontWeight: 800, color: C.snow, letterSpacing: "-0.2px" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {badge && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: badge.color,
              background: badge.color + "18", border: `1px solid ${badge.color}33`,
              borderRadius: 20, padding: "2px 10px",
            }}>{badge.text}</span>
          )}
          {infoBtn && (
            <button onClick={infoBtn.onClick} style={{
              width: 20, height: 20, borderRadius: "50%",
              background: C.layer3, border: `1px solid ${C.line}`,
              color: C.smoke, fontSize: 11, fontWeight: 900,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, lineHeight: 1,
            }}>؟</button>
          )}
        </div>
      </div>
    )}
    {children}
  </div>
);

const Row = ({ label, value, color, sub, even, section }) => {
  if (section) return (
    <div style={{
      padding: "6px 16px 3px",
      background: C.layer3 + "88",
      borderBottom: `1px solid ${C.line}33`,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: C.electric,
        letterSpacing: "0.5px", textTransform: "uppercase",
      }}>{section}</span>
    </div>
  );
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 16px",
      background: even ? "rgba(255,255,255,.02)" : "transparent",
      borderBottom: `1px solid ${C.line}22`,
    }}>
      <div>
        <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.5 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: color || C.mist,
        fontFamily: "IBM Plex Mono,monospace",
      }}>{value}</span>
    </div>
  );
};

const Tag = ({ text, color }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, color,
    background: color + "18", border: `1px solid ${color}33`,
    borderRadius: 6, padding: "2px 10px",
  }}>{text}</span>
);

// ─── Exports ────────────────────────────────────────────────────────────
export {
  // Tokens & utilities
  C, nowStr, haptic,

  // UI primitives
  Skeleton, SkeletonCard, EmptyState, ErrorState,
  SectionCard, Row, Tag,

  // Data (empty maps - to be populated by API)
  SHAREHOLDERS, INSIDER_TX,
  FINANCIALS_FULL, EARNINGS_DATA, DIVIDENDS_DETAIL,
  PROS_CONS, DISCLOSURES,
  ANALYST_BANKS, PEERS,
  FIN_SCORES, TECH_DATA,
};
