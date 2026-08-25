import { C } from './AnalysisHelpers';

export const ANALYSIS_CSS = `

        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0;height:0}
        body{background:${C.ink}}
        .num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
        .num-lg{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-1px}

        /* ── إشعاع النصوص -- Terminal Glow ── */
        .glow-gold{text-shadow:0 0 12px ${C.gold}99,0 0 24px ${C.gold}44}
        .glow-mint{text-shadow:0 0 10px ${C.mint}88,0 0 20px ${C.mint}33}
        .glow-electric{text-shadow:0 0 10px ${C.electric}88,0 0 20px ${C.electric}33}
        .glow-coral{text-shadow:0 0 10px ${C.coral}88,0 0 20px ${C.coral}33}
        .glow-white{text-shadow:0 0 8px rgba(240,246,255,.4),0 0 16px rgba(240,246,255,.15)}

        /* ── Spring Physics -- حركة طبيعية ── */
        @keyframes springIn{
          0%{opacity:0;transform:translateY(24px) scale(.96)}
          60%{opacity:1;transform:translateY(-4px) scale(1.01)}
          80%{transform:translateY(2px) scale(.995)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes springScale{
          0%{transform:scale(.88)}
          55%{transform:scale(1.06)}
          75%{transform:scale(.97)}
          100%{transform:scale(1)}
        }
        @keyframes floatIn{
          0%{opacity:0;transform:translateX(16px)}
          60%{opacity:1;transform:translateX(-3px)}
          100%{opacity:1;transform:translateX(0)}
        }
        @keyframes morphIn{
          0%{opacity:0;transform:translateY(12px) scale(.94) rotate(-1deg)}
          65%{opacity:1;transform:translateY(-2px) scale(1.02) rotate(.3deg)}
          100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}
        }

        /* ── الحركة الدائمة ── */
        @keyframes breathe{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.018)}
        }
        @keyframes floatBadge{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-2px)}
        }
        @keyframes spinRing{
          from{transform:rotate(0deg)}
          to{transform:rotate(360deg)}
        }

        /* ── النبض والتوهج ── */
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes buyGlow{
          0%,100%{box-shadow:0 0 0 1px ${C.mint}22,0 4px 20px rgba(0,0,0,.3)}
          50%{box-shadow:0 0 0 1px ${C.mint}55,0 4px 28px ${C.mint}18,0 0 20px ${C.mint}0f}
        }
        @keyframes dangerPulse{
          0%,100%{box-shadow:0 0 0 1px ${C.coral}22,0 4px 20px rgba(0,0,0,.3)}
          50%{box-shadow:0 0 0 1px ${C.coral}44,0 4px 24px ${C.coral}15}
        }
        @keyframes rarePop{
          0%{opacity:0;transform:scale(.85) translateY(6px)}
          60%{transform:scale(1.04) translateY(-3px)}
          80%{transform:scale(.98) translateY(1px)}
          100%{opacity:1;transform:scale(1) translateY(0)}
        }
        @keyframes flashPulse{0%{opacity:1}30%{opacity:.5}100%{opacity:1}}
        @keyframes rankUp{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes skeletonPulse{0%,100%{opacity:.35}50%{opacity:.75}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes expandDown{
          0%{opacity:0;transform:translateY(-10px) scale(.98)}
          70%{transform:translateY(2px) scale(1.005)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px ${C.gold}44}50%{box-shadow:0 0 20px ${C.gold}88}}


        /* ── Classes ── */
        .card-enter{animation:springIn .55s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fadeIn .35s ease both}
        .live-dot{animation:pulse 2s ease-in-out infinite}
        .buy-glow{animation:buyGlow 3.2s ease-in-out infinite}
        .danger-pulse{animation:dangerPulse 2.4s ease-in-out infinite}
        .flash{animation:flashPulse .3s ease both}
        .skeleton{animation:skeletonPulse 1.4s ease-in-out infinite}
        .spring-scale{animation:springScale .5s cubic-bezier(.16,1,.3,1) both}
        .float-badge{animation:floatBadge 3s ease-in-out infinite}
        .breathe{animation:breathe 4s ease-in-out infinite}
        button{font-family:inherit;transition:transform .15s ease, opacity .15s ease}
        button:active{transform:scale(.93);opacity:.85}
        @keyframes particle0{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(8%,12%) scale(1.15)}}
        @keyframes particle1{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-6%,8%) scale(.88)}}
        @keyframes particle2{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(10%,-6%) scale(1.1)}}
        @keyframes particle3{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-8%,-10%) scale(.92)}}
        @keyframes particle4{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(5%,7%) scale(1.08)}}
        @keyframes particle5{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-4%,9%) scale(.95)}}
        /* ✨ يمنع سفاري iOS من تكبير الصفحة عند لمس حقول الإدخال */
        @supports (-webkit-touch-callout: none) {
          input, select, textarea { font-size: 16px !important; }
        } 
`;
 