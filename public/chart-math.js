// ═══════════════════════════════════════════════
// chart-math.js -- Indicators & Calculations
// ═══════════════════════════════════════════════

// INDICATORS (math)
// 
const sma=(d,n)=>d.map((_,i)=>i<n-1?null:d.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);

