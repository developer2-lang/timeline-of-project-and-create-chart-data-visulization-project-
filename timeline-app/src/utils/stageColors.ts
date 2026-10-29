export interface StageColorScheme {
  key: string;
  label: string;
  bg: string;
  border: string;
  bar: string;
  solid: string;
  text: string;
  barText: string;
}

/**
 * Maps stage names to designated color schemes inspired by Reference Image 2:
 * - Research: Light Blue (#7cb9f8)
 * - Ideation: Soft Purple (#b58bf8)
 * - Design Development: Mint Green (#65db95)
 * - Prototyping: Warm Pastel Orange (#fcae60)
 * - Validation: Soft Rose Pink (#f578b8)
 * - Final Design: Sunny Pastel Yellow (#fee152)
 * - Presentation: Bright Cyan Aqua (#6ae3f8)
 */
export function getStageColor(stageName: string, index = 0): StageColorScheme {
  const s = (stageName || '').toLowerCase().trim();

  // 1. Research -> Light Blue
  if (
    s.includes('research') ||
    s.includes('ergonomic') ||
    s.includes('benchmarking') ||
    s.includes('study') ||
    s.includes('scan') ||
    s.includes('discovery')
  ) {
    return {
      key: 'research',
      label: 'Research',
      bg: '#f0f7ff',
      border: '#60a5fa',
      bar: '#7cb9f8',
      solid: '#60a5fa',
      text: '#0f2942',
      barText: '#0f2942',
    };
  }

  // 2. Ideation -> Soft Purple
  if (
    s.includes('ideation') ||
    s.includes('sketch') ||
    s.includes('concept') ||
    s.includes('brainstorm') ||
    s.includes('direction')
  ) {
    return {
      key: 'ideation',
      label: 'Ideation',
      bg: '#f5f0ff',
      border: '#a855f7',
      bar: '#b58bf8',
      solid: '#a855f7',
      text: '#2e1065',
      barText: '#2e1065',
    };
  }

  // 3. Design Development -> Mint Green
  if (
    s.includes('design development') ||
    s.includes('cad') ||
    s.includes('modeling') ||
    s.includes('modelling') ||
    s.includes('surfacing') ||
    s.includes('development') ||
    s.includes('engineering') ||
    s.includes('detailing') ||
    s.includes('housing') ||
    s.includes('internals')
  ) {
    return {
      key: 'design_development',
      label: 'Design Development',
      bg: '#eef9f0',
      border: '#4ade80',
      bar: '#65db95',
      solid: '#4ade80',
      text: '#064e3b',
      barText: '#064e3b',
    };
  }

  // 4. Prototyping -> Warm Pastel Orange
  if (
    s.includes('prototype') ||
    s.includes('prototyping') ||
    s.includes('trial') ||
    s.includes('3d-print') ||
    s.includes('mockup') ||
    s.includes('fit trial') ||
    s.includes('build')
  ) {
    return {
      key: 'prototyping',
      label: 'Prototyping',
      bg: '#fff4ec',
      border: '#fb923c',
      bar: '#fcae60',
      solid: '#fb923c',
      text: '#431407',
      barText: '#431407',
    };
  }

  // 5. Validation -> Soft Rose Pink
  if (
    s.includes('validation') ||
    s.includes('testing') ||
    s.includes('dfm') ||
    s.includes('tooling') ||
    s.includes('homologation') ||
    s.includes('qa') ||
    s.includes('qc')
  ) {
    return {
      key: 'validation',
      label: 'Validation',
      bg: '#fdf0f4',
      border: '#ec4899',
      bar: '#f578b8',
      solid: '#ec4899',
      text: '#701a75',
      barText: '#701a75',
    };
  }

  // 6. Final Design -> Sunny Pastel Yellow
  if (
    s.includes('final design') ||
    s.includes('rendering') ||
    s.includes('render') ||
    s.includes('finish') ||
    s.includes('visual') ||
    s.includes('photoreal')
  ) {
    return {
      key: 'final_design',
      label: 'Final Design',
      bg: '#fef9e8',
      border: '#facc15',
      bar: '#fee152',
      solid: '#facc15',
      text: '#5c4308',
      barText: '#5c4308',
    };
  }

  // 7. Presentation -> Bright Cyan Aqua
  if (
    s.includes('presentation') ||
    s.includes('meeting') ||
    s.includes('client review') ||
    s.includes('review window') ||
    s.includes('walkthrough') ||
    s.includes('handover') ||
    s.includes('signoff')
  ) {
    return {
      key: 'presentation',
      label: 'Presentation',
      bg: '#eafafc',
      border: '#38bdf8',
      bar: '#6ae3f8',
      solid: '#38bdf8',
      text: '#083344',
      barText: '#083344',
    };
  }

  // Harmonious pastel fallbacks for custom stages
  const fallbacks: StageColorScheme[] = [
    { key: 'indigo', label: stageName || 'General', bg: '#e0e7ff', border: '#818cf8', bar: '#a5b4fc', solid: '#6366f1', text: '#312e81', barText: '#1e1b4b' },
    { key: 'teal', label: stageName || 'Planning', bg: '#ccfbf1', border: '#2dd4bf', bar: '#5eead4', solid: '#14b8a6', text: '#134e4a', barText: '#042f2e' },
    { key: 'rose', label: stageName || 'Review', bg: '#ffe4e6', border: '#fb7185', bar: '#fda4af', solid: '#f43f5e', text: '#881337', barText: '#4c0519' },
    { key: 'slate', label: stageName || 'Documentation', bg: '#f1f5f9', border: '#94a3b8', bar: '#cbd5e1', solid: '#64748b', text: '#0f172a', barText: '#0f172a' },
    { key: 'lime', label: stageName || 'Launch', bg: '#f7fee7', border: '#a3e635', bar: '#bef264', solid: '#84cc16', text: '#365314', barText: '#1a2e05' },
  ];
  return fallbacks[index % fallbacks.length];
}

/**
 * Soft pastel background themes for each project row on the left side,
 * exactly matching Reference Image 2.
 */
export const PROJECT_THEMES = [
  { bg: '#f0f7ff', border: '#60a5fa', hoverBg: '#e2effe' }, // Light Blue
  { bg: '#f5f0ff', border: '#a855f7', hoverBg: '#ece1fe' }, // Light Purple
  { bg: '#eef9f0', border: '#4ade80', hoverBg: '#def5e3' }, // Light Green
  { bg: '#fff4ec', border: '#fb923c', hoverBg: '#fee7d8' }, // Light Peach/Orange
  { bg: '#fdf0f4', border: '#ec4899', hoverBg: '#fce0ea' }, // Light Pink
  { bg: '#fef9e8', border: '#facc15', hoverBg: '#fdf2cc' }, // Light Yellow/Cream
  { bg: '#eafafc', border: '#38bdf8', hoverBg: '#d6f4f8' }, // Light Cyan/Aqua
];

export function getProjectTheme(index: number) {
  return PROJECT_THEMES[index % PROJECT_THEMES.length];
}
