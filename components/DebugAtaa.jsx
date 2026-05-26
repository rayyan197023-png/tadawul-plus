'use client';
import React, { useState, useEffect } from 'react';
import { fetchEngineBars } from '../utils/historicalData';
import { calcPortfolioReturns, calcVolatility, calcReturnsMetrics } from '../engines/portfolioEngine';

export default function DebugAtaa() {
  var st = useState('جارٍ الجلب...');
  var out = st[0], setOut = st[1];

  useEffect(function () {
    fetchEngineBars('4292').then(function (r) {
      var bars = r.bars || [];
      if (!bars.length) { setOut('لا بيانات! source=' + r.source); return; }

      // أكبر تغيّر يومي مطلق
      var maxPct = 0, maxIdx = 0;
      bars.forEach(function (b, i) {
        if (Math.abs(b.pct) > Math.abs(maxPct)) { maxPct = b.pct; maxIdx = i; }
      });

      // أكبر 5 قفزات
      var sorted = bars.map(function (b, i) { return { i: i, pct: b.pct, c: b.c, t: b.t }; })
        .sort(function (a, b) { return Math.abs(b.pct) - Math.abs(a.pct); })
        .slice(0, 5);

      var lines = [];
      lines.push('المصدر: ' + r.source);
      lines.push('عدد الشموع: ' + bars.length);
      lines.push('أول شمعة: c=' + bars[0].c + ' t=' + fmtT(bars[0].t));
      lines.push('آخر شمعة: c=' + bars[bars.length - 1].c + ' t=' + fmtT(bars[bars.length - 1].t));
      lines.push('');
      lines.push('أكبر تغيّر يومي: ' + maxPct.toFixed(2) + '%');
      var cur = bars[maxIdx], prev = bars[maxIdx - 1];
      if (prev) {
        lines.push('  السابقة: c=' + prev.c + ' t=' + fmtT(prev.t));
        lines.push('  القفزة:  c=' + cur.c + ' t=' + fmtT(cur.t));
      }
      lines.push('');
      lines.push('أكبر 5 قفزات:');
      sorted.forEach(function (s) {
        lines.push('  ' + s.pct.toFixed(2) + '%  c=' + s.c + '  t=' + fmtT(s.t));
      });

      // فحص العوائد على آخر 60 شمعة (ما يستهلكه التحليل)
      var last60 = bars.slice(-60);
      var rets = [];
      for (var k = 1; k < last60.length; k++) {
        var pc = last60[k - 1].c;
        if (pc > 0) rets.push((last60[k].c - pc) / pc);
      }
      var mean = rets.reduce(function (a, b) { return a + b; }, 0) / rets.length;
      var variance = rets.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / rets.length;
      var sd = Math.sqrt(variance);
      var cum = last60[last60.length - 1].c / last60[0].c - 1;
      lines.push('');
      lines.push('-- تحليل آخر 60 شمعة --');
      lines.push('عائد تراكمي: ' + (cum * 100).toFixed(2) + '%');
      lines.push('σ يومي: ' + (sd * 100).toFixed(3) + '%');
      lines.push('σ سنوي (×√252): ' + (sd * Math.sqrt(252) * 100).toFixed(2) + '%');
      lines.push('متوسط يومي: ' + (mean * 100).toFixed(4) + '%');
      lines.push('أول c: ' + last60[0].c + ' / آخر c: ' + last60[last60.length - 1].c);

      setOut(lines.join('\n'));
    }).catch(function (e) {
      setOut('خطأ: ' + (e && e.message ? e.message : String(e)));
    });
  }, []);

  function fmtT(t) {
    if (!t) return '?';
    try { return new Date(t).toISOString().slice(0, 10); } catch (e) { return String(t); }
  }

  return (
    <div style={{
      direction: 'ltr', background: '#0c1020', color: '#f0f6ff',
      fontFamily: 'monospace', fontSize: 13, padding: 16,
      minHeight: '100vh', whiteSpace: 'pre-wrap', lineHeight: 1.6,
    }}>
      <div style={{ color: '#f0c050', marginBottom: 12, fontWeight: 900 }}>فحص عطاء 4292</div>
      {out}
    </div>
  );
}
