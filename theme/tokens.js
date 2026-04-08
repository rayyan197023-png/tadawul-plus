/**
 * TADAWUL+ Design Tokens
 * Single source of truth — never define colors elsewhere
 * Terminal Obsidian × Saudi Gold identity
 */

export const colors = {
  // ── Backgrounds
  bg:        '#06080f',
  bgDeep:    '#090c16',
  layer1:    '#16202e',
  layer2:    '#1c2640',
  layer3:    '#222d4a',
  layer4:    '#2a3558',

  // ── Borders & Lines
  border:    '#2a3558',
  borderSub: '#1c2640',
  line:      '#1a2236',

  // ── Text
  textPrimary:   '#ffffff',
  textSecondary: '#8a90a8',
  textTertiary:  '#454d65',
  textMuted:     '#2e3650',

  // ── Brand Accents
  gold:     '#f0c050',
  goldDim:  '#a07828',
  goldGlow: 'rgba(240,192,80,0.15)',

  // ── Semantic
  positive: '#1ee68a',
  negative: '#ff5f6a',
  warning:  '#fbbf24',
  info:     '#4d9fff',

  // ── Feature Colors
  electric: '#4d9fff',
  plasma:   '#a78bfa',
  mint:     '#1ee68a',
  coral:    '#ff5f6a',
  amber:    '#fbbf24',
  teal:     '#22d3ee',
  rose:     '#f43f8a',
  ash:      '#5a6e94',

  // ── Glows (rgba strings)
  glowGold:     'rgba(240,192,80,0.4)',
  glowGoldBg:   'rgba(240,192,80,0.07)',
  glowMint:     'rgba(30,230,138,0.4)',
  glowMintBg:   'rgba(30,230,138,0.07)',
  glowElectric: 'rgba(77,159,255,0.4)',
  glowPlasma:   'rgba(167,139,250,0.4)',
};

export const typography = {
  fontFamily: "'Cairo', 'Segoe UI', sans-serif",
  fontFamilyMono: "'Cairo', monospace",

  // Sizes
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,

  // Weights
  regular:    400,
  medium:     500,
  semibold:   600,
  bold:       700,
  extrabold:  800,
  black:      900,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  xxl:  24,
  full: 9999,
};

export const shadows = {
  gold:     `0 0 24px rgba(240,192,80,0.25)`,
  mint:     `0 0 24px rgba(30,230,138,0.25)`,
  electric: `0 0 24px rgba(77,159,255,0.25)`,
  card:     `0 4px 24px rgba(0,0,0,0.4)`,
  cardHover:`0 8px 40px rgba(0,0,0,0.6)`,
};

export const transitions = {
  fast:   '0.15s ease',
  base:   '0.25s ease',
  slow:   '0.4s ease',
  spring: 'cubic-bezier(0.34,1.56,0.64,1)',
};

// ── Composed theme object
const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  transitions,
};

export default theme;
