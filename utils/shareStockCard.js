import { calcSmartStopLoss, calcSmartTakeProfit } from '../engines/positionEngine';

export async function shareStockCard(stockData, stockSym, stockName, price, change) {
  try {
    if(!stockData) {
      alert('بيانات السهم غير متاحة');
      return;
    }

    var stk = stockData.stk;
    var health = stockData.health;

    // ✨ موحَّد: نفس uStop/uTargets المعروضة في بطاقة خطة التداول
    var shareStop = calcSmartStopLoss(stk.p, stk.p, health, stockData.bars);
    var shareTargets = calcSmartTakeProfit(stk.p, shareStop.stopPrice, health, stockData.bars);

    
    // إنشاء canvas كبيرة (تشبه البطاقة)
    var canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1600;
    var ctx = canvas.getContext('2d');
    
    // خلفية متدرّجة
    var grad = ctx.createLinearGradient(0, 0, 0, 1600);
    grad.addColorStop(0, '#0f1628');
    grad.addColorStop(1, '#131a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1600);
    
    // شريط لون علوي (حسب الإشارة)
    ctx.fillStyle = health.sigC || '#d4a843';
    ctx.fillRect(0, 0, 1080, 8);
    
    // ─── الهيدر ───
    ctx.fillStyle = '#d4a843';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText('TADAWUL+', 1020, 70);
    
    // اسم السهم
    ctx.fillStyle = '#f0f6ff';
    ctx.font = 'bold 64px Cairo, sans-serif';
    ctx.fillText(stockName, 1020, 160);
    
    // رمز + قطاع
    ctx.fillStyle = '#90a4c8';
    ctx.font = '32px Cairo, sans-serif';
    ctx.fillText(stockSym + '  ·  ' + stk.sec, 1020, 215);
    
    // ─── السعر ───
    ctx.fillStyle = '#f0f6ff';
    ctx.font = 'bold 160px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(price, 540, 400);
    
    ctx.fillStyle = '#90a4c8';
    ctx.font = '36px Cairo, sans-serif';
    ctx.fillText('ر.س', 540, 450);
    
    // التغيّر
    var isUp = change >= 0;
    var changeColor = isUp ? '#10c97e' : '#f04f5a';
    ctx.fillStyle = changeColor;
    ctx.font = 'bold 76px IBM Plex Mono, monospace';
    ctx.fillText((isUp ? '+' : '') + change + '%', 540, 540);
    
    // ─── Score + الإشارة ───
    // خط فاصل
    ctx.strokeStyle = '#1f2940';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 620);
    ctx.lineTo(1000, 620);
    ctx.stroke();
    
    // الإشارة (يسار)
    ctx.fillStyle = health.sigC || '#d4a843';
    ctx.font = 'bold 48px Cairo, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(health.sig || '--', 1020, 720);
    
    // Score (يمين)
    ctx.fillStyle = health.sigC || '#d4a843';
    ctx.font = 'bold 96px IBM Plex Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(health.score, 60, 740);
    ctx.font = '28px Cairo, sans-serif';
    ctx.fillStyle = '#90a4c8';
    ctx.fillText('/ 100', 200, 740);
    
    // ─── خطة التداول ───
     if(shareStop) {
      ctx.fillStyle = '#d4a843';
      ctx.font = 'bold 36px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('🎯 خطة التداول', 1020, 840);
      
      // Entry -- موحَّد: نفس السعر الحالي
      ctx.fillStyle = '#90a4c8';
      ctx.font = '28px Cairo, sans-serif';
      ctx.fillText('الدخول:', 1020, 920);
      ctx.fillStyle = '#f0f6ff';
      ctx.font = 'bold 42px IBM Plex Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(stk.p.toFixed(2), 60, 920);
      
      // Stop Loss -- موحَّد مع positionEngine
      ctx.fillStyle = '#90a4c8';
      ctx.font = '28px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('وقف الخسارة:', 1020, 990);
      ctx.fillStyle = '#f04f5a';
      ctx.font = 'bold 42px IBM Plex Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(shareStop.stopPrice.toFixed(2), 60, 990);
      
      // Target 1 -- موحَّد مع positionEngine
      ctx.fillStyle = '#90a4c8';
      ctx.font = '28px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('الهدف الأول:', 1020, 1060);
      ctx.fillStyle = '#10c97e';
      ctx.font = 'bold 42px IBM Plex Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(shareTargets ? shareTargets.t1.price.toFixed(2) : '--', 60, 1060);
      
      // Target 2 -- موحَّد مع positionEngine
      ctx.fillStyle = '#90a4c8';
      ctx.font = '28px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('الهدف الثاني:', 1020, 1130);
      ctx.fillStyle = '#10c97e';
      ctx.font = 'bold 42px IBM Plex Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(shareTargets ? shareTargets.t2.price.toFixed(2) : '--', 60, 1130);
    }

    
    // ─── خط فاصل سفلي ───
    ctx.strokeStyle = '#1f2940';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 1250);
    ctx.lineTo(1000, 1250);
    ctx.stroke();
    
    // ─── الطبقات الرئيسية ───
    if(health.layers) {
      ctx.fillStyle = '#d4a843';
      ctx.font = 'bold 32px Cairo, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('💧 السيولة: ' + (health.layers.L9 || 0), 1020, 1320);
      ctx.fillText('🏗 الهيكل: ' + (health.layers.L1 || 0), 1020, 1370);
      ctx.fillText('🧮 الاحتمالية: ' + (health.layers.L7 || 0), 1020, 1420);
    }
    
    // ─── الموقع والتاريخ ───
    ctx.fillStyle = '#6a7a9a';
    ctx.font = '28px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('tadawul-plus.vercel.app', 540, 1520);
    
    var now = new Date();
    var dateStr = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
    ctx.font = '24px Cairo, sans-serif';
    ctx.fillText(dateStr, 540, 1560);
    
    // ─── تصدير ───
    canvas.toBlob(async function(blob) {
      if(!blob) {
        alert('فشل إنشاء الصورة');
        return;
      }
      
      var file = new File([blob], stockSym + '.png', { type: 'image/png' });
      
      try {
        if(navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: stockName + ' - تداول+',
          });
        } else {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = stockSym + '.png';
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch(shareErr) {
        if(shareErr.name !== 'AbortError') {
          console.error('Share failed:', shareErr);
        }
      }
    }, 'image/png');
    
  } catch(e) {
    console.error('Canvas error:', e);
    alert('فشل المشاركة');
  }
}

