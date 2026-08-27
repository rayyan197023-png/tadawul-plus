'use client';
/**
 * @module screens/more/FinanceTabs
 * @description تبويبات مالية: توزيعات، اكتتابات، صناديق، تقويم، كلي
 */
import { useState, useMemo, useEffect } from 'react';
import { STOCKS_LIVE as STOCKS } from '../../constants/stocksData';
import { ArcRing, C, DIVS, Ico, MiniLine, SectionHeader, Stars, MACRO } from './MoreShared';
import { DIV_STOCKS } from '../../constants/dividendStocks';
import { useDividendsList } from '../../hooks/useDividend';

function DividendsTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub;
  var setSub=tp.setSub;
  var stocksLive=tp.stocksLive;
  var rankIdx=tp.rankIdx;
  var setRankIdx=tp.setRankIdx;
  var rankSec=tp.rankSec;
  var setRankSec=tp.setRankSec;
  var commData=tp.commData;
  var commCat=tp.commCat;
  var setCommCat=tp.setCommCat;
  var fundTab=tp.fundTab;
  var setFundTab=tp.setFundTab;
  var ipoF=tp.ipoF;
  var setIpoF=tp.setIpoF;
  var calF=tp.calF;
  var setCalF=tp.setCalF;
  var divItem=tp.divItem;
  var setDivItem=tp.setDivItem;
  var divShares=tp.divShares;
  var setDivShares=tp.setDivShares;
  var divCost=tp.divCost;
  var setDivCost=tp.setDivCost;
  var snaps=tp.snaps;
  var setSnaps=tp.setSnaps;
  var editSnap=tp.editSnap;
  var setEditSnap=tp.setEditSnap;
  var snapTag=tp.snapTag;
  var setSnapTag=tp.setSnapTag;
  var fontSize=tp.fontSize;
  var setFontSize=tp.setFontSize;
  var notifSound=tp.notifSound;
  var setNotifSound=tp.setNotifSound;
  var homeConf=tp.homeConf;
  var setHomeConf=tp.setHomeConf;
  var rField=tp.rField;
  var rankItems=tp.rankItems;
  var secList=tp.secList;
  var commF=tp.commF;
  var catList=tp.catList;
  var fundsF=tp.fundsF;
  var iposF=tp.iposF;
  var eventsF=tp.eventsF;
  var cfmt=tp.cfmt;
  var commAgoStr=tp.commAgoStr;
  var fmtT=tp.fmtT;
  var BOX=tp.BOX;
  var SHD=tp.SHD;
  var SHD_ACTIVE=tp.SHD_ACTIVE;
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate;
  var rankTick=tp.rankTick;
  var divDateItems=divItem?[{l:"تاريخ الاستحقاق",v:divItem.exDate},{l:"تاريخ التوزيع",v:divItem.payDate}]:[];

  // ✨ جلب توزيعات الأسهم الـ44 (دفعات + cache)
  var divList = useDividendsList(DIV_STOCKS);
  var divItems = divList.items;
  var divLoading = divList.loading;

  // دالة مساعدة: تحويل بيانات sahmk لشكل العرض
  function buildDivCard(item) {
    var d = item.divData;
    var latest = (d.history && d.history[0]) || {};
    var perShare = latest.value || 0;
    var times = d.payments_last_year || 1;
    var freq = times >= 4 ? "ربعي" : times === 2 ? "نصف سنوي" : times === 1 ? "سنوي" : times + "x/سنة";
    // أيام متبقية للاستحقاق
    var daysLeft = null;
    if (latest.eligibility_date) {
      var diff = Math.ceil((new Date(latest.eligibility_date) - new Date()) / 86400000);
      daysLeft = diff > 0 ? diff : null;
    }
    return {
      sym: item.sym, name: item.name, sec: item.sec,
      perShare: perShare,
      yield: d.trailing_12m_yield || 0,
      annualDiv: d.trailing_12m_dividends || 0,
      times: times, freq: freq,
      price: d.current_price || 0,
      exDate: latest.eligibility_date || "--",
      payDate: latest.distribution_date || "--",
      daysLeft: daysLeft,
      upcoming: d.upcoming || [],
      history: (d.history || []).slice(0, 6).map(function(h){ return h.value; }).reverse(),
    };
  }

  return(
        <div style={{position:"relative",zIndex:1}}>
          
          {divItem&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.97)",zIndex:99,display:"flex",alignItems:"flex-end",touchAction:"none"}}>

              <div style={{
                background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",
                borderRadius:"24px 24px 0 0",
                width:"100%",padding:"24px 20px",
                border:"1px solid "+C.line,
                boxShadow:"0 -24px 64px rgba(0,0,0,.7), inset 0 1px 0 "+C.layer3,
                maxHeight:"92vh",overflowY:"scroll",
                paddingBottom:100,
                WebkitOverflowScrolling:"touch",
                overscrollBehavior:"contain",
              }}>

                <div style={{textAlign:"center",marginBottom:20,marginTop:10}}>

                  <div style={{fontSize:9,color:C.mint,fontWeight:700,letterSpacing:"2px",marginBottom:4}}>DIVIDENDS CALCULATOR</div>
                  <div className="glow-mint" style={{fontSize:18,fontWeight:900,color:C.snow}}>{divItem.name}</div>
                  <div style={{fontSize:10,color:C.smoke,marginTop:3}}>{divItem.freq} · عائد {(divItem.yield||0).toFixed(2)}% سنوي</div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.smoke,marginBottom:6,textAlign:"right"}}>عدد الأسهم التي تمتلكها</div>
                  <input value={divShares} onChange={function(e){setDivShares(e.target.value);}}
                    style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:12,padding:"13px",color:C.snow,fontSize:18,textAlign:"center",outline:"none",boxSizing:"border-box",fontFamily:"'IBM Plex Mono',monospace"}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:C.smoke,marginBottom:5,textAlign:"right"}}>سعر الشراء الأصلي (Yield on Cost)</div>
                  <input value={divCost} onChange={function(e){setDivCost(e.target.value);}} placeholder="اختياري"
                    style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:12,padding:"11px 14px",color:C.snow,fontSize:14,outline:"none",direction:"ltr",textAlign:"right",boxSizing:"border-box"}}/>
                  {(function(){
                    var cost=parseFloat(divCost);
                    if(!cost||cost<=0) return null;
                    var annD=divItem.annualDiv||0;
                    var yoc=(annD/cost*100).toFixed(2);
                    return(<div className="glow-mint" style={{fontSize:12,color:C.mint,fontWeight:700,marginTop:5,textAlign:"right"}}>Yield on Cost: <span className="m">{yoc}%</span></div>);
                  }())}
                </div>
                <div style={{background:C.mint+"08",border:"1px solid "+C.mint+"33",borderRadius:16,padding:"18px 16px",marginBottom:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:5}}>هذا التوزيع</div>
                      <div className="num-lg glow-mint" style={{fontSize:22,fontWeight:900,color:C.mint}}>{cfmt(divItem.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke,marginTop:2}}>ر.س / للسهم</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:5}}>إجمالي التوزيع</div>
                      <div className="num-lg glow-gold" style={{fontSize:22,fontWeight:900,color:C.gold}}>{cfmt((parseFloat(divShares)||0)*divItem.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke,marginTop:2}}>ر.س</div>
                    </div>
                  </div>
                  {(function(){
                    var shares=parseFloat(divShares)||0;
                    if(shares<=0) return null;
                    // التوزيع السنوي الكامل للسهم (من sahmk)
                    var annDPerShare=divItem.annualDiv||0;
                    var annD=shares*annDPerShare;          // توزيعات المستخدم السنوية
                    var spPrice=divItem.price||0;
                    if(!spPrice||spPrice<=0) return null;
                    // عائد التوزيع السنوي = السنوي ÷ السعر
                    var yr=annDPerShare/spPrice;
                    // DRIP -- رصيد بعد 3 سنوات بإعادة الاستثمار
                    var totalShares3=Math.round(shares*Math.pow(1+yr,3));
                    var newShares3=totalShares3-Math.round(shares);
                    var totalDiv3=parseFloat((annD*3).toFixed(2));
                    return(
                      <div style={{borderTop:"1px solid "+C.mint+"20",paddingTop:14}}>
                        <div style={{fontSize:9,color:C.mint,fontWeight:700,marginBottom:8,textAlign:"right"}}>DRIP -- إعادة استثمار التوزيعات · 3 سنوات</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                          <div style={{background:C.mint+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>توزيعات/سنة</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>{cfmt(annD)}</div>
                            <div style={{fontSize:7,color:C.smoke}}>ر.س</div>
                          </div>
                          <div style={{background:C.electric+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>إجمالي 3 سنوات</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.electric}}>{cfmt(totalDiv3)}</div>
                            <div style={{fontSize:7,color:C.smoke}}>ر.س</div>
                          </div>
                          <div style={{background:C.gold+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>أسهمك بعد 3 سنوات</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.gold}}>{totalShares3}</div>
                            <div style={{fontSize:7,color:C.mint}}>+{newShares3} سهم جديد</div>
                          </div>
                        </div>
                      </div>
                    );
                  }())}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {divDateItems.map(function(r){return(
                    <div key={r.l} style={{background:C.layer3,borderRadius:12,padding:"12px",textAlign:"center",border:"1px solid "+C.line}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:4}}>{r.l}</div>
                      <div className="m" style={{fontSize:12,fontWeight:700,color:C.mist,direction:"ltr"}}>{r.v}</div>
                    </div>
                  );})}
                </div>
                <button onClick={function(){setDivItem(null);setDivCost("");}} style={{
                  width:"100%",background:"linear-gradient(135deg,"+C.layer3+","+C.edge+")",
                  border:"1px solid "+C.line,color:C.smoke,
                  padding:"14px",borderRadius:14,fontSize:13,cursor:"pointer",
                  fontFamily:"Cairo,sans-serif",marginBottom:20,
                }}>إغلاق</button>
              </div>
            </div>
          )}
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {divLoading && (
              <div style={{textAlign:"center",padding:"8px",fontSize:10,color:C.smoke}}>
                جارٍ جلب التوزيعات... ({divItems.length}/{DIV_STOCKS.length})
              </div>
            )}
            {divItems.map(function(item,i){
              var div = buildDivCard(item);
              return(
              <div key={div.sym} className={"card-enter "+(div.daysLeft&&div.daysLeft<=5?"danger-pulse":div.daysLeft&&div.daysLeft<=20?"buy-glow":"")} style={{
                animationDelay:(i*0.06)+"s",
                background:BOX,
                border:"1px solid "+(div.daysLeft&&div.daysLeft<=10?C.mint+"55":C.line),
                borderRadius:20,overflow:"hidden",
                boxShadow:div.daysLeft&&div.daysLeft<=10?SHD_ACTIVE+C.mint+"18, 0 0 0 1px "+C.mint+"22":SHD,
              }}>
                {div.daysLeft&&div.daysLeft<=10&&<div style={{height:2,background:"linear-gradient(90deg,transparent,"+C.mint+",transparent)"}}/>}
                <div style={{padding:"14px 16px",background:"linear-gradient(90deg,"+C.mint+"06,transparent)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.snow,marginBottom:4}}>{div.name}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 8px",borderRadius:5,border:"1px solid "+C.line}}>{div.sec}</span>
                        <span style={{fontSize:9,color:C.mint,background:C.mint+"12",padding:"1px 8px",borderRadius:5,border:"1px solid "+C.mint+"25"}}>{div.freq}</span>
                        {div.daysLeft&&div.daysLeft<=10&&<span style={{fontSize:9,color:C.coral,background:C.coral+"15",padding:"1px 8px",borderRadius:5,display:"inline-flex",alignItems:"center",gap:3}}><Ico k="alert" color={C.coral} size={10}/>{div.daysLeft} يوم</span>}
                      </div>
                      {div.history.length>1&&(
                      <div style={{display:"flex",gap:3,alignItems:"flex-end",height:22,marginTop:10}}>
                        {(function(){
                          var mx2=Math.max.apply(null,div.history)||1;
                          return div.history.map(function(v,hi){
                            var h2=Math.max(4,Math.round((v/mx2)*22));
                            var isLast=hi===div.history.length-1;
                            return(<div key={hi} style={{width:14,height:h2,borderRadius:3,background:isLast?C.mint:C.mint+"55",boxShadow:isLast?"0 0 6px "+C.mint+"88":"none"}}/>);
                          });
                        }())}
                      </div>
                      )}
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div className="num-lg glow-mint" style={{fontSize:24,fontWeight:900,color:C.mint}}>{cfmt(div.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke}}>/ سهم</div>
                      <div style={{fontSize:10,fontWeight:700,color:C.teal,textAlign:"right",marginTop:3}}>عائد {div.yield.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
                <div style={{borderTop:"1px solid "+C.line+"22",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:16}}>
                    {[{l:"استحقاق",v:div.exDate},{l:"توزيع",v:div.payDate}].map(function(d){return(
                      <div key={d.l}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>{d.l}</div>
                        <div className="m" style={{fontSize:11,fontWeight:700,color:C.mist,direction:"ltr"}}>{d.v}</div>
                      </div>
                    );})}
                  </div>
                  <button onClick={function(){setDivItem(div);setDivShares("100");setDivCost("");}} style={{
                    background:"linear-gradient(135deg,"+C.mint+"22,"+C.mint+"11)",
                    border:"1px solid "+C.mint+"44",color:C.mint,
                    padding:"9px 16px",borderRadius:12,fontSize:11,cursor:"pointer",fontWeight:800,
                    boxShadow:"0 4px 12px "+C.mint+"22",
                  }}>احسب العائد</button>
                </div>
              </div>
            );})}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function MacroTab(props) {
  var tp=props.p?props.p:props;
  var BOX=tp.BOX, SHD=tp.SHD;
  var macroFilter=tp.macroFilter||"all", setMacroFilter=tp.setMacroFilter||function(){};

  var [macroData, setMacroData] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function(){
var CACHE_KEY = 'tdw_fred_macro_cache_v2';
    var CACHE_HOURS = 168; // 7 أيام
    
    function processFred(d){
      if(!d) return;
      var items = [];
      function build(key, label, period, desc, unit, color, cat){
        var hist = d[key+'History'];
        var val = d[key+'Price'];
        if(!Array.isArray(hist) || hist.length < 2 || typeof val !== 'number') return;
        var prev = hist[hist.length-2];
        items.push({
          id: key, label: label, val: Math.round(val*100)/100,
          prev: Math.round(prev*100)/100,
          unit: unit, period: period, desc: desc, color: color, cat: cat,
          trend: hist.slice(-5),
        });
      }
      
      // 🇸🇦 السعوديّة
      build('saudiGdp', 'الناتج المحلي السعودي', 'سنوي', 'GDP السعوديّ بالدولار', 'مليار $', '#10c97e', 'saudi');
      build('saudiCpi', 'مؤشّر الأسعار السعودي', 'شهري', 'CPI السعودي', '', '#22d3ee', 'saudi');
      build('saudiInflation', 'التضخّم السعودي', 'شهري', 'معدّل التضخّم السنوي', '%', '#f59e0b', 'saudi');
      build('saudiReserves', 'الاحتياطيات النقدية', 'شهري', 'احتياطيّات ساما', 'مليون $', '#d4a843', 'saudi');
      
      // 🇺🇸 العالميّة المؤثّرة
      build('cpi', 'CPI الأمريكي', 'شهري', 'مؤشّر أسعار المستهلك', '', '#f04f5a', 'us');
      build('coreCpi', 'Core CPI', 'شهري', 'CPI بدون طعام/طاقة', '', '#f04f5a', 'us');
      build('payrolls', 'الوظائف الأمريكية', 'شهري', 'Non-Farm Payrolls', 'ألف', '#10c97e', 'us');
      build('unrate', 'البطالة الأمريكية', 'شهري', 'معدّل البطالة %', '%', '#f59e0b', 'us');
      build('yieldGap', 'منحنى العائد', 'يومي', '10y - 2y · إشارة ركود', '%', '#06b6d4', 'us');
      
      setMacroData(items);
      setLoading(false);
    }
    
    try {
      var cached = localStorage.getItem(CACHE_KEY);
      if(cached) {
        var parsed = JSON.parse(cached);
        var ageHours = (Date.now() - parsed.savedAt) / (1000*60*60);
if(ageHours < CACHE_HOURS) {
  processFred(parsed.data);
  // إذا كان عندنا أقلّ من 9 مؤشّرات، اجلب جديداً
  if(macroData.length >= 9) return;
}
      }
    } catch(e){}
    
    fetch('/api/freddata').then(function(r){return r.ok?r.json():null;}).then(function(d){
      if(!d) { setLoading(false); return; }
      processFred(d);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, savedAt: Date.now() }));
      } catch(e){}
    }).catch(function(){ setLoading(false); });
  }, []);

  var filters=[
    {k:"all", l:"الكل"},
    {k:"saudi", l:"🇸🇦 السعودية"},
    {k:"us", l:"🇺🇸 العالميّة"},
  ];
  var filtered = macroFilter==="all" ? macroData : macroData.filter(function(m){return m.cat===macroFilter;});

  return(
    <div style={{position:"relative",zIndex:1}}>
      <div style={{padding:"10px 16px 6px",display:"flex",gap:6,overflowX:"auto",borderBottom:"1px solid "+C.line}}>
        {filters.map(function(f){return(
          <button key={f.k} onClick={function(){setMacroFilter(f.k);}}
            style={{padding:"6px 14px",borderRadius:16,border:"1px solid "+(macroFilter===f.k?C.teal+"66":C.line),background:macroFilter===f.k?"linear-gradient(135deg,"+C.teal+"22,"+C.teal+"11)":C.layer3,color:macroFilter===f.k?C.teal:C.smoke,fontSize:10,cursor:"pointer",fontWeight:macroFilter===f.k?700:400,whiteSpace:"nowrap"}}>
            {f.l}
          </button>
        );})}
      </div>
      {loading && (
        <div style={{padding:"40px 20px",textAlign:"center",color:C.smoke,fontSize:12}}>
          جارٍ تحميل البيانات من FRED...
        </div>
      )}
      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(function(m){
          var isUp = m.val>=m.prev;
          var changePct = m.prev!==0 ? ((m.val-m.prev)/Math.abs(m.prev)*100).toFixed(2) : 0;
          return(
            <div key={m.id} className="card-enter" style={{background:BOX,borderRadius:16,padding:"14px 16px",border:"1px solid "+m.color+"22",boxShadow:SHD,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+m.color+",transparent)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{textAlign:"left"}}>
                  <div className="num-lg" style={{fontSize:20,fontWeight:900,color:m.color,direction:"ltr"}}>{m.val.toLocaleString()}<span style={{fontSize:10,color:C.smoke,marginRight:3}}> {m.unit}</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                    <span style={{fontSize:10,color:isUp?C.mint:C.coral,fontWeight:700}}>{isUp?"+":""}{changePct}%</span>
                    <span style={{fontSize:9,color:C.smoke}}>السابق: {m.prev.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.snow,marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:9,color:C.smoke,marginBottom:4}}>{m.period}</div>
                  <div style={{background:m.color+"18",borderRadius:6,padding:"2px 8px",border:"1px solid "+m.color+"30"}}>
                    <span style={{fontSize:8,color:m.color,fontWeight:600}}>{m.desc}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:2,alignItems:"flex-end",height:28,marginTop:8}}>
                {(function(){
                  var mx=Math.max.apply(null,m.trend.map(function(v){return Math.abs(v);}));
                  return m.trend.map(function(v,ti){
                    var h=Math.max(3,(Math.abs(v)/(mx||1))*24);
                    var isLast=ti===m.trend.length-1;
                    return(<div key={ti} style={{flex:1,height:h,borderRadius:2,background:isLast?m.color:m.color+"55",boxShadow:isLast?"0 0 6px "+m.color+"88":"none"}}/>);
                  });
                })()}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{height:20}}/>
    </div>
  );
}


export { DividendsTab, MacroTab };
