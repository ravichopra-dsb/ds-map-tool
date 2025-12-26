export type PageSize = 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5';
export type Resolution = 72 | 150 | 300 | 600 | 1200 | 2400;

export interface PageDimensions {
  width: number;
  height: number;
}

export interface PdfExportConfig {
  pageSize: PageSize;
  resolution: Resolution;
}

// Page dimensions in millimeters [width, height]
export const PAGE_SIZES: Record<PageSize, PageDimensions> = {
  a0: { width: 1189, height: 841 },
  a1: { width: 841, height: 594 },
  a2: { width: 594, height: 420 },
  a3: { width: 420, height: 297 },
  a4: { width: 297, height: 210 },
  a5: { width: 210, height: 148 },
};

export const RESOLUTION_OPTIONS: Resolution[] = [72, 150, 300, 600, 1200, 2400];

export const PAGE_SIZE_OPTIONS: PageSize[] = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'];
