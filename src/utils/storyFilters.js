const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export const STORY_FILTERS = [
  { id: 'natural', label: 'Natural', swatch: 'linear-gradient(135deg, #d9c3ad, #6e8a68)' },
  { id: 'beauty', label: 'Beauty', swatch: 'linear-gradient(135deg, #ffd7dc, #d69ab5)' },
  { id: 'glow', label: 'Glow', swatch: 'linear-gradient(135deg, #fff4bd, #ffadcf)' },
  { id: 'warm', label: 'Warm', swatch: 'linear-gradient(135deg, #ffcf74, #d96948)' },
  { id: 'cold', label: 'Cold', swatch: 'linear-gradient(135deg, #b9edff, #668bd8)' },
  { id: 'vintage', label: 'Vintage', swatch: 'linear-gradient(135deg, #d7c29a, #785d52)' },
  { id: 'mono', label: 'B&W', swatch: 'linear-gradient(135deg, #f1f1f1, #383838)' },
];

export function getStoryFilterCss(filterId = 'natural', intensity = 0.7) {
  const amount = clamp01(intensity);
  const percent = (value) => `${Math.round(value * 100)}%`;

  switch (filterId) {
    case 'natural':
      return `contrast(${percent(1 + amount * 0.04)}) brightness(${percent(1 + amount * 0.035)})`;
    case 'beauty':
      return `blur(${(amount * 0.45).toFixed(2)}px) brightness(${percent(1 + amount * 0.09)}) contrast(${percent(1 - amount * 0.08)}) saturate(${percent(1 + amount * 0.08)})`;
    case 'glow':
      return `brightness(${percent(1 + amount * 0.16)}) contrast(${percent(1 - amount * 0.05)}) saturate(${percent(1 + amount * 0.14)})`;
    case 'warm':
      return `sepia(${percent(amount * 0.24)}) saturate(${percent(1 + amount * 0.22)}) hue-rotate(${-Math.round(amount * 7)}deg) brightness(${percent(1 + amount * 0.04)})`;
    case 'cold':
      return `saturate(${percent(1 + amount * 0.08)}) hue-rotate(${Math.round(amount * 12)}deg) contrast(${percent(1 + amount * 0.05)})`;
    case 'vintage':
      return `sepia(${percent(amount * 0.58)}) contrast(${percent(1 - amount * 0.05)}) saturate(${percent(1 - amount * 0.2)}) brightness(${percent(1 + amount * 0.02)})`;
    case 'mono':
      return `grayscale(${percent(amount)}) contrast(${percent(1 + amount * 0.08)})`;
    default:
      return 'none';
  }
}

