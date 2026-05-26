'use client';
import React, { useState, useEffect } from 'react';
import { fetchEngineBars } from '../utils/historicalData';

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
