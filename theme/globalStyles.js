import { colors, typography } from './tokens';

/**
 * Returns global CSS string to inject via <style> tag at root.
 * Called once in AppShell — never in individual components.
 */
export function getGlobalStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    html, body, #root {
      height: 100%;
      background: ${colors.bg};
      color: ${colors.textPrimary};
      font-family: ${typography.fontFamily};
      font-size: ${typography.base}px;
      direction: rtl;
      overflow: hidden;
    }

    body {
      overscroll-behavior: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${colors.bg}; }
    ::-webkit-scrollbar-thumb { background: ${colors.layer3}; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: ${colors.ash}; }

    /* Selection */
    ::selection {
      background: rgba(240,192,80,0.2);
      color: ${colors.textPrimary};
    }

    /* Scrollable containers */
    .scroll-y {
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }

    /* Number formatting — tabular */
    .tabular { font-variant-numeric: tabular-nums; }

    /* Positive / Negative colors */
    .positive { color: ${colors.positive}; }
    .negative { color: ${colors.negative}; }
    .neutral  { color: ${colors.textSecondary}; }

    /* Gold accent */
    .gold { color: ${colors.gold}; }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }

    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }

    @keyframes aiGlow {
      0%, 100% { box-shadow: 0 0 12px rgba(30,230,138,0.3); }
      50%       { box-shadow: 0 0 28px rgba(30,230,138,0.6); }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* Skeleton loader */
    .skeleton {
      background: linear-gradient(
        90deg,
        ${colors.layer1} 25%,
        ${colors.layer2} 50%,
        ${colors.layer1} 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease infinite;
      border-radius: 6px;
    }

    /* Focus ring */
    :focus-visible {
      outline: 2px solid ${colors.gold};
      outline-offset: 2px;
    }

    button, [role="button"] {
      cursor: pointer;
      border: none;
      background: none;
      font-family: inherit;
    }

    /* RTL number inputs */
    input[type="number"] { direction: ltr; text-align: right; }
  
    @keyframes skPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }

    /* ── Reduce Motion (accessibility) ─────────────────── */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ── Pull to Refresh indicator ──────────────────────── */
    .pull-indicator {
      display:flex; align-items:center; justify-content:center;
      padding:12px; color:#f0c050; font-size:11px; gap:8px;
    }
    .pull-spinner {
      width:18px; height:18px;
      border:2px solid rgba(240,192,80,.3);
      border-top-color:#f0c050;
      border-radius:50%;
      animation: spin .7s linear infinite;
    }

    /* ── Search Input focus style ────────────────────────── */
    .search-input {
      width:100%; background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.1); border-radius:12px;
      padding:11px 16px; color:#f1f5f9; font-size:14px;
      font-family:inherit; direction:rtl; outline:none;
      transition:border-color .2s;
    }
    .search-input:focus { border-color:rgba(240,192,80,.5); background:rgba(255,255,255,.07); }
    .search-input::placeholder { color:#4a5568; }

    /* ── Active button ripple ────────────────────────────── */
    .ripple-btn { position:relative; overflow:hidden; }
    .ripple-btn:active { opacity:.85; transform:scale(.97); transition:transform .1s; }

    /* ── Scroll to top button ────────────────────────────── */
    .scroll-top-btn {
      position:fixed; bottom:96px; left:50%; transform:translateX(-50%);
      width:40px; height:40px; border-radius:50%;
      background:rgba(240,192,80,.15); border:1px solid rgba(240,192,80,.3);
      color:#f0c050; font-size:16px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      z-index:50; backdrop-filter:blur(8px);
    }

`;
}