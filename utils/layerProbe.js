/**
 * layerProbe -- أداة قياس مؤقّتة لجمع قيم الطبقات التسع الحقيقية
 * تُحذف بعد القياس. لا تعدّل المحرك -- تقرأ المخرجات فقط.
 */
export function runLayerProbe(allData) {
  if (!Array.isArray(allData) || !allData.length) {
    console.error('[probe] allData فارغ');
    return null;
  }
  var rows = [];
  allData.forEach(function (d) {
    if (!d || !d.health || !d.health.layers || !d.stk) return;
    var L = d.health.layers;
    var ex = d.health.extras || {};
    rows.push({
      sym: d.stk.sym, sec: d.stk.sec, ch: d.stk.ch, score: d.health.score,
      L1: L.L1, L2: L.L2, L3: L.L3, L4: L.L4, L5: L.L5,
      L6: L.L6, L7: L.L7, L8: L.L8, L9: L.L9, L10: L.L10,
      rsi: ex.rsiV, macdH: ex.macdH, adx: ex.adxV,
      vr: ex.vr, cmf: ex.cmf, vwapD: ex.vwapDev, atrP: ex.atrPct,
    });
  });
  var out = { meta: { n: rows.length, generatedAt: new Date().toISOString() }, rows: rows };
  var json = JSON.stringify(out);
  console.log('═══════ LAYER PROBE START ═══════');
  console.log(json);
  console.log('═══════ LAYER PROBE END ═══════');
  console.log('[probe] جُمع ' + rows.length + ' سهم. انسخ النص بين START و END.');
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(json).then(function(){ console.log('[probe] ✓ نُسخ تلقائياً'); });
  } catch (e) {}
  return out;
}
