'use client';
import React from 'react';
import Tooltip from '../Tooltip';
import { LayerIcon, C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';
import { STOCKS_LIVE as STOCKS } from '../../constants/stocksData';

export default function FullAnalysisModal({ sym, onClose, allData, liveStocks, haptic }) {
  const fullAnalysis = sym;
  if(!fullAnalysis) return null;
  const fd = allData.find(d=>d.stk.sym===fullAnalysis);
  if(!fd) return null;
  const {stk, bars, health} = fd;
  const up = stk.ch>=0;
  const pC = up?C.mint:C.coral;

  const {L1=0,L2=0,L3=0,L4=0,L5=0,L6=0,L7=0,L8=0,L9=0} = health.layers || {};
  const ex = health.extras || {};

  const lc = v => v>=70?C.mint:v>=50?C.amber:C.coral;

        // أوصاف مفهومة -- بدون مصطلحات تقنية
        const wyDesc = ex.spring&&ex.sos
          ? "نمط تجميع قوي -- المال الذكي يشتري على الانخفاضات ✅"
          : ex.upth
          ? "تحذير: الكسر الوهمي -- ارتفع ثم أغلق للأسفل ⚠"
          : ex.harm>2
          ? "تجميع نشط -- الحجم يرتفع مع الصعود"
          : "لا نمط واضح -- حركة عشوائية";

        const rscRank  = [...liveStocks].sort((a,b)=>b.ch-a.ch).findIndex(x=>x.sym===stk.sym)+1;
        const sectorPeersModal = STOCKS.filter(function(x){ return x.sec===stk.sec && x.sym!==stk.sym; });
        const sectorAvgChModal = sectorPeersModal.length>0
          ? (sectorPeersModal.reduce(function(s,x){ return s+x.ch; },0)/sectorPeersModal.length).toFixed(2)
          : "0.00";
        const sectorRelModal   = (stk.ch - parseFloat(sectorAvgChModal)).toFixed(2);
        const rscDesc = `رتبة ${rscRank} من ${STOCKS.length} في السوق · قطاع ${stk.sec} متوسطه ${sectorAvgChModal}% · السهم ${parseFloat(sectorRelModal)>=0?"يتفوق":"يتأخر"} عن قطاعه بـ ${Math.abs(parseFloat(sectorRelModal)).toFixed(1)}%`;

        const triDesc  = ex.triOk===3
          ? `ثلاثة مؤشرات متوافقة -- ${ex.adxV>40?"اتجاه قوي جداً ✅":"اتجاه مؤكد ✅"}`
          : ex.triOk===2
          ? "مؤشران من ثلاثة -- إشارة جزئية، انتظر تأكيداً"
          : "المؤشرات متضاربة -- لا توجد إشارة واضحة ⚠";

        const kelAdj   = (ex.kelly||0)*.5;
        const kelDesc  = kelAdj>=.08
          ? `نسبة الدخول المثلى: ${(kelAdj*100).toFixed(1)}% من المحفظة -- الصفقة مبررة رياضياً ✅`
          : `نسبة الدخول: ${(kelAdj*100).toFixed(1)}% -- صغيرة جداً، المخاطرة أكبر من العائد ❌`;

                        // ✨ Bayesian Prior - متوسط الطبقات الأخرى (ليس شاملاً L7)
        const bayPrior = Math.round((L1 + L2 + L3 + L4 + L5 + L6) / 6);
        // ✨ Bayesian Posterior - مع سقف 95% (في Bayesian لا يوجد 100% يقين!)
        // 100% posterior يعني يقين مطلق - مستحيل رياضياً
        const bayPosterior = Math.min(95, Math.max(5, L7));
        const bayDelta = bayPosterior - bayPrior;
        const bayDesc  = `الاحتمالية الأولية: ${bayPrior}% ← بعد تحليل الحجم والاتجاه: ${bayPosterior}% (${bayDelta >= 0 ? "تحسّن +" : "تراجع "}${Math.abs(bayDelta)}%)`;

        const radarGrade = L8>=80?"S":L8>=70?"A":L8>=60?"B":L8>=50?"C":"D";
        const radarColor = L8>=75?C.mint:L8>=60?C.amber:L8>=45?C.teal:C.coral;
        const radarDesc  = `مجموع نقاط الفرصة: ${L8}/100 -- تصنيف ${radarGrade} ${L8>=75?"✅":L8>=50?"⚠":"❌"}`;


        const liqType  = L9>=75&&up?"مؤسسي":L9>=55&&up?"جيد":stk.ch<-1.5&&ex.vr>1.2?"تصريف":"محايد";
        const liqColor = liqType==="مؤسسي"?C.electric:liqType==="جيد"?C.mint:liqType==="تصريف"?C.coral:C.smoke;
        const liqDesc  = liqType==="مؤسسي"
          ? `حجم التداول أعلى بـ ${Math.round(((ex.vr||1)-1)*100)}% -- المال الكبير يدخل ✅`
          : liqType==="جيد"
          ? `سيولة إيجابية -- الحجم فوق المعدل بـ ${Math.round(((ex.vr||1)-1)*100)}%`

          : liqType==="تصريف"
          ? `⚠ ضغط بيعي -- حجم عالٍ مع هبوط السعر`
          : `سيولة عادية -- لا توجد حركة مؤسسية واضحة`;

        const erDesc   = ex.harm>2
          ? `توافق جيد: ${ex.harm} شمعة حجم+حركة، تعارض: ${ex.div} ✅`
          : `ضعيف: الحجم لا يدعم الحركة (تعارض: ${ex.div})`;

        const entDesc  = L3>=70
          ? `الحركة منظمة ومتجهة -- مناسب للتحليل`
          : `حركة فوضوية -- المؤشرات أقل موثوقية ⚠`;

        // الطبقات -- بأوصاف مفهومة وأوزان
        // الأوزان الفعلية المستخدمة (من النظام التكيّفي)
        const W = health.weights || {
          L9:0.26,L1:0.22,L4:0.16,L5:0.12,
          L7:0.09,L8:0.07,L6:0.04,L2:0.03,L3:0.01,
        };

        const regimeLabel = health.regime==="bull" ? "سوق صاعد 🚀"
                          : health.regime==="bear" ? "سوق هابط 📉"
                          : "سوق متذبذب ⚖️";
        const regimeColor = health.regime==="bull" ? C.mint
                          : health.regime==="bear" ? C.coral
                          : C.amber;
        const regimeDesc  = health.regime==="bull"
          ? "الأوزان مُحسَّنة للزخم النسبي والسيولة (Jegadeesh & Titman)"
          : health.regime==="bear"
          ? "الأوزان مُحسَّنة للسيولة الدفاعية (Amihud 2002)"
          : "الأوزان مُحسَّنة للفلاتر والبيئة الغامضة (Lo 2004)";

// ✨ Tooltip Helper - Performance Fix (one map, not 9 conditions)
const TOOLTIP_KEYS = {
  'سيولة': 'السيولة',
  'هيكل': 'الهيكل',
  'احتمالية': 'Softmax',
  'جدوى': 'Half-Kelly',
  'مؤشرات': 'RSI',
  'الفرصة': 'Wyckoff',
  'الحجم': 'OBV',
  'انتظام': 'ATR',
};

function getTooltipKey(title) {
  for (var key in TOOLTIP_KEYS) {
    if (title.indexOf(key) !== -1) return TOOLTIP_KEYS[key];
  }
  return 'BOS';
}
        // ✨ L1-L9 يُقتطع منها 10% لـL10 و20% لـL11 -- نعرض الوزن الفعلي لا الأصلي
        const _wAdj = 0.72;

        const layers = [
          {n:"٩", title:"قوة السيولة",       score:L9, color:liqColor, weight:Math.round(W.L9*100*_wAdj), desc:liqDesc,   icon:"💧", id:"L9", simple:"هل المال يدخل أم يخرج؟"},
          {n:"١١", title:"عوامل الأداء المُثبتة", score:(ex.L11??50), color:lc(ex.L11??50), weight:20, desc:(ex.l11Detail||"زخم ١٢ شهراً · جودة · تدنّي التقلّب"), icon:"🎓", id:"L11", simple:"عوامل أثبتتها الدراسات العالمية"},
          {n:"١٠", title:"كفاءة السيولة", score:(ex.L10??50), color:lc(ex.L10??50), weight:8, desc:"مقياس أميهود -- أثر التداول على السعر", icon:"🌊", id:"L10", simple:"هل يتحرك السعر بسهولة؟"},
          {n:"١", title:"هيكل الحركة",       score:L1, color:lc(L1),  weight:Math.round(W.L1*100*_wAdj), desc:wyDesc,    icon:"🏗", id:"L1", simple:"هل النمط يشبه الصعود؟"},
          {n:"٤", title:"أداء مقارنة بالسوق",score:L4, color:lc(L4),  weight:Math.round(W.L4*100*_wAdj), desc:rscDesc,   icon:"💪", id:"L4", simple:"هل السهم يتفوق على السوق؟"},
          {n:"٥", title:"تأكيد المؤشرات",    score:L5, color:lc(L5),  weight:Math.round(W.L5*100*_wAdj), desc:triDesc,   icon:"🔗", id:"L5", simple:"هل ٣ مؤشرات تتفق؟"},
          {n:"٧", title:"ثقة الاحتمالية",    score:L7, color:lc(L7),  weight:Math.round(W.L7*100*_wAdj), desc:bayDesc,   icon:"🧮", simple:"نسبة نجاح الإشارة رياضياً"},
          {n:"٨", title:"نقاط الفرصة",       score:L8, color:lc(L8),  weight:Math.round(W.L8*100*_wAdj), desc:radarDesc, icon:"🎯", id:"L8", simple:"تقييم جوهري مستقل"},
          {n:"٦", title:"جدوى الصفقة",       score:L6, color:lc(L6),  weight:Math.round(W.L6*100*_wAdj), desc:kelDesc,   icon:"📐", simple:"هل العائد يستحق المخاطرة؟"},
          {n:"٢", title:"توافق الحجم والحركة",score:L2,color:lc(L2),  weight:Math.round(W.L2*100*_wAdj), desc:erDesc,    icon:"⚖️", id:"L2", simple:"هل الحجم يدعم الاتجاه؟"},
          {n:"٣", title:"انتظام الحركة",     score:L3, color:lc(L3),  weight:Math.round(W.L3*100*_wAdj), desc:entDesc,   icon:"📊", simple:"هل الحركة منظمة أم فوضوية؟"},
        ];

        // النتيجة النهائية
        const finalScore = health.score;
        const finalGrade = health.grade;
        const finalColor = health.sigC;

        // ملخص القرار الثلاثي
        // 🎯 معايرة علمية: 65/55/45
        const decisionText = finalScore>=65
          ? "السيولة والزخم يدعمان الدخول"
          : finalScore>=55
          ? "إشارة إيجابية -- انتظر تأكيد الحجم"
          : finalScore>=45
          ? "لا توجد إشارة واضحة حالياً"
          : "ضغط بيعي -- تجنّب الدخول";
        const warningText = finalScore<65
          ? finalScore<45 ? "ابتعد عن هذا السهم الآن" : "تحقق من الحجم قبل الدخول"
          : null;

        return(
          <div style={{
            position:"fixed",inset:0,zIndex:200,
            background:"rgba(6,8,15,.88)",
            backdropFilter:"blur(14px)",
            WebkitBackdropFilter:"blur(14px)",
            display:"flex",alignItems:"flex-end",justifyContent:"center",
            animation:"fadeIn .25s ease both",
}} onClick={()=>{ haptic.tap(); onClose(); }}>
            {/* الدرج المنزلق من الأسفل */}
            <div
              onClick={e=>e.stopPropagation()}
              style={{
                width:"100%",maxWidth:430,
                background:"linear-gradient(180deg," + C.layer2 + " 0%," + C.deep + " 100%)",
                borderRadius:"24px 24px 0 0",
                border:"1px solid " + C.line,
                borderBottom:"none",
                maxHeight:"78vh",
                paddingBottom:80,
                display:"flex",flexDirection:"column",
                boxShadow:"0 -24px 64px rgba(0,0,0,.8), inset 0 1px 0 " + C.layer3,
                animation:"slideUp .38s cubic-bezier(.16,1,.3,1) both",
                flexShrink:0,
              }}>

              {/* ── مقبض السحب + زر الإغلاق السريع ── */}
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 16px 0",
              }}>
                                <button
                  onClick={()=>{ haptic.tap(); onClose(); }}
                  style={{
                    width:44,height:44,borderRadius:12,border:"1px solid " + C.line,
                    background:C.layer3,color:C.mist,fontSize:18,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>✕</button>
                <div style={{width:40,height:4,borderRadius:2,background:C.ash}}/>
                <div style={{width:44,height:44}}/>{/* spacer */}
              </div>

              {/* ── رأس اللوحة ── */}
              <div style={{
                padding:"14px 20px 14px",
                borderBottom:`1px solid ${C.line}`,
                display:"flex",alignItems:"center",justifyContent:"space-between",
                flexShrink:0,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* حلقة النتيجة النهائية */}
                  <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                    <svg width={52} height={52} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                      <circle cx={26} cy={26} r={21} fill="none" stroke={C.ash} strokeWidth={4} strokeOpacity={.2}/>
                      <circle cx={26} cy={26} r={21} fill="none" stroke={finalColor} strokeWidth={4}
                        strokeDasharray={2*Math.PI*21}
                        strokeDashoffset={2*Math.PI*21*(1-finalScore/100)}
                        strokeLinecap="round"
                        style={{filter:"drop-shadow(0 0 5px " + finalColor + "aa)",transition:"stroke-dashoffset 1s ease"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:14,fontWeight:900,color:finalColor,lineHeight:1}}>{finalScore}</div>
                      <div style={{fontSize:6,color:C.smoke,marginTop:1}}>{finalGrade}</div>
                    </div>
                  </div>
                  <div>
                    <div className="glow-white" style={{fontSize:16,fontWeight:900,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{stk.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                      <span style={{
                        fontSize:9,fontWeight:700,color:health.sigC,
                        background:health.sigC+"18",border:"1px solid " + health.sigC + "33",
                        padding:"1px 7px",borderRadius:5,
                      }}>{health.sig}</span>
                      <span style={{fontSize:10,fontWeight:700,color:pC,direction:"ltr"}}>
                        {up?"+":""}{stk.ch.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── العنوان ── */}
              <div style={{
                padding:"12px 20px 8px",
                display:"flex",alignItems:"center",gap:8,flexShrink:0,
              }}>
                <div style={{width:3,height:16,background:finalColor,borderRadius:2}}/>
<span style={{fontSize:12,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>التحليل الكامل -- ١١ طبقة</span>
                <div style={{
                  marginRight:"auto",background:finalColor+"18",
                  border:`1px solid ${finalColor}33`,borderRadius:8,padding:"2px 8px",
                }}>
                  <span style={{fontSize:9,fontWeight:700,color:finalColor}}>نتيجة موحّدة: {finalScore} ({finalGrade})</span>
                </div>
              </div>

              {/* ── المحتوى القابل للتمرير ── */}
              <div style={{overflowY:"auto",padding:"4px 16px 32px",flex:1}}>

                {/* ══ بطاقة النظام السوقي ══ */}
                <div style={{
                  marginBottom:10,
                  background:"linear-gradient(135deg,"+regimeColor+"10,"+regimeColor+"05)",
                  border:"1px solid "+regimeColor+"35",
                  borderRadius:12,padding:"10px 14px",
                  display:"flex",alignItems:"center",gap:10,
                }}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:10,fontWeight:800,color:regimeColor}}>{regimeLabel}</span>
                      <div style={{background:regimeColor+"20",border:"1px solid "+regimeColor+"40",borderRadius:5,padding:"1px 7px"}}>
                        <span style={{fontSize:7,fontWeight:700,color:regimeColor}}>الأوزان مُعدَّلة تلقائياً</span>
                      </div>
                    </div>
                    <div style={{fontSize:8,color:C.smoke,lineHeight:1.4}}>{regimeDesc}</div>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,background:"rgba(255,255,255,.04)",borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:13,fontWeight:900,color:regimeColor}}>{Math.round((ex.mktBreadth||0.5)*100)}%</div>
                    <div style={{fontSize:7,color:C.smoke}}>اتساع</div>
                  </div>
                </div>

                {/* الطبقات التسع -- مرتّبة حسب الأهمية */}
                {layers.map((ly,i)=>(
                  <div key={ly.n} style={{
                    marginBottom:10,
                    background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
                    borderRadius:16,padding:"14px 14px 12px",
                    border:`1px solid ${ly.color}${i<2?"44":"22"}`,
                    boxShadow: i<2
                      ? `inset 0 1px 0 ${C.layer3}, 0 4px 20px ${ly.color}18`
                      : `inset 0 1px 0 ${C.layer3}`,
                    animation:`springIn .4s cubic-bezier(.16,1,.3,1) ${i*.05}s both`,
                    position:"relative",overflow:"hidden",
                  }}>
                    {/* شريط الترتيب للطبقتين الأهم */}
                    {i<2&&<div style={{
                      position:"absolute",top:0,right:0,
                      background:`linear-gradient(135deg,${ly.color}33,${ly.color}11)`,
                      padding:"3px 10px 3px 16px",
                      borderRadius:"0 16px 0 12px",
                      fontSize:8,fontWeight:800,color:ly.color,
                      borderLeft:`1px solid ${ly.color}33`,
                      borderBottom:`1px solid ${ly.color}33`,
                    }}>
                      {i===0?"🏆 الأهم":"🥈 الثانية"}
                    </div>}

                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {/* أيقونة */}
                      <div style={{
                        width:40,height:40,borderRadius:12,flexShrink:0,
                        background:`${ly.color}18`,border:`1px solid ${ly.color}${i<2?"44":"33"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:16,
                        boxShadow: i<2 ? `0 4px 12px ${ly.color}33` : "none",
                      }}>
                        <LayerIcon id={ly.id} color={ly.color} size={20}/>
                      </div>

                      {/* المعلومات */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            {/* رقم الطبقة */}
                            <span style={{
                              fontSize:9,fontWeight:700,color:ly.color,
                              background:ly.color+"18",padding:"1px 6px",borderRadius:4,
                            }}>طبقة {ly.n}</span>
                                                        <span style={{fontSize:12,fontWeight:800,color:C.snow,display:"inline-flex",alignItems:"center",gap:3}}>
                              {ly.title}
   <Tooltip termKey={getTooltipKey(ly.title)} size="small"/>
                            </span>
                            <span style={{
                              fontSize:8,fontWeight:700,
                              color:ly.weight>=15?C.gold:ly.weight>=9?C.mist:C.smoke,
                              background:"rgba(255,255,255,.05)",
                              border:"1px solid rgba(255,255,255,.08)",
                              padding:"1px 5px",borderRadius:4,
                            }}>{ly.weight}%</span>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                            <span className="glow-white" style={{fontSize:22,fontWeight:900,color:ly.color,letterSpacing:"-1px",lineHeight:1}}>{ly.score}</span>
                            <span style={{fontSize:8,fontWeight:700,color:ly.color}}>
                              {ly.score>=75?"قوي":ly.score>=55?"معتدل":ly.score>=35?"ضعيف":"متدنٍ"}
                            </span>
                          </div>
                        </div>

                        {/* السؤال البسيط */}
                        <div style={{fontSize:9,color:C.smoke,marginBottom:5,fontStyle:"italic"}}>{ly.simple}</div>

                        {/* شريط التقدم */}
                        <div style={{position:"relative",marginBottom:5}}>
                          {/* شريط الخلفية */}
                          <div style={{height:5,background:C.ash+"44",borderRadius:3,overflow:"hidden"}}>
                            <div style={{
                              height:"100%",width:`${ly.score}%`,
                              background:`linear-gradient(90deg,${ly.color}70,${ly.color})`,
                              borderRadius:3,
                              boxShadow:`0 0 8px ${ly.color}66`,
                              transition:"width .9s cubic-bezier(.4,0,.2,1)",
                            }}/>
                          </div>
                          {/* مؤشر الوزن النسبي */}
                          <div style={{
                            position:"absolute",top:0,left:`${Math.min(98,ly.weight*4)}%`, 
                            width:1.5,height:"100%",
                            background:C.smoke+"88",
                            borderRadius:1,
                          }}/>
                        </div>

                        {/* الوصف */}
                        <div style={{fontSize:9.5,color:C.mist,lineHeight:1.4}}>{ly.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* ══════════════════════════════════════════════════════
                    🤖 ABM INFO -- شفافية نظام التعلم الذكي
                    
                    يعرض من analysisEngine (الإصلاح 4):
                    • abmInfo.applied (هل التعلم مُفعَّل؟)
                    • abmInfo.originalScore / finalScore (التغيّر)
                    • abmInfo.meta (regime accuracy, boost, إلخ)
                ══════════════════════════════════════════════════════ */}
                {health.abmInfo && (function(){
                  var abm = health.abmInfo;
                  var isActive = abm.applied;
                  var meta = abm.meta;
                  var brandColor = isActive ? C.electric : C.smoke;
                  
                  return(
                    <div style={{
                      marginBottom:10,
                      background:"linear-gradient(135deg," + brandColor + "0a," + brandColor + "04)",
                      border:"1px solid " + brandColor + "28",
                      borderRadius:14,
                      overflow:"hidden",
                    }}>
                      {/* عنوان */}
                      <div style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        padding:"8px 14px",
                        background:brandColor + "12",
                        borderBottom:"1px solid " + brandColor + "18",
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:13}}>🤖</span>
                          <span style={{fontSize:10,fontWeight:800,color:brandColor,letterSpacing:".3px"}}>
                            نظام التعلم الذكي (ABM v2.1)
                          </span>
                        </div>
                        <div style={{
                          background:brandColor + "22",
                          border:"1px solid " + brandColor + "44",
                          borderRadius:5,padding:"1px 8px",
                        }}>
                          <span style={{fontSize:8,fontWeight:800,color:brandColor}}>
                            {isActive ? "✓ مُفعَّل" : "غير مُفعَّل"}
                          </span>
                        </div>
                      </div>
                      
                      {/* جسم البطاقة */}
                      <div style={{padding:"10px 14px"}}>
                        {!isActive ? (
                          // الحالة 1: ABM غير مُفعَّل
                          <div style={{
                            background:"rgba(255,255,255,.03)",
                            border:"1px solid rgba(255,255,255,.06)",
                            borderRadius:8,padding:"8px 12px",
                            display:"flex",alignItems:"center",gap:8,
                          }}>
                            <span style={{fontSize:14}}>📊</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,fontWeight:700,color:C.smoke,marginBottom:2}}>
                                لا توجد بيانات كافية للتعلم بعد
                              </div>
                              <div style={{fontSize:8,color:C.ash,lineHeight:1.4}}>
                                يحتاج ABM إلى 5+ صفقات سابقة لبدء التعلم. سيتفعّل تلقائياً مع مرور الوقت.
                              </div>
                            </div>
                          </div>
                        ) : (
                          // الحالة 2: ABM مُفعَّل ويعمل
                          <>
                            {/* التغيّر في Score */}
                            {abm.originalScore != null && abm.finalScore != null && (
                              <div style={{
                                background:"rgba(255,255,255,.03)",
                                border:"1px solid rgba(255,255,255,.06)",
                                borderRadius:10,padding:"8px 12px",
                                marginBottom:8,
                                display:"flex",alignItems:"center",gap:10,
                              }}>
                                {/* Score الأصلي */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:7,color:C.smoke,marginBottom:2}}>قبل التعلم</div>
                                  <div className="num" style={{
                                    fontSize:18,fontWeight:900,color:C.mist,lineHeight:1,
                                  }}>{abm.originalScore}</div>
                                </div>
                                
                                {/* السهم */}
                                <div style={{textAlign:"center"}}>
                                  <div style={{
                                    fontSize:14,fontWeight:900,
                                    color: abm.finalScore > abm.originalScore ? C.mint
                                         : abm.finalScore < abm.originalScore ? C.coral
                                         : C.smoke,
                                    lineHeight:1,
                                  }}>
                                    {abm.finalScore > abm.originalScore ? "↗" : abm.finalScore < abm.originalScore ? "↘" : "→"}
                                  </div>
                                  <div style={{
                                    fontSize:8,fontWeight:700,marginTop:2,
                                    color: abm.finalScore > abm.originalScore ? C.mint
                                         : abm.finalScore < abm.originalScore ? C.coral
                                         : C.smoke,
                                  }}>
                                    {abm.finalScore - abm.originalScore > 0 ? "+" : ""}{abm.finalScore - abm.originalScore}
                                  </div>
                                </div>
                                
                                {/* Score النهائي */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:7,color:brandColor,fontWeight:700,marginBottom:2}}>بعد التعلم</div>
                                  <div className="num" style={{
                                    fontSize:18,fontWeight:900,color:brandColor,lineHeight:1,
                                  }}>{abm.finalScore}</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Meta Info: Regime Accuracy + Boost + Sample Size */}
                            {meta && (
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                                {/* Regime Accuracy */}
                                {meta.regimeAcc != null && (
                                  <div style={{
                                    background:"rgba(255,255,255,.03)",
                                    border:"1px solid rgba(255,255,255,.06)",
                                    borderRadius:8,padding:"6px 8px",
                                    textAlign:"center",
                                  }}>
                                    <div style={{fontSize:7,color:C.smoke,marginBottom:2}}>دقة النظام</div>
                                    <div className="num" style={{
                                      fontSize:13,fontWeight:900,
                                      color: meta.regimeAcc >= 0.6 ? C.mint
                                           : meta.regimeAcc >= 0.45 ? C.amber
                                           : C.coral,
                                      lineHeight:1,
                                    }}>{Math.round(meta.regimeAcc * 100)}%</div>
                                    <div style={{fontSize:6,color:C.ash,marginTop:2}}>
                                      في {meta.currentRegime || "?"}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Regime Boost */}
                                {meta.regimeBoost != null && (
                                  <div style={{
                                    background:"rgba(255,255,255,.03)",
                                    border:"1px solid rgba(255,255,255,.06)",
                                    borderRadius:8,padding:"6px 8px",
                                    textAlign:"center",
                                  }}>
                                    <div style={{fontSize:7,color:C.smoke,marginBottom:2}}>Boost</div>
                                    <div className="num" style={{
                                      fontSize:13,fontWeight:900,
                                      color: meta.regimeBoost > 1.05 ? C.mint
                                           : meta.regimeBoost < 0.95 ? C.coral
                                           : C.smoke,
                                      lineHeight:1,
                                    }}>×{meta.regimeBoost.toFixed(2)}</div>
                                    <div style={{fontSize:6,color:C.ash,marginTop:2}}>
                                      {meta.regimeBoost > 1.05 ? "↑ ثقة" 
                                       : meta.regimeBoost < 0.95 ? "↓ حذر" 
                                       : "محايد"}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Sample Size */}
                                {meta.sampleSize != null && (
                                  <div style={{
                                    background:"rgba(255,255,255,.03)",
                                    border:"1px solid rgba(255,255,255,.06)",
                                    borderRadius:8,padding:"6px 8px",
                                    textAlign:"center",
                                  }}>
                                    <div style={{fontSize:7,color:C.smoke,marginBottom:2}}>عدد الصفقات</div>
                                    <div className="num" style={{
                                      fontSize:13,fontWeight:900,
                                      color: meta.sampleSize >= 20 ? C.mint
                                           : meta.sampleSize >= 10 ? C.amber
                                           : C.smoke,
                                      lineHeight:1,
                                    }}>{meta.sampleSize}</div>
                                    <div style={{fontSize:6,color:C.ash,marginTop:2}}>تاريخي</div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Regime Shift Warning */}
                            {meta && (meta.regimeShift || meta.improving) && (
                              <div style={{
                                marginTop:6,
                                background:meta.regimeShift ? "rgba(245,158,11,.08)" : "rgba(16,201,126,.08)",
                                border:"1px solid " + (meta.regimeShift ? "rgba(245,158,11,.25)" : "rgba(16,201,126,.25)"),
                                borderRadius:8,padding:"5px 10px",
                                display:"flex",alignItems:"center",gap:6,
                              }}>
                                <span style={{fontSize:10}}>
                                  {meta.regimeShift ? "⚠" : "📈"}
                                </span>
                                <span style={{
                                  fontSize:8,color:meta.regimeShift ? C.amber : C.mint,
                                  lineHeight:1.4,fontWeight:600,
                                }}>
                                  {meta.regimeShift 
                                    ? "تغيّر في السوق - النظام يقلّل ثقته في البيانات القديمة" 
                                    : "الأداء يتحسّن - النظام يزيد ثقته"}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}


                {/* ملخص الدمج */}
                <div style={{
                  marginTop:6,
                  background:`linear-gradient(135deg,${finalColor}12,${finalColor}06)`,
                  borderRadius:18,padding:"16px",
                  border:`1px solid ${finalColor}33`,
                  boxShadow:`0 8px 32px ${finalColor}18`,
                }}>
                  <div style={{fontSize:11,fontWeight:700,color:C.smoke,marginBottom:12,letterSpacing:".5px"}}>
                    محرك الدمج -- القرار الموحّد
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
                      <svg width={70} height={70} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                        <circle cx={35} cy={35} r={28} fill="none" stroke={C.ash} strokeWidth={5} strokeOpacity={.2}/>
                        <circle cx={35} cy={35} r={28} fill="none" stroke={finalColor} strokeWidth={5}
                          strokeDasharray={2*Math.PI*28}
                          strokeDashoffset={2*Math.PI*28*(1-finalScore/100)}
                          strokeLinecap="round"
                          style={{filter:`drop-shadow(0 0 8px ${finalColor}cc)`,transition:"stroke-dashoffset 1s ease"}}/>
                        <circle cx={35} cy={35} r={21} fill="none" stroke={finalColor} strokeWidth={1.5}
                          strokeDasharray={2*Math.PI*21}
                          strokeDashoffset={2*Math.PI*21*(1-finalScore/100)}
                          strokeLinecap="round" strokeOpacity={.3}/>
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                        <div style={{fontSize:20,fontWeight:900,color:finalColor,lineHeight:1}}>{finalScore}</div>
                        <div style={{fontSize:7,color:C.smoke,marginTop:1}}>من 100</div>
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{
                        fontSize:22,fontWeight:900,color:finalColor,
                        background:`linear-gradient(90deg,${finalColor},${finalColor}aa)`,
                        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                        marginBottom:4,
                      }}>تصنيف {finalGrade}</div>
                      <div style={{
                        display:"inline-flex",alignItems:"center",gap:5,
                        background:health.sigC+"18",border:`1px solid ${health.sigC}33`,
                        borderRadius:10,padding:"4px 12px",marginBottom:6,
                      }}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:health.sigC,
                          boxShadow:`0 0 6px ${health.sigC}`}}/>
                        <span style={{fontSize:12,fontWeight:700,color:health.sigC}}>{health.sig}</span>
                      </div>
                      <div style={{fontSize:10,color:C.mist}}>
                        الدرجة: <span style={{fontWeight:700,color:finalColor}}>{finalScore}</span>
                        {" · "}رادار: <span style={{fontWeight:700,color:radarColor}}>{L8}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        }
