'use client';
/**
 * Tooltip Component
 * مكوّن عالمي لعرض شروحات المصطلحات كـ Bottom Sheet
 * 
 * الاستخدام:
 * import Tooltip from '../components/Tooltip';
 * <Tooltip termKey="RSI" />
 * 
 * أو مع نص مخصص:
 * <Tooltip termKey="RSI" label="ما هو RSI؟" />
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTooltip } from '../constants/tooltipsData';

const C = {
  ink: "#06080f",
  void: "#0c1020",
  layer1: "#141d2b",
  layer2: "#1e2d42",
  layer3: "#243352",
  line: "#32426a",
  snow: "#f0f6ff",
  mist: "#c8d8f0",
  smoke: "#90a4c8",
  ash: "#5a6e94",
  gold: "#f0c050",
  electric: "#4d9fff",
  plasma: "#a78bfa",
  mint: "#1ee68a",
  coral: "#ff5f6a",
  amber: "#fbbf24",
  teal: "#22d3ee",
};

// ألوان الفئات
const CATEGORY_COLORS = {
  technical: C.electric,
  portfolio: C.gold,
  risk: C.coral,
  backtest: C.plasma,
  rebalancing: C.teal,
  fundamental: C.mint,
  market: C.amber,
};

// أسماء الفئات بالعربي
const CATEGORY_NAMES = {
  technical: 'تحليل فني',
  portfolio: 'محفظة',
  risk: 'مخاطر',
  backtest: 'Backtest',
  rebalancing: 'Rebalancing',
  fundamental: 'أساسي',
  market: 'سوق',
};

export default function Tooltip({ termKey, label, size = 'small' }) {
  const [showModal, setShowModal] = useState(false);
  const tooltip = getTooltip(termKey);
  
  // إذا المصطلح غير موجود، لا تعرض شي
  if (!tooltip) {
    console.warn('Tooltip not found for key:', termKey);
    return null;
  }
  
  const categoryColor = CATEGORY_COLORS[tooltip.category] || C.smoke;
  const categoryName = CATEGORY_NAMES[tooltip.category] || 'عام';
  
  // منع scroll عند فتح Modal
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);
  
  // حجم الأيقونة
  const iconSize = size === 'large' ? 16 : size === 'medium' ? 13 : 11;
  const buttonSize = size === 'large' ? 22 : size === 'medium' ? 18 : 16;
  
  return (
    <>
      {/* زر الـ Tooltip */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: buttonSize,
          height: buttonSize,
          borderRadius: '50%',
          background: categoryColor + '22',
          border: '1px solid ' + categoryColor + '44',
          color: categoryColor,
          fontSize: iconSize,
          fontWeight: 900,
          cursor: 'pointer',
          padding: 0,
          marginLeft: 4,
          marginRight: 4,
          fontFamily: 'Cairo,sans-serif',
          transition: 'all 0.2s',
          verticalAlign: 'middle',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = categoryColor + '44';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = categoryColor + '22';
        }}
      >
        ?
      </button>
      
      {/* إذا فيه label مخصص، اعرضه */}
      {label && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          style={{
            cursor: 'pointer',
            color: categoryColor,
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            textDecorationThickness: '1px',
            textUnderlineOffset: '3px',
            fontFamily: 'Cairo,sans-serif',
          }}
        >
          {label}
        </span>
      )}
      
            {/* Bottom Sheet Modal - يُعرض عبر Portal خارج أي Modal آخر */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,8,15,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out',
            overflow: 'hidden',
          }}
        >

                    <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg,' + C.layer1 + ',' + C.layer2 + ')',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: 500,
                            height: '90vh',
              maxHeight: '90vh',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid ' + categoryColor + '55',
              borderBottom: 'none',
              boxShadow: '0 -24px 60px rgba(0,0,0,0.6), 0 0 40px ' + categoryColor + '22',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '8px 0 4px',
                borderBottom: '1px solid ' + C.line + '33',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: C.smoke + '44',
                }}
              />
            </div>
            
            {/* Header */}
            <div
              style={{
                padding: '16px 20px 12px',
                borderBottom: '1px solid ' + C.line + '44',
                background: 'linear-gradient(135deg,' + categoryColor + '11,' + categoryColor + '04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: C.layer3,
                    border: '1px solid ' + C.line,
                    color: C.smoke,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
                
                <div style={{ flex: 1, textAlign: 'right' }}>
                  {/* Category Badge */}
                  <div
                    style={{
                      display: 'inline-block',
                      background: categoryColor + '22',
                      color: categoryColor,
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 10px',
                      borderRadius: 6,
                      marginBottom: 6,
                      border: '1px solid ' + categoryColor + '44',
                      fontFamily: 'Cairo,sans-serif',
                    }}
                  >
                    {categoryName}
                  </div>
                  
                  {/* Title */}
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: C.snow,
                      fontFamily: 'Cairo,sans-serif',
                      marginBottom: 3,
                    }}
                  >
                    {tooltip.title}
                  </div>
                  
                  {/* Subtitle */}
                  <div
                    style={{
                      fontSize: 11,
                      color: categoryColor,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {tooltip.subtitle}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div
              style={{
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                padding: '16px 20px 40px',
                flex: 1,
              }}
            >
              {/* Description */}
              <div
                style={{
                  fontSize: 14,
                  color: C.mist,
                  lineHeight: 1.7,
                  fontFamily: 'Cairo,sans-serif',
                  marginBottom: 20,
                  textAlign: 'right',
                }}
              >
                {tooltip.description}
              </div>
              
              {/* Details Section */}
              {tooltip.details && tooltip.details.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: categoryColor,
                      marginBottom: 10,
                      textAlign: 'right',
                      fontFamily: 'Cairo,sans-serif',
                      letterSpacing: '0.5px',
                    }}
                  >
                    📊 التفاصيل
                  </div>
                  
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {tooltip.details.map((detail, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: C.layer3,
                          borderRadius: 10,
                          border: '1px solid ' + C.line + '44',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: C.mist,
                            fontFamily: 'Cairo,sans-serif',
                            textAlign: 'left',
                            flex: 1,
                          }}
                        >
                          {detail.value}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: categoryColor,
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            background: categoryColor + '15',
                            padding: '3px 10px',
                            borderRadius: 6,
                            border: '1px solid ' + categoryColor + '33',
                          }}
                        >
                          {detail.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Example Section */}
              {tooltip.example && (
                <div
                  style={{
                    background: 'linear-gradient(135deg,' + categoryColor + '15,' + categoryColor + '05)',
                    border: '1px solid ' + categoryColor + '33',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: categoryColor,
                        fontFamily: 'Cairo,sans-serif',
                      }}
                    >
                      مثال
                    </div>
                    <span style={{ fontSize: 14 }}>💡</span>
                  </div>
                  
                  <div
                    style={{
                      fontSize: 12,
                      color: C.mist,
                      lineHeight: 1.7,
                      fontFamily: 'Cairo,sans-serif',
                      textAlign: 'right',
                    }}
                  >
                    {tooltip.example}
                  </div>
                </div>
              )}
              
              {/* Footer Note */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px',
                  background: C.void + 'aa',
                  borderRadius: 10,
                  border: '1px dashed ' + C.line,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: C.ash,
                    fontFamily: 'Cairo,sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  📚 شرح للأغراض التعليمية فقط
                  <br />
                  ليس توصية استثمارية
                </div>
              </div>
            </div>
          </div>
          
                   {/* Animations */}
          <style>{`
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`}</style>
        </div>,
        document.body
      )}
    </>
  );
}
