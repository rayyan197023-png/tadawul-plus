'use client';
import React from 'react';
import Tooltip from '../Tooltip';
import { ArcRing, StoryChart, C, getKsaMarket } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';
import { calcSmartStopLoss, calcSmartTakeProfit } from '../../engines/positionEngine';
import { shareStockCard } from '../../utils/shareStockCard';

export default function StockCard({
  stk, bars, health, isRealData, idx,
  selected, isFlashing, globalRank,
  allData, discovered,
  onCardClick, onFullAnalysis, haptic
}) {
              const up=stk.ch>=0;
              const priceColor=up?C.mint:C.coral;
              const globalRankSafe = globalRank || 1;

const rankUp=stk.ch>0;
const isBuy=health.score>=65;     // كان 75 - معايرة علمية
              const isDanger=health.score<45;   // يبقى - دفاعي
              const isRare=health.score>=75;    // كان 85 - فرصة استثنائية

              // ✨ موحَّد على مستوى البطاقة كلها: يُستخدم لتلوين كل قسم يتأثر بـ RSI
              const cardOverbought = ((health.extras && health.extras.rsiV) || 50) >= 75;

return(
  <div key={stk.sym}
    id={"stock-" + stk.sym}
    data-stock-card
    className="card-enter"
    style={{animationDelay:`${idx*.07}s`}}
    onClick={function(){ onCardClick(stk.sym, isRare); }}

                >
                  {/* ─ البطاقة الرئيسية ─ */}
                  <div
                    className={isFlashing?"flash":isBuy&&!selected?"buy-glow":isDanger&&!selected?"danger-pulse":""}
                    style={{
                    background:"linear-gradient(135deg,#0f1628 0%,#131a2e 100%)",
                    borderRadius:18,
                    border:"1px solid " + (selected ? health.sigC+"66" : health.sigC+"22"),
                    overflow:"hidden",
                    boxShadow: isFlashing
                      ? "0 0 0 3px " + health.sigC + "55, 0 16px 48px rgba(0,0,0,.6)"
                      : selected
                      ? "0 16px 48px rgba(0,0,0,.6), 0 0 0 1px " + health.sigC + "44, inset 0 1px 0 " + health.sigC + "20"
                      : "0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 " + C.layer3,
                    transition:"all .3s cubic-bezier(.4,0,.2,1)",
                    cursor:"pointer",
                    position:"relative",
                  }}>

                    {/* ── badge الترتيب -- سياق المقارنة ── */}
                    <div style={{
                      position:"absolute",top:10,left:10,zIndex:5,

                      display:"flex",alignItems:"center",gap:3,
                      background:"rgba(0,0,0,.45)",borderRadius:7,
                      padding:"2px 7px",backdropFilter:"blur(4px)",
                      animation:"rankUp .4s ease both",
                    }}>
                      <span style={{fontSize:9,fontWeight:900,color:C.mist}}>#{globalRank}</span>
                      <span style={{fontSize:9,color:rankUp?C.mint:C.coral,fontWeight:700}}>
                        {rankUp?"↑":"↓"}
                      </span>
                    </div>
                    {/* شريط اللون العلوي -- معايرة علمية: 65/55/45 */}
                    <div style={{
                      height:3,
                      background:health.score>=65
                        ? `linear-gradient(90deg,${C.mint}00,${C.mint},${C.mint}00)`
                        : health.score>=55
                        ? `linear-gradient(90deg,${C.amber}00,${C.amber},${C.amber}00)`
                        : health.score>=45
                        ? `linear-gradient(90deg,${C.teal}00,${C.teal},${C.teal}00)`
                        : `linear-gradient(90deg,${C.coral}00,${C.coral},${C.coral}00)`,
                      opacity:.8,
                    }}/>

                    {/* جسم البطاقة */}
                    <div style={{padding:"14px 16px 10px",position:"relative"}}>
                      {/* خلفية ملونة خافتة حسب الإشارة */}
                      <div style={{
                        position:"absolute",top:0,right:0,width:"50%",height:"100%",
                        background:`linear-gradient(270deg, ${health.sigC}0c 0%, transparent 100%)`,
                        pointerEvents:"none",
                      }}/>

                      <div style={{display:"flex",alignItems:"center",gap:12,position:"relative"}}>

                        {/* يمين -- اسم السهم + رقمه + قطاعه + سعره + نسبته */}
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,maxWidth:"45%"}}>
                          <div className="glow-white" style={{fontSize:16,fontWeight:900,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{stk.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 7px",borderRadius:5}}>{stk.sym}</span>
                            <span style={{fontSize:9,color:C.smoke}}>{stk.sec}</span>
                          </div>
                          <div className="num-lg glow-white" style={{fontSize:18,fontWeight:900,color:C.snow,letterSpacing:"-0.5px",lineHeight:1,direction:"ltr"}}>{stk.p.toFixed(2)}</div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:3,background:priceColor+"20",border:"1px solid "+priceColor+"44",borderRadius:7,padding:"2px 8px",direction:"ltr"}}>
                            <span style={{fontSize:10,fontWeight:800,color:priceColor}}>{up?"+":""}{stk.ch.toFixed(2)}%</span>
                          </div>
                        </div>

                        {/* وسط -- الإشارة + المقارنة + القائد */}
                        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:4,background:health.sigC+"22",border:"1px solid "+health.sigC+"55",borderRadius:8,padding:"3px 10px",boxShadow:"0 2px 8px "+health.sigC+"22"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:health.sigC,boxShadow:"0 0 6px "+health.sigC}}/>
                            <span style={{fontSize:10,fontWeight:800,color:health.sigC}}>{health.sig}</span>
                          </div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"2px 8px"}}>
                            {globalRank !== 1 && globalRank > 3 && (
                              <span style={{fontSize:8,color:C.smoke}}>أعلى من</span>
                            )}
                            <span style={{fontSize:9,fontWeight:800,color:globalRank<=3?C.gold:globalRank<=5?C.mint:C.mist}}>{
                              globalRank === 1 ? "الأول" :
                              globalRank <= 3 ? "أعلى " + Math.min(99, Math.round(((allData&&allData.length?allData.length:1)-globalRank)/(allData&&allData.length?allData.length:1)*100)) + "%" :

                              Math.min(99, Math.round(((allData&&allData.length?allData.length:1)-globalRank)/(allData&&allData.length?allData.length:1)*100)) + "%"
                            }</span>
                            <span style={{fontSize:8,color:C.smoke}}>من السوق</span>
                            {globalRank<=3&&<span style={{fontSize:9}}>🔥</span>}
                          </div>

                          {(function(){
                            var layers=health.layers||{};
// ✨ الأوزان الفعلية من المحرّك التكيّفي -- كانت ثابتة ولا تطابق الحقيقة
var _W = health.weights || {L9:.20,L1:.20,L5:.20,L4:.15,L8:.15,L7:.06,L6:.04};
var items=[{name:"السيولة",val:layers.L9||0,w:(_W.L9||0)*100,icon:"💧"},{name:"الاحتمالية",val:layers.L7||0,w:(_W.L7||0)*100,icon:"🧮"},{name:"الرادار",val:layers.L8||0,w:(_W.L8||0)*100,icon:"🎯"},{name:"الهيكل",val:layers.L1||0,w:(_W.L1||0)*100,icon:"🏗"},{name:"كيلي",val:layers.L6||0,w:(_W.L6||0)*100,icon:"📐"},{name:"المؤشرات",val:layers.L5||0,w:(_W.L5||0)*100,icon:"🔗"}];
                            var top=items.slice().sort(function(a,b){return(b.val*b.w)-(a.val*a.w);})[0];
                            var isPos=top.val>=60;
                            return(<div style={{display:"inline-flex",alignItems:"center",gap:4,background:isPos?health.sigC+"14":"rgba(90,106,138,.12)",border:"1px solid "+(isPos?health.sigC+"30":"rgba(90,106,138,.25)"),borderRadius:7,padding:"3px 8px"}}>
                              <span style={{fontSize:9}}>{top.icon}</span>
                              <span style={{fontSize:8,color:isPos?health.sigC:C.smoke,fontWeight:700}}>{top.name}</span>
                              <span style={{fontSize:8,fontWeight:900,color:isPos?health.sigC:C.smoke,background:"rgba(255,255,255,.08)",borderRadius:4,padding:"0 4px"}}>{top.val}</span>
                            </div>);
                          })()}
                        </div>

                        {/* يسار -- الدائرة */}
                        <div style={{position:"relative",flexShrink:0}}>
                          <ArcRing val={health.score} size={56} stroke={4} color={health.sigC} bg={C.ash}>
                            <div style={{textAlign:"center"}}>
                              <div className="num-lg glow-white" style={{fontSize:11,fontWeight:900,color:health.sigC,lineHeight:1}}>{health.score}</div>
                              <div style={{fontSize:7,fontWeight:700,color:health.sigC,marginTop:1}}>{scoreWord(health.score)}</div>
                            </div>
                          </ArcRing>
                          {(function(){
                            // 🎯 معايرة علمية: العتبة 65 بدلاً من 75
                            var size=56,stroke=4,r=(size-stroke*2)/2,thresholdAngle=(65/100)*360-90,rad=thresholdAngle*Math.PI/180,cx=size/2,cy=size/2;
                            var x1=cx+(r-6)*Math.cos(rad),y1=cy+(r-6)*Math.sin(rad),x2=cx+(r+2)*Math.cos(rad),y2=cy+(r+2)*Math.sin(rad);
                            return(<svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={size} height={size}>
                              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth={2} strokeLinecap="round" style={{filter:"drop-shadow(0 0 3px "+C.gold+")"}}/>
                              <text x={cx+r*Math.cos(rad)*1.18} y={cy+r*Math.sin(rad)*1.18} textAnchor="middle" dominantBaseline="middle" fill={C.gold} fontSize={5} fontWeight="700">65</text>
                            </svg>);
                          })()}
                                                  
                        </div>

                      </div>
                                            {/* ══ جملة "لماذا الآن" -- محسّنة ══ */}
                      {(function(){
                        var vr     = (health.extras && health.extras.vr) || 1;
                        var volPct = Math.round(Math.abs(vr - 1) * 100);
                        var L9     = (health.layers && health.layers.L9) || 50;
                        var L1     = (health.layers && health.layers.L1) || 50;
                        var L7     = (health.layers && health.layers.L7) || 50;
                        var ch     = stk.ch;

                        var why, icon, urgency, whyColor;

                                                // 🔧 إصلاح: توافق "لماذا الآن" مع التصنيف الإجمالي
                        var isStrong = health.score >= 60;  // سهم قوي
                        var isWeak = health.score < 45;     // سهم ضعيف
                        
                        if(vr >= 1.4 && ch > 0 && !isWeak){
                          why      = "الحجم أعلى من المعدل بـ " + volPct + "% -- دخول مؤسسي اليوم";
                          icon     = "🏦"; urgency = "عاجل"; whyColor = C.mint;
                        } else if(vr >= 1.4 && ch > 0 && isWeak){
                          // 🆕 حجم عالٍ على سهم ضعيف = شراء مضاربي
                          why      = "حجم عالٍ بـ " + volPct + "% -- لكن السهم ضعيف هيكلياً (احذر)";
                          icon     = "⚠";  urgency = "حذر"; whyColor = C.amber;
                        } else if(vr >= 1.4 && ch < 0 && isWeak){
                          // ─── سهم ضعيف + حجم بيع = خروج مؤسسي حقيقي ───
                          why      = "حجم بيع مرتفع بـ " + volPct + "% -- خروج مؤسسي محتمل";
                          icon     = "⚠";  urgency = "تحذير"; whyColor = C.coral;
                        } else if(vr >= 1.4 && ch < 0 && isStrong){
                          // ─── سهم قوي + حجم عالٍ + ch سلبي = تصحيح صحي ───
                          // عادةً: profit-taking أو تصحيح اعتيادي في bull
                          var cmfPos = (health.extras && health.extras.cmf > 0.05);
                          if(cmfPos){
                            why    = "حجم عالٍ مع تصحيح -- جني أرباح طبيعي";
                            icon   = "💧"; urgency = "صحي"; whyColor = C.amber;
                          } else {
                            why    = "حجم بيع عالٍ بـ " + volPct + "% -- راقب الإغلاق";
                            icon   = "👁";  urgency = "راقب"; whyColor = C.amber;
                          }

                        } else if(vr >= 1.4 && ch < 0){
                          // ─── الحالة العامة (سهم متوسط) ───
                          why      = "حجم بيع مرتفع بـ " + volPct + "% -- خروج مؤسسي محتمل";
                          icon     = "⚠";  urgency = "تحذير"; whyColor = C.coral;
                        } else if(L1 >= 80 && !isWeak){
                          why      = "هيكل الحركة يُشبه نمط الاختراق الحقيقي";
                          icon     = "📐"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(L9 >= 75 && ch > 0 && !isWeak){
                          why      = "المال الذكي يتراكم -- سيولة مؤسسية إيجابية";
                          icon     = "💧"; urgency = "إيجابي"; whyColor = C.mint;
                        } else if(L9 >= 75 && ch < 0 && isStrong){
                          why      = "سيولة قوية رغم الهبوط -- قد يكون تجميعاً خفياً";
                          icon     = "🔍"; urgency = "راقب"; whyColor = C.amber;
                        } else if(L9 >= 75 && ch < 0 && isWeak){
                          // 🆕 سيولة عالية + هبوط + سهم ضعيف = تصريف
                          why      = "سيولة عالية مع هبوط -- قد يكون تصريفاً مؤسسياً";
                          icon     = "🔻"; urgency = "تحذير"; whyColor = C.coral;
                        } else if(L7 >= 75 && !isWeak){
                          why      = "الاحتمالية الرياضية تدعم استمرار الاتجاه";
                          icon     = "🧮"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(isWeak){
                          // 🆕 رسالة افتراضية للأسهم الضعيفة
                          if(ch < -1) {
                            why      = "ضغط بيعي مستمر -- تجنّب الدخول الآن";
                            icon     = "🔻"; urgency = "تحذير"; whyColor = C.coral;
                          } else {
                            why      = "السهم في مرحلة ضعف -- لا توجد فرصة دخول";
                            icon     = "🛑"; urgency = "تجنّب"; whyColor = C.coral;
                          }
                        } else if(vr < 0.7){
                          why      = "حجم خفيف -- لا توجد حركة مؤسسية اليوم";
                          icon     = "😴"; urgency = "هادئ"; whyColor = C.smoke;
                        } else if(ch > 0.5){
                          why      = "حركة إيجابية -- الحجم مناسب للارتفاع";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        } else {
                          why      = "تراجع طبيعي -- لا ضغط بيعي استثنائي";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        }

                                             return(
                          <>
                          {/* 🆕 تحذير ذروة الشراء (RSI > 75) */}
                          {(health.extras && health.extras.rsiV >= 75) && (
                            <div style={{
                              marginTop:8,
                              background:"rgba(245,158,11,.1)",
                              border:"1px solid rgba(245,158,11,.3)",
                              borderRadius:10,
                              padding:"6px 12px",
                              display:"flex",alignItems:"center",gap:8,
                            }}>
                              <span style={{fontSize:14}}>⚠</span>
                              <div style={{flex:1}}>
                                <div style={{fontSize:9.5,color:C.amber,fontWeight:800}}>
                                  RSI في ذروة الشراء ({Math.round(health.extras.rsiV)})
                                </div>
                                <div style={{fontSize:8.5,color:C.mist,marginTop:1}}>
                                  السهم مرتفع نسبياً - احتمال تصحيح قريب
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div style={{
                            marginTop:8,
                            background: whyColor + "0d",
                            border:"1px solid " + whyColor + "28",
                            borderRadius:10,
                            overflow:"hidden",
                          }}>
                            {/* شريط العنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",gap:6,
                              padding:"4px 10px",
                              background: whyColor + "15",
                              borderBottom:"1px solid " + whyColor + "20",
                            }}>
                              <span style={{fontSize:10}}>{icon}</span>
                              <span style={{
                                fontSize:8,fontWeight:800,
                                color:whyColor,letterSpacing:".3px",
                              }}>لماذا الآن</span>
                              <div style={{
                                marginRight:"auto",
                                background:whyColor+"22",
                                border:"1px solid " + whyColor + "44",
                                borderRadius:4,padding:"1px 6px",
                              }}>
                                <span style={{fontSize:7,fontWeight:800,color:whyColor}}>{urgency}</span>
                              </div>
                            </div>
                            {/* النص */}
                            <div style={{padding:"6px 10px"}}>
                              <span style={{
                                fontSize:9,color:C.mist,
                                lineHeight:1.55,fontWeight:500,
                              }}>{why}</span>
                            </div>                                                   </div>
                          </>
                        );
                      })()}

                      {/* خط القصة -- سعر + حجم + إشارة + زر الكاميرا */}
                      <div style={{marginTop:10,opacity:1,display:"flex",alignItems:"center",gap:8}}>
                        {/* زرّ الكاميرا -- يسار الرسم البياني */}
                        <button
                          onClick={function(e){
                            e.stopPropagation();
                            haptic.tap();
                            shareStockCard(allData.find(function(d){ return d && d.stk && d.stk.sym === stk.sym; }), stk.sym, stk.name, stk.p.toFixed(2), stk.ch.toFixed(2));
                          }}
                          style={{
                            width:36,height:36,
                            borderRadius:10,
                            background:"linear-gradient(135deg," + C.electric + "22," + C.electric + "11)",
                            border:"1px solid " + C.electric + "44",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",
                            boxShadow:"0 2px 8px " + C.electric + "22",
                            flexShrink:0,
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="7" width="18" height="13" rx="2" stroke={C.electric} strokeWidth="2"/>
                            <path d="M8 7L9.5 5h5L16 7" stroke={C.electric} strokeWidth="2" strokeLinejoin="round"/>
                            <circle cx="12" cy="13" r="3.5" stroke={C.electric} strokeWidth="2"/>
                          </svg>
                        </button>
                        
                        {/* الرسم البياني */}
                        <div style={{flex:1,minWidth:0,position:"relative"}}>
                          <StoryChart bars={bars} color={priceColor} score={health.score} h={52}/>
                          {/* علامة مصدر البيانات */}
                          <div style={{
                            position:"absolute",top:2,left:2,
                            display:"flex",alignItems:"center",gap:3,
                            background: isRealData ? "rgba(16,201,126,.15)" : "rgba(245,158,11,.15)",
                            border:"1px solid " + (isRealData ? "rgba(16,201,126,.3)" : "rgba(245,158,11,.3)"),
                            borderRadius:5,padding:"1px 5px",
                          }}>
                            <div style={{
                              width:5,height:5,borderRadius:"50%",
                              background:isRealData?C.mint:C.amber,
                            }}/>
                            <span style={{
                              fontSize:7,fontWeight:700,
                              color:isRealData?C.mint:C.amber,
                            }}>
                              {isRealData ? "حقيقي" : "تجريبي"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ══ بطاقة القرار الثنائية -- Kahneman ══
                          System 1: رسالة عاطفية فورية
                          System 2: رقم منطقي دقيق
                          نافذة الفرصة: BJ Fogg -- المحفّز الزمني */}
                      <div style={{
                        marginTop:10,display:"flex",flexDirection:"row-reverse",gap:6,
                        paddingTop:10,borderTop:"1px solid rgba(255,255,255,.05)",
                      }}>
{/* System 1 -- العقل السريع -- موحَّد: العنوان واللون والنص لا تتناقض أبداً */}
{(function(){
  var vr = (health.extras && health.extras.vr) || 1;
  var rsiV = (health.extras && health.extras.rsiV) || 50;
  var regime = health.regime;
  var isVolatile = regime === "volatile" || regime === "news-driven";
  var isOverbought = rsiV >= 75;

  var icon, title, subtitle, boxColor;

  if(health.score >= 65){
    if(isOverbought){
      icon = "⚠️"; title = "فرصة بحذر"; boxColor = C.amber;
      subtitle = "RSI مرتفع جداً (" + Math.round(rsiV) + ") - دخول تدريجي فقط";
    } else if(isVolatile){
      icon = "🚀"; title = "فرصة الآن"; boxColor = health.sigC;
      subtitle = "إشارة قوية في سوق متقلب - قلّل الحجم";
    } else {
      icon = "🚀"; title = "فرصة الآن"; boxColor = health.sigC;
      subtitle = "السيولة والزخم يدعمان الدخول";
    }
  } else if(health.score >= 55){
    icon = "👁"; title = "راقب عن قرب"; boxColor = health.sigC;
    subtitle = isVolatile ? "تذبذب عالٍ - انتظر استقراراً" : "انتظر تأكيد الحجم قبل الدخول";
  } else if(health.score >= 45){
    icon = "⚖️"; title = "لا تتسرع"; boxColor = health.sigC;
    subtitle = vr >= 1.5 ? "حجم عالٍ - راقب الاتجاه" : "الإشارة غير حاسمة - تجنّب الدخول";
  } else if(health.score >= 35){
    icon = "🛡"; title = "احتاط"; boxColor = health.sigC;
    if(vr >= 1.5 && stk.ch >= 0) subtitle = "حجم عالٍ رغم الضعف - مضاربي";
    else if(stk.ch < -1) subtitle = "تراجع متواصل - تجنّب";
    else subtitle = "إشارة ضعيفة - لا تشتري";
  } else {
    icon = "🛡"; title = "احتاط"; boxColor = health.sigC;
    subtitle = stk.ch < -2 ? "ضغط بيعي مرتفع - ابتعد" : "إشارة ضعيفة جداً - خطر";
  }

  return(
    <div style={{
      flex:1,
      background:boxColor+"14",
      border:"1px solid " + boxColor + "30",
      borderRadius:12,padding:"9px 12px",
      display:"flex",alignItems:"center",gap:8,
    }}>
      <span style={{fontSize:20,flexShrink:0,lineHeight:1}}>{icon}</span>
      <div>
        <div style={{
          fontSize:11,fontWeight:800,
          color:boxColor,lineHeight:1,marginBottom:3,
        }}>{title}</div>
        <div style={{fontSize:8.5,color:C.smoke,lineHeight:1.3}}>{subtitle}</div>
      </div>
    </div>
  );
})()}


{/* نافذة الفرصة -- مبنية على بيانات الحجم الفعلية */}
{/* 🎯 معايرة: 50 بدلاً من 55 - لتظهر مع "عاجل" */}
{(health.score>=50 || ((health.extras && health.extras.vr) || 1) >= 1.4)&&(function(){
  // ✨ لا نخلق إلحاحاً للشراء عند RSI مرتفع جداً -- نستبدل العداد بشارة تحذير
  var rsiVWindow = (health.extras && health.extras.rsiV) || 50;
  if(rsiVWindow >= 75){
    return(
      <div style={{
        flexShrink:0,width:56,
        background:"linear-gradient(160deg,"+C.amber+"18,"+C.amber+"06)",
        border:"1px solid "+C.amber+"40",
        borderRadius:12,padding:"7px 5px",
        textAlign:"center",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:2,
      }}>
        <div style={{
          fontSize:7,color:C.amber,fontWeight:800,lineHeight:1,
          background:C.amber+"18",borderRadius:4,padding:"1px 5px",
        }}>RSI مرتفع</div>
        <div style={{fontSize:14,lineHeight:1}}>⏸</div>
        <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
          لا تستعجل
        </div>
      </div>
    );
  }

                          // ─── فحص حالة السوق السعودي ───
                          var _mk = getKsaMarket();
                          var ksaDay = _mk.day, ksaMin = _mk.mins, isOpen = _mk.isOpen;

                          // ─── السوق مغلق: حسب الوقت المتبقّي للافتتاح ───
                          if(!isOpen){
                            var minsToOpen;
                            if(ksaDay===5){ // الجمعة
                              minsToOpen = ((6-ksaDay)*24*60) + (570 - ksaMin) + 24*60;
                            } else if(ksaDay===6){ // السبت
                              minsToOpen = (24*60) + (570 - ksaMin);
                            } else if(ksaMin < 570){ // قبل الفتح
                              minsToOpen = 570 - ksaMin;
                            } else { // بعد الإغلاق
                              if(ksaDay===4){ // الخميس → الأحد
                                minsToOpen = (3*24*60) + (570 - ksaMin) + 24*60;
                              } else {
                                minsToOpen = (24*60 - ksaMin) + 570;
                              }
                            }
                            var openH = Math.floor(minsToOpen / 60);
                            var openM = minsToOpen % 60;
                            // ✨ تَحويل الأرقام الإنجليزية إلى عربية شرقية
                            var toArabicNum = function(n){
                              var ar = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
                              return String(n).split("").map(function(d){
                                return /\d/.test(d) ? ar[parseInt(d,10)] : d;
                              }).join("");
                            };
                            var hStr = toArabicNum(openH);
                            var mStr = toArabicNum(openM);
                            return(
                              <div style={{
                                flexShrink:0,width:56,
                                background:"linear-gradient(160deg,"+C.coral+"15,"+C.coral+"06)",
                                border:"1px solid "+C.coral+"35",
                                borderRadius:12,padding:"7px 5px",
                                textAlign:"center",
                                display:"flex",flexDirection:"column",
                                alignItems:"center",justifyContent:"center",gap:2,
                              }}>
                                <div style={{
                                  fontSize:7,color:C.coral,fontWeight:800,lineHeight:1,
                                  background:C.coral+"18",borderRadius:4,padding:"1px 5px",
                                }}>مغلق</div>
                                <div style={{
                                  fontSize:11,fontWeight:900,
                                  color:C.coral,lineHeight:1,
                                  direction:"rtl",
                                  whiteSpace:"nowrap",
                                }}>
                                  {hStr}س {mStr}د
                                </div>
                                <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
                                  للافتتاح
                                </div>
                              </div>
                            );
                          }

// ─── السوق مفتوح: نافذة الفرصة حسب الحجم ───

                          var vr   = (health.extras && health.extras.vr) || 1;
                          var L9   = (health.layers && health.layers.L9)  || 50;

                          // كلما ارتفع الحجم ضاقت النافذة -- إلحاح حقيقي
                          var windowMins = vr >= 1.5 ? 8
                                        : vr >= 1.3 ? 15
                                        : vr >= 1.1 ? 25
                                        : L9 >= 75  ? 20
                                        : 45;

                          var urgColor = windowMins <= 10 ? C.coral
                                       : windowMins <= 20 ? C.amber
                                       : health.sigC;

                          var urgLabel = windowMins <= 10 ? "عاجل"
                                       : windowMins <= 20 ? "قريب"
                                       : "متاح";

                          return(
                            <div style={{
                              flexShrink:0,width:56,
                              background:"linear-gradient(160deg," + urgColor + "18," + urgColor + "06)",
                              border:"1px solid " + urgColor + "40",
                              borderRadius:12,padding:"7px 5px",
                              textAlign:"center",
                              display:"flex",flexDirection:"column",
                              alignItems:"center",justifyContent:"center",gap:2,
                              position:"relative",
                            }}>

                              <div style={{
                                fontSize:7,color:urgColor,fontWeight:800,lineHeight:1,
                                background:urgColor+"18",borderRadius:4,padding:"1px 5px",
                              }}>{urgLabel}</div>

                              <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
                                {windowMins + "د نافذة"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ══ بطاقة الإجراء الفوري ══
                          سطر واحد -- ماذا تفعل الآن بالضبط */}
                                           {(function(){
                        // ════════════════════════════════════════════════════════
                        //  Position Size -- موحد مع analysisEngine
                        //  
                        //  المبدأ:
                        //  • نستخدم health.positionSize.pct (Half-Kelly محسوب)
                        //  • fallback: حساب من L6
                        // ════════════════════════════════════════════════════════
                        var pct;
                        if(health.positionSize && health.positionSize.pct){
                          // الأفضل: من Half-Kelly المحسوب
                          pct = Math.round(health.positionSize.pct);
                        } else {
                          // fallback آمن
                          var kelAdj = (health.layers && health.layers.L6)
                            ? health.layers.L6 / 200
                            : 0.05;
                          pct = Math.max(3, Math.min(20, Math.round(kelAdj * 100)));
                        }
// ✨ موحَّد مع المحفظة: نفس calcSmartStopLoss/calcSmartTakeProfit من positionEngine.js
var atrPct = (health.extras && health.extras.atrPct) || 2.5;
var alertPct = Math.max(0.5, Math.min(3, atrPct * 0.5));

var unifiedStop = calcSmartStopLoss(stk.p, stk.p, health, bars);
var unifiedTargets = calcSmartTakeProfit(stk.p, unifiedStop.stopPrice, health, bars);

var stop = unifiedStop.stopPrice.toFixed(2);
var tgt  = unifiedTargets ? unifiedTargets.t1.price.toFixed(2) : stop;
var alertPrice = (stk.p * (1 + alertPct/100)).toFixed(2);
                        

                        // ✨ Action Plan مع وعي بـ RSI و regime -- لون النص متّسق دائماً مع الخلفية
                        var icon, line1, line2, bg, border, lineColor;
                        var rsiV = (health.extras && health.extras.rsiV) || 50;
                        var isOverbought = rsiV >= 75;
                        var isRegimeVolatile = health.regime === "volatile" || health.regime === "news-driven";
                        
                        if(health.score >= 65){
                          // ─── رسالة سياقية حسب RSI ───
                          if(isOverbought){
                            icon  = "⚠️";
                            line1 = "فرصة شراء بحذر - " + pct + "% من المحفظة";
                            line2 = "RSI مرتفع - ادخل تدريجياً | وقف: " + stop;
                            bg    = "rgba(245,158,11,.10)";
                            border= "rgba(245,158,11,.30)";
                            lineColor = C.amber;
                          } else if(isRegimeVolatile){
                            icon  = "⚠️";
                            line1 = "فرصة شراء (سوق متقلب) - " + pct + "%";
                            line2 = "قلّص الحجم | وقف: " + stop + " · هدف: " + tgt;
                            bg    = "rgba(212,168,67,.10)";
                            border= "rgba(212,168,67,.30)";
                            lineColor = C.gold;
                          } else {
                            icon  = "✅";
                            line1 = "فرصة شراء - " + pct + "% من المحفظة";
                            line2 = "وقف: " + stop + " · هدف: " + tgt;
                            bg    = "rgba(16,201,126,.08)";
                            border= "rgba(16,201,126,.25)";
                            lineColor = C.mint;
                          }
                        } else if(health.score >= 55){
                          icon  = "🔔";
                          line1 = "اضبط تنبيهاً عند " + alertPrice;
                          line2 = "انتظر تأكيد الحجم قبل الشراء";
                          bg    = "rgba(245,158,11,.08)";
                          border= "rgba(245,158,11,.22)";
                          lineColor = C.amber;
                        } else if(health.score >= 45){
                          icon  = "⏸";
                          line1 = "لا توجد إشارة دخول";
                          line2 = "إذا كنت مالكاً: احتفظ وراقب";
                          bg    = "rgba(6,182,212,.07)";
                          border= "rgba(6,182,212,.2)";
                          lineColor = C.teal;
                        } else if(health.score >= 35){
                          icon  = "⚠";
                          line1 = "تجنّب الشراء الآن";
                          line2 = "إذا كنت مالكاً: راجع وقف الخسارة";
                          bg    = "rgba(245,158,11,.08)";
                          border= "rgba(245,158,11,.22)";
                          lineColor = C.amber;
                        } else {
                          icon  = "🔴";
                          line1 = "إشارة ضعف قوية";
                          line2 = "إذا كنت مالكاً: قلّص أو وقف عند " + stop;
                          bg    = "rgba(240,79,90,.08)";
                          border= "rgba(240,79,90,.22)";
                          lineColor = C.coral;
                        }
                                                                                                return(
                          <div>
                          <div style={{
                            marginTop:8,
                            background:bg,
                            border:"1px solid " + border,
                            borderRadius:12,
                            padding:"10px 14px",
                            display:"flex",alignItems:"center",gap:10,
                          }}>
                            <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{
                                fontSize:11,fontWeight:900,
                                color:lineColor,lineHeight:1,marginBottom:3,
                              }}>{line1}</div>

                              <div style={{
                                fontSize:9,color:C.mist,
                                lineHeight:1.4,direction:"ltr",textAlign:"right",
                              }}>{line2}</div>
                            </div>
                          </div>
                          
                          {/* 🆕 تنبيه التباعد - يظهر فقط عند تعارض CMF/OBV */}
                          {(function(){
                            var ex = health.extras || {};
                            var cmf = ex.cmf;
                            var obvUp = ex.obvRising;
                            if (cmf == null || obvUp == null) return null;
                            
                            // تباعد إيجابي: OBV هابط + CMF إيجابي قوي
                            if (!obvUp && cmf > 0.1) {
                              return (
                                <div style={{
                                  marginTop:6,
                                  background:"rgba(245,158,11,.08)",
                                  border:"1px solid rgba(245,158,11,.25)",
                                  borderRadius:10,
                                  padding:"7px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:14}}>⚠</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10,fontWeight:800,color:C.amber,marginBottom:2}}>
                                      تباعد إيجابي مكتشف
                                    </div>
                                    <div style={{fontSize:8.5,color:C.mist,lineHeight:1.4}}>
                                      السعر يهبط لكن المال يتدفق - قد يكون تجميعاً خفياً
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // تباعد سلبي: OBV صاعد + CMF سلبي
                            if (obvUp && cmf < -0.1) {
                              return (
                                <div style={{
                                  marginTop:6,
                                  background:"rgba(240,79,90,.08)",
                                  border:"1px solid rgba(240,79,90,.25)",
                                  borderRadius:10,
                                  padding:"7px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:14}}>⚠</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10,fontWeight:800,color:C.coral,marginBottom:2}}>
                                      تباعد سلبي مكتشف
                                    </div>
                                    <div style={{fontSize:8.5,color:C.mist,lineHeight:1.4}}>
                                      السعر يصعد لكن المال يخرج - قد يكون تصريفاً
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                                                        return null;
                          })()}
                          </div>
                        );
                      })()}
{/* Trading Plan */}
{health.tradingPlan && (function(){

  var tp = health.tradingPlan;
  // ✨ موحَّد: لا نعرض لون "واثق" أخضر إذا كانت البطاقة في حالة تحذير RSI أعلاها
  var sigColor = cardOverbought ? C.amber : (tp.actionColor || health.sigC);

  // ✨ موحَّد مع المحفظة: نفس وقف الخسارة والأهداف من positionEngine.js
  var uStop = calcSmartStopLoss(stk.p, stk.p, health, bars);
  var uTargets = calcSmartTakeProfit(stk.p, uStop.stopPrice, health, bars);
  var uT1 = uTargets ? uTargets.t1 : null;
  var uT2 = uTargets ? uTargets.t2 : null;
  var uRR = uTargets ? uTargets.weightedRR : null;
  var uRRLabel = uRR ? (uRR>=3?"ممتاز ⭐":uRR>=2?"جيد ✓":uRR>=1.5?"مقبول":"ضعيف ⚠") : "";

  return(

                          <div style={{
                            marginTop:10,
                            background:"linear-gradient(135deg," + sigColor + "10," + sigColor + "06)",
                            border:"1px solid " + sigColor + "33",
                            borderRadius:14,
                            overflow:"hidden",
                          }}>
                            {/* عنوان البطاقة */}
                            <div style={{
                              display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"8px 12px",
                              background:sigColor + "15",
                              borderBottom:"1px solid " + sigColor + "20",
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{fontSize:13}}>🎯</span>
                                <span style={{fontSize:10,fontWeight:800,color:sigColor,letterSpacing:".3px"}}>
                                  خطة التداول الاحترافية
                                </span>
                              </div>
                              {tp.timeHorizon && (
                                <div style={{
                                  background:sigColor + "20",
                                  border:"1px solid " + sigColor + "33",
                                  borderRadius:5,padding:"1px 8px",
                                }}>
                                  <span style={{fontSize:8,fontWeight:700,color:sigColor}}>
                                    ⏱ {tp.timeHorizon}
                                  </span>
                                </div>
                              )}
                            </div>
                            {cardOverbought && (
                              <div style={{
                                padding:"6px 12px",
                                background:C.amber+"10",
                                borderBottom:"1px solid "+C.amber+"20",
                                display:"flex",alignItems:"center",gap:6,
                              }}>
                                <span style={{fontSize:10}}>⚠️</span>
                                <span style={{fontSize:8,color:C.amber,fontWeight:700}}>
                                  RSI مرتفع جداً -- هذه الخطة افتراضية حتى يهدأ الزخم
                                </span>
                              </div>
                            )}

                            
                            {/* جسم البطاقة */}
                            <div style={{padding:"10px 12px"}}>
                              {/* الصف الأول: Entry + Stop + Target1 + Target2 */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                                {/* Entry -- موحَّد: نفس السعر الحالي المستخدم لحساب uStop/uTargets */}
                                <div style={{
                                  background:"rgba(255,255,255,.03)",
                                  border:"1px solid rgba(255,255,255,.06)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>📍</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الدخول</span>
                                  </div>
                                  <div className="num" style={{fontSize:14,fontWeight:900,color:C.snow,direction:"ltr"}}>
                                    {stk.p.toFixed(2)}
                                  </div>
                                </div>
                                
                                {/* Stop Loss */}
                                <div style={{
                                  background:"rgba(240,79,90,.06)",
                                  border:"1px solid rgba(240,79,90,.18)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>🛡️</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>وقف الخسارة</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.coral}}>
{uStop.stopPrice.toFixed(2)}

                                    </div>
                                    <div style={{fontSize:8,fontWeight:700,color:C.coral}}>
({uStop.stopPct.toFixed(1)}%)

                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* الصف الثاني: Target1 + Target2 */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                                {/* Target 1 */}
                                <div style={{
                                  background:"rgba(16,201,126,.06)",
                                  border:"1px solid rgba(16,201,126,.18)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>🎯</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الهدف الأول</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>
{uT1 ? uT1.price.toFixed(2) : "-"}

                                    </div>
                                    <div style={{fontSize:8,fontWeight:700,color:C.mint}}>
(+{uT1 ? uT1.pct.toFixed(1) : "-"}%)

                                    </div>
                                  </div>
                                </div>
                                
{/* Target 2 */}
<div style={{
  background:"rgba(16,201,126,.09)",
  border:"1px solid rgba(16,201,126,.25)",
  borderRadius:8,padding:"6px 8px",
}}>
  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
    <span style={{fontSize:9}}>🚀</span>
    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الهدف الثاني</span>
  </div>
  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
    <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>
      {uT2 ? uT2.price.toFixed(2) : "-"}
    </div>
    <div style={{fontSize:8,fontWeight:700,color:C.mint}}>
      (+{uT2 ? uT2.pct.toFixed(1) : "-"}%)
    </div>
  </div>
</div>
                              </div>

                              
                              {/* الصف الثالث: R/R Ratio + Worst Case */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                                {/* R/R Ratio */}
                                <div style={{
                                  background:"rgba(212,168,67,.06)",
                                  border:"1px solid rgba(212,168,67,.2)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>📊</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>المخاطرة/العائد</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.gold}}>
{uRR ? uRR + ":1" : "-"}

                                    </div>
                                    <div style={{fontSize:8,color:C.gold,fontWeight:700}}>
{uRRLabel}

                                    </div>
                                  </div>
                                </div>

                                
                                {/* Worst Case */}
  {uStop && (
                                  <div style={{
                                    background:"rgba(245,158,11,.06)",
                                    border:"1px solid rgba(245,158,11,.2)",
                                    borderRadius:8,padding:"6px 8px",
                                  }}>
                                    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                      <span style={{fontSize:9}}>💀</span>
                                      <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>أسوأ سيناريو</span>
                                    </div>
                                    <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                      <div className="num" style={{fontSize:13,fontWeight:900,color:C.amber}}>
-{Math.abs(uStop.stopPct).toFixed(1)}%

                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Plan - السطر الأخير */}
                              {tp.actionPlan && (
                                <div style={{
                                  background:sigColor + "18",
                                  border:"1px solid " + sigColor + "44",
                                  borderRadius:10,padding:"8px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:16,flexShrink:0}}>🎬</span>
                                  <div style={{flex:1}}>
                                    <div style={{
                                      fontSize:11,fontWeight:900,
                                      color:sigColor,lineHeight:1.3,
                                    }}>{tp.actionPlan}</div>
                                    {tp.riskWarning && 
                                     tp.riskWarning !== tp.actionPlan && 
                                     !tp.actionPlan.includes(tp.riskWarning) &&
                                     !tp.riskWarning.includes(tp.actionPlan) && (
                                      <div style={{
                                        fontSize:8,color:C.amber,
                                        marginTop:3,lineHeight:1.4,
                                      }}>
                                        ⚠ {tp.riskWarning}
                                      </div>
                                    )}
                                  </div> 
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ البوابات الثلاث + مصفوفة الفرصة ══ */}
                      {(function(){
                        var gates = health.gates || {};
                        var opp   = health.opp   || {};
                        if(!gates.g1l) return null;

                        var gateItems = [
                          {pass:gates.g1, label:"السيولة",  score:gates.g1s||0, desc:gates.g1l||"",  icon:"💧"},
                          {pass:gates.g2, label:"الهيكل",   score:gates.g2s||0, desc:gates.g2l||"",  icon:"🏗"},
                          {pass:gates.g3, label:"الزخم",    score:gates.g3s||0, desc:gates.g3l||"",  icon:"⚡"},
                        ];

                        return(
                          <div style={{marginTop:8}}>
                            {/* عنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",
                              justifyContent:"space-between",marginBottom:6,
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:3,height:12,background:C.electric,borderRadius:2}}/>
                                <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                  البوابات الثلاث
                                </span>
                              </div>
                              {/* مصفوفة الفرصة */}
                              <div style={{
                                display:"flex",alignItems:"center",gap:4,
                                background:(opp.color||C.smoke)+"18",
                                border:"1px solid " + (opp.color||C.smoke) + "35",
                                borderRadius:8,padding:"3px 10px",
                              }}>
                                <span style={{fontSize:8,fontWeight:800,color:opp.color||C.smoke}}>
                                  {opp.matrix||"--"}
                                </span>
                              </div>
                            </div>

                            {/* البوابات */}
                            <div style={{display:"flex",gap:5}}>
                              {gateItems.map(function(g,i){
                                var passColor = g.pass ? C.mint : C.coral;
                                var barW      = Math.min(100, g.score);
                                return(
                                  <div key={i} style={{
                                    flex:1,
                                    background: g.pass ? "rgba(16,201,126,.07)" : "rgba(240,79,90,.07)",
                                    border:"1px solid " + (g.pass ? C.mint+"30" : C.coral+"30"),
                                    borderRadius:10,padding:"8px 8px 6px",
                                    position:"relative",overflowX:"hidden",
                                    textAlign:"center",
                                  }}>
                                    {/* أيقونة + حالة */}
                                    <div style={{
                                      display:"flex",alignItems:"center",
                                      justifyContent:"center",marginBottom:5,
                                    }}>
                                      <span style={{
                                        fontSize:9,fontWeight:900,
                                        color:passColor,lineHeight:1,
                                      }}>
                                        {g.pass ? "✓" : "✗"}
                                      </span>
                                    </div>
                                    {/* الاسم */}
                                    <div style={{
                                      fontSize:8,fontWeight:700,
                                      color:C.snow,marginBottom:2,
                                      textAlign:"center",
                                    }}>{g.label}</div>
                                    {/* الدرجة */}
                                    <div style={{
                                      fontSize:11,fontWeight:900,
                                      color:passColor,lineHeight:1,marginBottom:4,
                                      textAlign:"center",
                                    }}>{g.score}</div>
                                    {/* شريط */}
                                    <div style={{
                                      height:3,background:C.ash+"44",
                                      borderRadius:2,overflow:"hidden",
                                    }}>
                                      <div style={{
                                        height:"100%",
                                        width:barW+"%",
                                        background:passColor,
                                        borderRadius:2,
                                        transition:"width .8s cubic-bezier(.4,0,.2,1)",
                                      }}/>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* ملاحظة إذا فشلت بوابة */}
                            {!gates.all&&(
                              <div style={{
                                marginTop:6,
                                display:"flex",alignItems:"center",gap:6,
                                background:"rgba(245,158,11,.07)",
                                border:"1px solid rgba(245,158,11,.2)",
                                borderRadius:8,padding:"5px 10px",
                              }}>
                                <span style={{fontSize:10}}>⚠</span>
                                <span style={{fontSize:8,color:C.amber,lineHeight:1.4}}>
                                  {gates.passed===2
                                    ? "بوابة واحدة لم تُجتز -- الإشارة مخففة بـ 18%"
                                    : gates.passed===1
                                    ? "بوابتان لم تُجتزا -- الإشارة مخففة بـ 38%"
                                    : "جميع البوابات فشلت -- لا توجد إشارة موثوقة"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══════════════════════════════════════════════════════
                          🧠 CONVICTION CARD -- Single Source of Truth
                          
                          يعرض من analysisEngine (الإصلاحات 1+10):
                          • convictionScore (منفصل عن score)
                          • convictionLabel ("ثقة عالية ⭐")
                          • convictionColor
                          • convictionAlignment (متوافق/أعلى/أقل)
                          • convictionGap
                      ══════════════════════════════════════════════════════ */}
                      {health.convictionScore != null && (function(){
                        var cs = health.convictionScore;
                        var cLabel = health.convictionLabel || "";
                        var cColor = health.convictionColor || C.electric;
                        var alignment = health.convictionAlignment || "متوافق";
                        var gap = health.convictionGap || 0;
                        var score = health.score;
                        
                        // تحديد رسالة Alignment
                        var alignMsg, alignIcon, alignColor;
                        if(alignment === "متوافق"){
                          alignMsg = "محرك الثقة يدعم تقييم Score";
                          alignIcon = "✓";
                          alignColor = C.mint;
                        } else if(alignment === "أعلى من Score"){
                          alignMsg = "ensemble داعم - ثقة إضافية";
                          alignIcon = "↑";
                          alignColor = C.mint;
                        } else {
                          alignMsg = "ensemble متحفظ - تحقّق قبل الدخول";
                          alignIcon = "↓";
                          alignColor = C.amber;
                        }
                        
                        return(
                          <div style={{
                            marginTop:8,
                            background:"linear-gradient(135deg," + cColor + "0c," + cColor + "04)",
                            border:"1px solid " + cColor + "28",
                            borderRadius:12,
                            overflow:"hidden",
                          }}>
                            {/* عنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"6px 12px",
                              background:cColor + "10",
                              borderBottom:"1px solid " + cColor + "18",
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{fontSize:11}}>🧠</span>
                                <span style={{fontSize:9,fontWeight:800,color:cColor,letterSpacing:".3px"}}>
                                  محرك الثقة (Ensemble Voting)
                                </span>
                              </div>
                              <div style={{
                                background:cColor + "20",
                                border:"1px solid " + cColor + "33",
                                borderRadius:5,padding:"1px 7px",
                              }}>
                                <span style={{fontSize:8,fontWeight:700,color:cColor}}>
                                  {cLabel}
                                </span>
                              </div>
                            </div>
                            
                            {/* جسم البطاقة */}
                            <div style={{padding:"10px 12px"}}>
                              {/* المقارنة المرئية: Score vs Conviction */}
                              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                                {/* Score */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>جودة الإشارة</div>
                                  <div className="num" style={{
                                    fontSize:22,fontWeight:900,
                                    color:health.sigC,lineHeight:1,
                                  }}>{score}</div>
                                  <div style={{fontSize:7,color:C.smoke,marginTop:2}}>Score</div>
                                </div>
                                
                                {/* السهم */}
                                <div style={{flex:0,textAlign:"center"}}>
                                  <div style={{
                                    fontSize:18,
                                    color: gap > 5 ? C.mint : gap < -5 ? C.amber : C.smoke,
                                    fontWeight:900,lineHeight:1,
                                  }}>
                                    {gap > 5 ? "↗" : gap < -5 ? "↘" : "→"}
                                  </div>
                                  <div style={{fontSize:7,color:C.smoke,marginTop:3}}>
                                    {gap > 0 ? "+" : ""}{gap}
                                  </div>
                                </div>
                                
                                {/* Conviction */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>ثقة القرار</div>
                                  <div className="num" style={{
                                    fontSize:22,fontWeight:900,
                                    color:cColor,lineHeight:1,
                                  }}>{cs}</div>
                                  <div style={{fontSize:7,color:cColor,marginTop:2,fontWeight:700}}>Conviction</div>
                                </div>
                              </div>
                              
                              {/* رسالة Alignment */}
                              <div style={{
                                background:alignColor + "10",
                                border:"1px solid " + alignColor + "25",
                                borderRadius:8,padding:"5px 10px",
                                display:"flex",alignItems:"center",gap:6,
                              }}>
                                <span style={{
                                  fontSize:10,fontWeight:900,
                                  color:alignColor,
                                }}>{alignIcon}</span>
                                <div style={{flex:1}}>
                                  <div style={{
                                    fontSize:9,fontWeight:700,
                                    color:alignColor,lineHeight:1.2,marginBottom:1,
                                  }}>{alignment}</div>
                                  <div style={{
                                    fontSize:8,color:C.mist,lineHeight:1.4,
                                  }}>{alignMsg}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}


                      {/* ══ KPI Panel: Probability + PositionSize + Confidence ══ */}
                      {(function(){
                        var prob  = health.probability  || {};
                        var ps    = health.positionSize  || {};
                        var conf  = health.confidence    || 50;
   // ✨ توحيد القيم: ≤ 1 = نسبة (× 100)، > 1 = مئوية بالفعل
var normalizeProb = function(v) {
  if (v == null) return null;
  return Math.round(v <= 1 ? v * 100 : v);
};
var bull = normalizeProb(prob.bull);
var bear = normalizeProb(prob.bear);
var neut = normalizeProb(prob.neutral);
                                                                                                var pct   = ps.pct     != null ? ps.pct.toFixed(1)          : null;
                        var kelly = ps.kelly   != null ? ps.kelly.toFixed(1)        : null;
                        // 🔧 إصلاح: إضافة fallback للـ recommended
                        var recK  = ps.recommended;
                        if (!recK || recK === "") {
                          var kellyNum = parseFloat(kelly);
                          if (kellyNum >= 15) recK = "حجم كبير";
                          else if (kellyNum >= 8) recK = "حجم متوسط";
                          else if (kellyNum >= 3) recK = "حجم صغير";
                          else if (kellyNum > 0) recK = "حجم ضئيل";
                          else recK = "لا توصية";
                        }
                        if(bull==null && pct==null) return null;
                        return(
                          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                            {/* عنوان */}
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                              <div style={{width:3,height:12,background:C.plasma,borderRadius:2}}/>
                              <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                محرك الاحتمالات وإدارة المركز
                              </span>
                            </div>

                                                        {/* الاحتمالات الثلاثة + تفسير */}
                            {bull!=null&&(
                              <div style={{
                                background:C.layer2,border:"1px solid "+C.edge,
                                borderRadius:12,padding:"10px 12px",
                              }}>
                                <div style={{fontSize:8,color:C.smoke,marginBottom:8,fontWeight:600,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                  الاحتمال الموزون -- Softmax₃
                                  <Tooltip termKey="Softmax" size="small"/>
                                </div>
                                
                                {/* ✨ رسالة تفسيرية -- توافق Probability مع Sig */}
                                {(function(){
                                  var maxProb = Math.max(bull, bear, neut);
                                  var dominant = maxProb === bull ? "صاعد" 
                                              : maxProb === bear ? "هابط" 
                                              : "محايد";
                                  var sigPositive = health.sig === "شراء قوي" || health.sig === "مراقبة";
                                  var sigNegative = health.sig === "تخفيف";
                                  
                                  // ─── تحديد الرسالة ───
                                  var msg = null;
                                  var msgColor = C.smoke;
                                  var msgIcon = "ℹ";
                                  
                                  if(sigPositive && dominant === "صاعد" && maxProb >= 60){
                                    msg = "إجماع قوي على الصعود ✓";
                                    msgColor = C.mint;
                                    msgIcon = "🎯";
                                  } else if(sigPositive && dominant === "صاعد" && maxProb >= 45){
                                    msg = "ميل صاعد لكن غير حاسم";
                                    msgColor = C.amber;
                                    msgIcon = "⚖";
                                  } else if(sigPositive && dominant === "صاعد" && maxProb < 45){
                                    msg = "الإشارة قوية لكن الاحتمالات متذبذبة - قلّص الحجم";
                                    msgColor = C.amber;
                                    msgIcon = "⚠";
                                  } else if(sigPositive && dominant !== "صاعد"){
                                    msg = "تعارض: الإشارة إيجابية لكن الاحتمالات تشير لـ " + dominant;
                                    msgColor = C.coral;
                                    msgIcon = "⚠";
                                  } else if(sigNegative && dominant === "هابط"){
                                    msg = "إجماع على الضعف ✗";
                                    msgColor = C.coral;
                                    msgIcon = "🛑";
                                  } else if(dominant === "محايد"){
                                    msg = "السوق في حيرة - انتظر اتجاهاً واضحاً";
                                    msgColor = C.amber;
                                    msgIcon = "⚖";
                                  }
                                  
                                  if(!msg) return null;
                                  
                                  return(
                                    <div style={{
                                      background: msgColor + "10",
                                      border: "1px solid " + msgColor + "25",
                                      borderRadius:6,padding:"4px 8px",
                                      marginBottom:8,
                                      display:"flex",alignItems:"center",gap:5,
                                    }}>
                                      <span style={{fontSize:9}}>{msgIcon}</span>
                                      <span style={{
                                        fontSize:8.5,color:msgColor,
                                        lineHeight:1.3,fontWeight:600,
                                      }}>{msg}</span>
                                    </div>
                                  );
                                })()}
                                <div style={{display:"flex",gap:6}}>
                                  {[
                                    {l:"صاعد",v:bull,c:C.mint},
                                    {l:"هابط",v:bear,c:C.coral},
                                    {l:"محايد",v:neut,c:C.amber},
                                  ].map(function(it,i){
                                    return(
                                      <div key={i} style={{flex:1,textAlign:"center"}}>
                                        <div style={{
                                          fontSize:20,fontWeight:900,
                                          color:it.c,lineHeight:1,
                                        }}>{it.v}%</div>
                                        <div style={{
                                          height:4,background:C.ash+"33",
                                          borderRadius:2,margin:"4px 0",overflow:"hidden",
                                        }}>
                                          <div style={{
                                            height:"100%",width:it.v+"%",
                                            background:it.c,borderRadius:2,
                                            transition:"width .8s ease",
                                          }}/>
                                        </div>
                                        <div style={{fontSize:8,color:C.ash}}>{it.l}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* حجم المركز + Kelly + الثقة */}
                            {pct!=null&&(
                              <div style={{display:"flex",gap:6}}>
                                <div style={{
                                  flex:2,background:C.layer2,
                                  border:"1px solid "+(cardOverbought?C.amber+"33":C.edge),
                                  borderRadius:12,padding:"10px 12px",
                                }}>
                                                                    <div style={{fontSize:8,color:C.smoke,marginBottom:4,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                    حجم المركز (Half-Kelly)
                                    <Tooltip termKey="حجم المركز" size="small"/>
                                  </div>
                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:cardOverbought?C.amber:(health.sigC||C.gold),lineHeight:1,
                                  }}>{pct}%</div>
                                  <div style={{fontSize:8,color:C.ash,marginTop:3}}>
                                    Kelly كامل: {kelly}% · {recK||""}
                                  </div>
                                  {cardOverbought && (
                                    <div style={{fontSize:7,color:C.amber,marginTop:3,fontWeight:600}}>
                                      ⚠ قلّص الحجم -- RSI مرتفع
                                    </div>
                                  )}
                                </div>

                                                                                                <div style={{
                                  flex:1,background:C.layer2,
                                  border:"1px solid "+C.edge,
                                  borderRadius:12,padding:"10px 12px",
                                  display:"flex",flexDirection:"column",
                                  alignItems:"center",justifyContent:"center",
                                }}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:1,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                    ثقة الحجم
                                    <Tooltip termKey="الثقة" size="small"/>
                                  </div>
                                  <div style={{fontSize:6,color:C.ash,marginBottom:3,textAlign:"center"}}>
                                    موثوقية حساب النسبة
                                  </div>

                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:conf>=70?C.mint:conf>=50?C.amber:C.coral,
                                    lineHeight:1,
                                  }}>{conf}%</div>
                                  
                                  {/* ✨ سبب انخفاض الثقة (إذا منخفضة) */}
                                  {conf < 60 && (function(){
                                    var reason = null;
                                    var rsiV = (health.extras && health.extras.rsiV) || 50;
                                    var isVolatile = health.regime === "volatile" || health.regime === "news-driven";
                                    var gatesPassed = (health.gates && health.gates.passed) || 0;
                                    
                                    if(isVolatile) reason = "سوق متقلب";
                                    else if(rsiV >= 75) reason = "RSI مرتفع";
                                    else if(rsiV <= 25) reason = "RSI منخفض";
                                    else if(gatesPassed < 2) reason = "بوابات ضعيفة";
                                    else reason = "إشارات متضاربة";
                                    
                                    return(
                                      <div style={{
                                        fontSize:6.5,color:C.smoke,
                                        marginTop:3,fontWeight:600,
                                        textAlign:"center",
                                      }}>
                                        ⚠ {reason}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══ مؤشرات متقدمة -- من محرك الـ 11 طبقة ══ */}
                      {(function(){
                        var ex = health.extras || {};
                        if(!ex.rsiV && !ex.macdH) return null;
                        var rsiV   = ex.rsiV;
                        var macdH  = ex.macdH;
                        var adxV   = ex.adxV;
                        var adxBull= ex.adxBull;
                        var wyPh   = ex.wyPhase;
                        var msLbl  = ex.msLabel || (ex.bosBull ? "كسر هيكل صاعد ↑" : "");
                        var obLbl  = ex.obLabel || (ex.inBullOB ? "Order Block صاعد" : "");
                        var sslLbl = ex.sslLabel|| (ex.recoveredSSL ? "انتعاش SSL" : "");
                        var cmfV   = ex.cmf;
                        var obvUp  = ex.obvRising;
                        var vwapD  = ex.vwapDev;
                        var macroE = ex.macroEnv;
                        var macroS = ex.macroScore;
                        var rsiColor = rsiV>=75?C.coral:rsiV<30?C.mint:C.amber;

                        var macdColor= macdH>0?C.mint:C.coral;
                        var adxColor = adxV>35?C.electric:adxV>25?C.amber:C.ash;
                        return(
                          <div style={{marginTop:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                              <div style={{width:3,height:12,background:C.teal,borderRadius:2}}/>
                              <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                المؤشرات التقنية والهيكلية
                              </span>
                            </div>
                            {/* Row 1: RSI + MACD + ADX */}
                            <div style={{display:"flex",gap:5,marginBottom:5}}>
                              {[
                                                                                                {l:"RSI", v:rsiV!=null?rsiV.toFixed(0):"-",
                                  c:rsiV==null?C.ash:rsiColor,
                                  // 🔧 موحَّد مع باقي البطاقة: عتبة 75 (لا 70) لذروة الشراء + حماية null
                                  s:rsiV==null?"لا بيانات":
                                    rsiV>85?"ذروة شراء شديدة ⚠":
                                    rsiV>=75?"ذروة شراء ⚠":
                                    rsiV<20?"ذروة بيع شديدة":
                                    rsiV<30?"ذروة بيع":
                                    rsiV>55?"محايد قوي":
                                    rsiV>45?"محايد":"ضعيف"},
                                {l:"MACD", v:macdH!=null?(macdH>0?"+":"")+macdH.toFixed(3):"-",
                                  c:macdH==null?C.ash:macdColor,
                                  s:macdH==null?"لا بيانات":macdH>0?"إيجابي":"سلبي"},
                                                                {l:"ADX", v:adxV!=null?adxV:"-",
                                  c:adxV==null?C.ash:adxColor,
                                  // 🔧 إصلاح: إضافة الاتجاه لـ "اتجاه نشط" أيضاً + حماية null
                                  s:adxV==null?"لا بيانات":
                                    adxV>35?"اتجاه قوي "+((adxBull?"↑":"↓")):adxV>25?"اتجاه نشط "+((adxBull?"↑":"↓")):adxV>15?"اتجاه ضعيف":"عرضي"},
                              ].map(function(it,i){

                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                                                   <div style={{fontSize:7,color:C.ash,marginBottom:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                                      {it.l}
                                      <Tooltip termKey={it.l} size="small"/>
                                    </div>     
                                    <div style={{fontSize:14,fontWeight:900,color:it.c,lineHeight:1}}>{it.v}</div>
                                    <div style={{fontSize:7,color:C.ash,marginTop:3,lineHeight:1.3}}>{it.s}</div>
                                  </div>
                                );
                              })}
                            </div>
                                                        {/* Row 2: CMF + OBV + VWAP */}
                            {/* 🔧 إصلاح: تحسين VWAP وكشف تباعد CMF/OBV */}
                            <div style={{display:"flex",gap:5,marginBottom:5}}>
                              {[
                                {l:"CMF", v:cmfV!=null?cmfV.toFixed(2):"-",
                                  c:cmfV==null?C.ash:(cmfV>0.05?C.mint:cmfV<-0.05?C.coral:C.amber),
                                  // 🔧 موحَّد مع بطاقة التحذير الكبيرة: عتبة 0.1 لكشف "تباعد" (لا 0.05) + حماية null
                                  s:cmfV==null?"لا بيانات":
                                    (cmfV>0.1 && obvUp===false)?"تباعد إيجابي ⚠":
                                    (cmfV<-0.1 && obvUp===true)?"تباعد سلبي ⚠":
                                    cmfV>0.15?"تدفق قوي":cmfV>0?"تدفق إيجابي":cmfV<-0.05?"ضغط بيع":"محايد"},
                                {l:"OBV", v:obvUp!=null?(obvUp?"صاعد ↑":"هابط ↓"):"-",
                                  c:obvUp==null?C.ash:(obvUp?C.mint:C.coral),
                                  // 🔧 موحَّد مع بطاقة التحذير الكبيرة: عتبة 0.1 + حماية null
                                  s:obvUp==null?"لا بيانات":
                                    (obvUp && cmfV!=null && cmfV<-0.1)?"يصعد مع ضغط بيع":
                                    (!obvUp && cmfV!=null && cmfV>0.1)?"يهبط مع تدفق إيجابي":
                                    obvUp?"تأكيد صعود":"تباعد سلبي"},
                                {l:"VWAP", v:vwapD!=null?vwapD.toFixed(1)+"%":"-",
                                  c:vwapD==null?C.ash:(vwapD>2?C.mint:vwapD<-2?C.coral:vwapD<-1?C.amber:vwapD>1?C.electric:C.amber),
                                  // 🆕 وصف أدق لـ VWAP + حماية null
                                  s:vwapD==null?"لا بيانات":
                                    vwapD>5?"فوق VWAP بقوة":
                                    vwapD>2?"فوق VWAP":
                                    vwapD>1?"يصعد فوق VWAP":
                                    vwapD>-1?"عند VWAP":
                                    vwapD>-3?"يهبط تحت VWAP":
                                    "تحت VWAP بقوة"},
                              ].map(function(it,i){

                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                          <div style={{fontSize:7,color:C.ash,marginBottom:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                                      {it.l}
                                      <Tooltip termKey={it.l} size="small"/>
                                    </div>
                                    <div style={{fontSize:12,fontWeight:800,color:it.c,lineHeight:1}}>{it.v}</div>
                                    <div style={{fontSize:7,color:C.ash,marginTop:3,lineHeight:1.3}}>{it.s}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Row 3: Wyckoff + Market Structure + Macro */}
                            {(wyPh||msLbl||macroE)&&(
                              <div style={{
                                background:C.layer2,border:"1px solid "+C.edge,
                                borderRadius:10,padding:"8px 10px",
                                display:"flex",gap:8,alignItems:"flex-start",
                              }}>
                                                                {wyPh&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2,display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                                      وايكوف
                                      <Tooltip termKey="Wyckoff" size="small"/>
                                    </div>
                                    <div style={{fontSize:10,fontWeight:700,color:C.teal,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wyPh}</div>
                                  </div>
                                )}
                                                                {msLbl&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2,display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                                      الهيكل
                                      <Tooltip termKey="BOS" size="small"/>
                                    </div>
                                    <div style={{fontSize:9,fontWeight:700,color:ex.bosBull?C.mint:C.coral,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msLbl}</div>
                                  </div>
                                )}
                                {macroE&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2}}>الاقتصاد</div>
                                    <div style={{fontSize:9,fontWeight:700,
                                      color:macroE==="إيجابي"?C.mint:macroE==="سلبي"?C.coral:C.amber,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
                                    }}>{macroE} {macroS!=null?"("+macroS+"/20)":""}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* زر ١١ طبقة + Progressive Disclosure */}
                      {!selected&&(
                        <div style={{
                          marginTop:8,display:"flex",alignItems:"center",
                          justifyContent:"space-between",
                          paddingTop:8,borderTop:"1px solid rgba(255,255,255,.04)",
                        }}>
                          {discovered.indexOf(stk.sym) !== -1
                            ? (
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:10,color:C.mint}}>✓</span>
                                <span style={{fontSize:8,color:C.mint,fontWeight:600}}>تم تحليله</span>
                              </div>
                            ) : (
                              <span style={{fontSize:8,color:C.smoke}}>اضغط للتفاصيل</span>
                            )
                          }
                                                    <button
                            onClick={function(e){
                              e.stopPropagation();
                              haptic.strong();
                              onFullAnalysis(stk.sym);
                            }}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              background:"linear-gradient(135deg," + health.sigC + "20," + health.sigC + "0a)",
                              border:"1px solid " + health.sigC + "40",
                              borderRadius:8,padding:"5px 12px",cursor:"pointer",
                              fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:700,
                              color:health.sigC,
                            }}>
                            <span>🔬</span>
                            <span>١١ طبقة</span>
                          </button>
                        </div>
                      )}

                      {/* Progressive Disclosure hint -- يظهر فقط على البطاقات المغلقة */}
                      {!selected&&(
                        <div style={{
                          display:"flex",alignItems:"center",justifyContent:"center",
                          gap:4,paddingTop:6,marginTop:2,
                          borderTop:"1px solid rgba(255,255,255,.04)",
                        }}>
                          <div style={{display:"flex",gap:3}}>
                            {[0,1,2].map(function(i){
                              return(
                                <div key={i} style={{
                                  width:4,height:4,borderRadius:"50%",
                                  background: i===1 ? health.sigC : health.sigC+"44",
                                  animation:"pulse " + (1.5+i*0.3) + "s ease-in-out infinite",
                                  animationDelay: i*0.2 + "s",
                                }}/>
                              );
                            })}
                          </div>
                          <span style={{fontSize:8,color:C.smoke}}>اضغط لعرض التحليل</span>
                        </div>
                      )}
                    </div>

                    {/* ─ لوحة التفاصيل المُبسَّطة ─ */}
                    {selected&&(
                      <div style={{
                        borderTop:"1px solid " + health.sigC + "33",
                        animation:"expandDown .3s cubic-bezier(.16,1,.3,1) both",
                      }}>
                        {/* زر الطي -- في الأعلى لراحة اليد الواحدة */}
                                                <button
                          onClick={function(e){
                            e.stopPropagation();
                            onCardClick(stk.sym, isRare);
                          }}

                          style={{
                            width:"100%",padding:"8px",
                            background:"rgba(255,255,255,.03)",
                            border:"none",
                            borderBottom:"1px solid rgba(255,255,255,.05)",
                            cursor:"pointer",
                            display:"flex",alignItems:"center",
                            justifyContent:"center",gap:6,
                            fontFamily:"Cairo,sans-serif",
                          }}>
                          <div style={{
                            width:32,height:3,borderRadius:2,
                            background:C.ash,
                          }}/>
                          <span style={{fontSize:8,color:C.smoke}}>اضغط للطي</span>
                        </button>
                        <div style={{padding:"14px 16px"}}>

                        {/* ══ لحظة "فرصة نادرة" -- تظهر فقط للدرجات العالية ══ */}
                        {isRare&&selected&&(
                          <div style={{
                            marginBottom:12,
                            background:"linear-gradient(135deg,rgba(212,168,67,.18),rgba(212,168,67,.08))",
                            border:"1px solid " + C.gold + "55",
                            borderRadius:14,padding:"12px 14px",
                            animation:"rarePop .55s cubic-bezier(.16,1,.3,1) both",
                            display:"flex",alignItems:"center",gap:10,
                          }}>
                            <div style={{fontSize:24,flexShrink:0}}>⭐</div>
                            <div>
                              <div style={{fontSize:12,fontWeight:900,color:C.gold,marginBottom:2}}>
                                فرصة نادرة -- درجة {health.score}/100
                              </div>
                              <div style={{fontSize:10,color:C.mist,lineHeight:1.5}}>
                                {globalRank === 1 
                                  ? "هذا السهم الأول في السوق -- الإشارة استثنائية"
                                  : "هذا السهم في أعلى " + Math.min(99, Math.round((1-globalRank/(allData&&allData.length?allData.length:1))*100)) + "% من السوق -- الإشارة استثنائية"
                                }
                              </div>
                            </div>
                          </div>
                        )}


                        {/* ══ الملخص الثلاثي -- القرار · السبب · التحذير ══ */}
                        <div style={{
                          background:`linear-gradient(135deg,${health.sigC}10,${health.sigC}06)`,
                          border:`1px solid ${health.sigC}30`,
                          borderRadius:14,padding:"12px 14px",marginBottom:12,
                        }}>
                                                   {/* السطر ١ -- القرار + Grade Enhanced */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            {/* signal badge */}
                            <div style={{
                              background:health.sigC+"22",border:`1px solid ${health.sigC}44`,
                              borderRadius:8,padding:"4px 12px",
                              fontSize:12,fontWeight:800,color:health.sigC,
                            }}>{health.sig}</div>
                            
                            {/* Grade Enhanced -- يستخدم gradeLabel + gradeColor */}
                            {(function(){
                              var gColor = health.gradeColor || health.sigC;
                              var gLabel = health.gradeLabel || scoreWord(health.score);
                              return(
                                <div style={{
                                  display:"flex",alignItems:"center",gap:5,
                                  background:gColor + "15",
                                  border:"1px solid " + gColor + "33",
                                  borderRadius:8,padding:"4px 10px",
                                }}>
                                  {/* الحرف */}
                                  <span style={{
                                    fontSize:11,fontWeight:900,color:gColor,
                                    background:gColor + "22",
                                    padding:"1px 6px",borderRadius:4,
                                    lineHeight:1,
                                  }}>{health.grade}</span>
                                  {/* الوصف العربي */}
                                  <span style={{
                                    fontSize:11,fontWeight:700,color:gColor,
                                  }}>{gLabel}</span>
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Grade Description -- وصف تفصيلي */}
                          {health.gradeDescription && (
                            <div style={{
                              background:"rgba(255,255,255,.03)",
                              border:"1px solid rgba(255,255,255,.06)",
                              borderRadius:8,padding:"5px 10px",
                              marginBottom:8,
                              display:"flex",alignItems:"center",gap:6,
                            }}>
                              <span style={{fontSize:10}}>📊</span>
                              <span style={{
                                fontSize:9,color:C.mist,lineHeight:1.4,
                              }}>{health.gradeDescription}</span>
                            </div>
                          )}

                          {/* السطر ٢ -- السبب بعربي بسيط */}
                          {/* 🎯 معايرة علمية: 65/55/45 */}
                          <div style={{fontSize:11,color:C.mist,lineHeight:1.6,marginBottom:8}}>
                            {health.score>=65
                              ? `السيولة والزخم يدعمان الصعود -- الحجم أعلى من المعدل بـ ${Math.round(((health.extras&&health.extras.vr)||1)*100-100)}%`
                              : health.score>=55
                              ? "السهم في مرحلة تجميع -- انتظر تأكيد كسر المقاومة بحجم عالٍ"
                              : health.score>=45
                              ? "حركة السهم متذبذبة -- لا توجد إشارة واضحة حالياً"
                              : "ضغط بيعي مرتفع -- السيولة الذكية تخرج من السهم"}
                          </div>
                          {/* السطر ٣ -- التحذير إن وُجد */}
                                                    {/* السطر ٣ -- التحذير إن وُجد */}
                          {/* 🎯 معايرة: عتبة 65 بدلاً من 75 */}
                          {health.score<65&&(
                            <div style={{
                              display:"flex",alignItems:"center",gap:6,
                              background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",
                              borderRadius:8,padding:"5px 10px",
                            }}>
                              <span style={{fontSize:11}}>⚠</span>
                              <span style={{fontSize:10,color:C.amber}}>
                                {health.score<45
                                  ? "لا تدخل -- انتظر حتى تتحسن قراءة السيولة"
                                  : "تحقق من حجم التداول قبل الدخول"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ══ الأرقام الأربعة -- بأسماء عربية بسيطة ══ */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                          {[
                            {
                              l:"قوة السيولة",
                              desc:"هل المال يدخل أم يخرج؟",
                              v:(health.layers&&health.layers.L9)||0,
                              c:(health.layers&&health.layers.L9||0)>=70?C.mint:(health.layers&&health.layers.L9||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"ثقة الاحتمالية",
                              desc:"نسبة نجاح الإشارة رياضياً",
                              v:(health.layers&&health.layers.L7)||0,
                              c:(health.layers&&health.layers.L7||0)>=70?C.mint:(health.layers&&health.layers.L7||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"هيكل الحركة",
                              desc:"هل النمط يشبه الصعود؟",
                              v:(health.layers&&health.layers.L1)||0,
                              c:(health.layers&&health.layers.L1||0)>=70?C.mint:(health.layers&&health.layers.L1||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"جدوى الصفقة",
                              desc:"هل العائد يستحق المخاطرة؟",
                              v:(health.layers&&health.layers.L6)||0,
                              c:(health.layers&&health.layers.L6||0)>=70?C.mint:(health.layers&&health.layers.L6||0)>=50?C.amber:C.coral,
                            },
                          ].map(ax=>(
                            <div key={ax.l} style={{
                              background:C.layer3,borderRadius:12,padding:"10px 12px",
                              border:"1px solid " + ax.c + "20",
                            }}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                                <div>
                                  <div style={{fontSize:10,fontWeight:700,color:C.snow}}>{ax.l}</div>
                                  <div style={{fontSize:8,color:C.smoke,marginTop:1}}>{ax.desc}</div>
                                </div>
                                <div style={{textAlign:"left"}}>
                                  <div style={{fontSize:18,fontWeight:900,color:ax.c,lineHeight:1}}>{ax.v}</div>
                                  <div style={{fontSize:7,color:ax.c,fontWeight:700,marginTop:2}}>
                                    {ax.v>=75?"قوي":ax.v>=55?"معتدل":ax.v>=35?"ضعيف":"متدنٍ"}
                                  </div>
                                </div>
                              </div>
                              <div style={{height:3,background:C.ash,borderRadius:2,overflow:"hidden"}}>
                                <div style={{
                                  height:"100%",
                                  width:ax.v+"%",
                                  background:"linear-gradient(90deg," + ax.c + "80," + ax.c + ")",
                                  borderRadius:2,
                                  transition:"width .8s cubic-bezier(.4,0,.2,1)",
                                }}/>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ══ زر التحليل الكامل -- بارز دائماً ══ */}
                                                <button
                          onClick={e=>{ e.stopPropagation(); haptic.strong(); onFullAnalysis(stk.sym); }}

                          style={{
                            width:"100%",padding:"13px",borderRadius:12,cursor:"pointer",
                            fontFamily:"Cairo,sans-serif",fontSize:13,fontWeight:800,
                            letterSpacing:".3px",
                            background:"linear-gradient(135deg," + health.sigC + "28," + health.sigC + "15)",
                            border:"1px solid " + health.sigC + "50",
                            color:health.sigC,
                            boxShadow:"0 4px 20px " + health.sigC + "25",
                            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                          }}>
                          <span>🔬</span>
                          <span>التحليل الكامل -- ١١ طبقة</span>
                          <span style={{fontSize:10,opacity:.7}}>←</span>
                        </button>
                        </div>{/* نهاية div padding */}
                      </div>
                    )}
                  </div>
                </div>
              );
              }
