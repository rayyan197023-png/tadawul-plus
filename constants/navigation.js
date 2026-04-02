/**
 * NAVIGATION CONSTANTS
 * Single definition of all tabs and their properties.
 * Used by: AppShell, TadawulNav, routing logic.
 */

export const TAB_IDS = {
  HOME:      'home',
  STOCKS:    'stocks',
  ANALYSIS:  'analysis',
  PORTFOLIO: 'portfolio',
  NEWS:      'news',
  AI:        'ai',
  MORE:      'more',
};

export const TABS = [
  {
    id:      TAB_IDS.HOME,
    label:   'الرئيسية',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
  },
  {
    id:      TAB_IDS.STOCKS,
    label:   'الأسهم',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
  },
  {
    id:      TAB_IDS.ANALYSIS,
    label:   'التحليل',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
  },
  {
    id:      TAB_IDS.PORTFOLIO,
    label:   'المحفظة',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
  },
  {
    id:      TAB_IDS.NEWS,
    label:   'الأخبار',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
    badge:   3,
  },
  {
    id:      TAB_IDS.AI,
    label:   'تحليل AI',
    accent:  '#1ee68a',
    glow:    'rgba(30,230,138,0.4)',
    glowBg:  'rgba(30,230,138,0.07)',
    isAI:    true,
  },
  {
    id:      TAB_IDS.MORE,
    label:   'المزيد',
    accent:  '#f0c050',
    glow:    'rgba(240,192,80,0.4)',
    glowBg:  'rgba(240,192,80,0.07)',
  },
];

export const TABS_MAP = Object.fromEntries(TABS.map(t => [t.id, t]));
