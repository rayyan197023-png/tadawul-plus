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
`;
}