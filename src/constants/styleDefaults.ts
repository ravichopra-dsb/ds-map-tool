export const STYLE_DEFAULTS = {
  POINT_RADIUS: 6,
  HOVER_RADIUS: 18,
  LINE_WIDTH: 4,
  HIT_TOLERANCE: 10,
  MODIFY_PIXEL_TOLERANCE: 20,
  TEXT_FONT_SIZE: 14,
  TEXT_STROKE_WIDTH: 3,
  MEASURE_LINE_WIDTH: 2,
  MEASURE_DASH_PATTERN: [12, 8] as const,
  MEASURE_COLOR: '#3b4352',
  NAME_OFFSET_Y: -15,
  Z_INDEX_TEXT: 100,
} as const;

export const COLORS = {
  BLACK: '#000000',
  WHITE: '#ffffff',
  MEASURE_GRAY: '#3b4352',
  SELECTION_BLUE: '#0066ff',
  HOVER_HIGHLIGHT: '#ff6600',
} as const;

export const FONT = {
  DEFAULT: 'Arial, sans-serif',
  TEXT_STYLE: (scale: number = 1) => `${STYLE_DEFAULTS.TEXT_FONT_SIZE * scale}px Arial, sans-serif`,
} as const;
