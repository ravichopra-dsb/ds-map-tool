# DS Map Tool - Full Codebase Refactoring Plan

## Overview
Full restructure following DRY principles with:
- Component breakdown (MapInteractions.tsx 746 lines → 8 focused hooks)
- **Zustand state management** (eliminate props drilling, minimal boilerplate)
- Utility consolidation (merge duplicates)
- Type-safe feature properties

---

## Phase 1: Foundation (Types & Constants)

### 1.1 Create Type Definitions

**Create `src/types/features.ts`:**
```typescript
export const FEATURE_FLAGS = {
  ARROW: 'isArrow',
  TEXT: 'isText',
  LEGENDS: 'islegends',  // Keep existing casing
  MEASURE: 'isMeasure',
  TRIANGLE: 'isTriangle',
  PIT: 'isPit',
  GP: 'isGP',
  JUNCTION: 'isJunction',
  TOWER: 'isTower',
  POINT: 'isPoint',
  POLYLINE: 'isPolyline',
  FREEHAND: 'isFreehand',
  ICON: 'isIcon',
} as const;

export interface FeatureProperties {
  name?: string;
  isArrow?: boolean;
  isText?: boolean;
  islegends?: boolean;
  isMeasure?: boolean;
  // ... all feature flags
  distance?: number;
  legendType?: string;
  iconPath?: string;
  text?: string;
  textScale?: number;
  textRotation?: number;
}
```

**Create `src/constants/styleDefaults.ts`:**
```typescript
export const STYLE_DEFAULTS = {
  POINT_RADIUS: 6,
  HOVER_RADIUS: 18,
  LINE_WIDTH: 4,
  HIT_TOLERANCE: 15,
} as const;
```

### 1.2 Create Visibility Utility

**Create `src/utils/features/visibilityUtils.ts`:**

Consolidate the 11 duplicate hidden type checks from [MapInstance.tsx:127-137](src/components/MapInstance.tsx#L127-L137):

```typescript
const VISIBILITY_CONFIGS = [
  { hiddenKey: 'pit', flag: 'isPit', types: ['MultiLineString'] },
  { hiddenKey: 'tower', flag: 'isTower', types: ['GeometryCollection'] },
  { hiddenKey: 'junction', flag: 'isJunction', types: ['GeometryCollection'] },
  { hiddenKey: 'gp', flag: 'isGP', types: ['GeometryCollection'] },
  { hiddenKey: 'triangle', flag: 'isTriangle', types: ['Polygon'] },
  { hiddenKey: 'measure', flag: 'isMeasure', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'arrow', flag: 'isArrow', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'freehand', flag: 'isFreehand', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'polyline', flag: 'isPolyline', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'legends', flag: 'islegends', types: ['LineString', 'MultiLineString'] },
  { hiddenKey: 'point', flag: 'isPoint', types: ['Point'] },
];

export const isFeatureHidden = (feature, hiddenTypes) => {
  const type = feature.getGeometry()?.getType();
  return VISIBILITY_CONFIGS.some(c =>
    hiddenTypes[c.hiddenKey] && feature.get(c.flag) && c.types.includes(type)
  );
};
```

---

## Phase 2: Zustand Stores

### 2.1 Install Zustand

```bash
npm install zustand
```

### 2.2 Create Store Directory Structure

```
src/stores/
├── useMapStore.ts           # Map instance, layers, view state
├── useToolStore.ts          # Active tool, legends, icons, interactions
├── useSelectionStore.ts     # Feature selection, clipboard
├── useProjectStore.ts       # Projects, database operations (migrate useMapProjects)
└── index.ts
```

### 2.3 useMapStore

**Create `src/stores/useMapStore.ts`:**

```typescript
import { create } from 'zustand';
import type Map from 'ol/Map';
import type VectorLayer from 'ol/layer/Vector';
import type { TileLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';

interface MapState {
  // State
  map: Map | null;
  vectorSource: VectorSource;
  vectorLayer: VectorLayer | null;
  osmLayer: TileLayer | null;
  satelliteLayer: TileLayer | null;
  currentMapView: 'osm' | 'satellite';
  isTransitioning: boolean;

  // Actions
  setMap: (map: Map) => void;
  setVectorLayer: (layer: VectorLayer) => void;
  setLayers: (osm: TileLayer, satellite: TileLayer) => void;
  switchMapView: (view: 'osm' | 'satellite') => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  vectorSource: new VectorSource(),
  vectorLayer: null,
  osmLayer: null,
  satelliteLayer: null,
  currentMapView: 'osm',
  isTransitioning: false,

  setMap: (map) => set({ map }),
  setVectorLayer: (vectorLayer) => set({ vectorLayer }),
  setLayers: (osmLayer, satelliteLayer) => set({ osmLayer, satelliteLayer }),

  switchMapView: (view) => {
    const { osmLayer, satelliteLayer } = get();
    set({ isTransitioning: true });

    if (view === 'satellite') {
      satelliteLayer?.setOpacity(0);
      satelliteLayer?.setVisible(true);
      // Fade transition
      setTimeout(() => {
        satelliteLayer?.setOpacity(1);
        osmLayer?.setVisible(false);
        set({ currentMapView: 'satellite', isTransitioning: false });
      }, 250);
    } else {
      osmLayer?.setOpacity(0);
      osmLayer?.setVisible(true);
      setTimeout(() => {
        osmLayer?.setOpacity(1);
        satelliteLayer?.setVisible(false);
        set({ currentMapView: 'osm', isTransitioning: false });
      }, 250);
    }
  },
}));
```

Replaces: [useMapState.ts](src/hooks/useMapState.ts)

### 2.4 useToolStore

**Create `src/stores/useToolStore.ts`:**

```typescript
import { create } from 'zustand';
import type { Select } from 'ol/interaction';
import type UndoRedo from 'ol-ext/interaction/UndoRedo';
import type { LegendType } from '@/tools/legendsConfig';

interface ToolState {
  // State
  activeTool: string;
  previousTool: string | null;
  selectedLegend: LegendType | undefined;
  selectedIconPath: string | undefined;
  selectInteraction: Select | null;
  undoRedoInteraction: UndoRedo | null;

  // Actions
  setActiveTool: (tool: string) => void;
  setSelectedLegend: (legend: LegendType | undefined) => void;
  setSelectedIconPath: (path: string | undefined) => void;
  setSelectInteraction: (interaction: Select | null) => void;
  setUndoRedoInteraction: (interaction: UndoRedo | null) => void;
  undo: () => void;
  redo: () => void;
}

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'hand',
  previousTool: null,
  selectedLegend: undefined,
  selectedIconPath: undefined,
  selectInteraction: null,
  undoRedoInteraction: null,

  setActiveTool: (tool) => set((state) => ({
    activeTool: tool,
    previousTool: state.activeTool
  })),
  setSelectedLegend: (legend) => set({ selectedLegend: legend }),
  setSelectedIconPath: (path) => set({ selectedIconPath: path }),
  setSelectInteraction: (interaction) => set({ selectInteraction: interaction }),
  setUndoRedoInteraction: (interaction) => set({ undoRedoInteraction: interaction }),

  undo: () => get().undoRedoInteraction?.undo(),
  redo: () => get().undoRedoInteraction?.redo(),
}));
```

Replaces: [useToolState.ts](src/hooks/useToolState.ts)

### 2.5 useSelectionStore

**Create `src/stores/useSelectionStore.ts`:**

```typescript
import { create } from 'zustand';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

interface ClipboardState {
  features: Feature<Geometry>[];
  isCut: boolean;
  sourceIds: string[];
}

interface SelectionState {
  // State
  selectedFeature: Feature<Geometry> | null;
  selectedFeatures: Feature<Geometry>[];
  clipboard: ClipboardState;

  // Actions
  setSelectedFeature: (feature: Feature<Geometry> | null) => void;
  setSelectedFeatures: (features: Feature<Geometry>[]) => void;
  clearSelection: () => void;
  copy: (features: Feature<Geometry>[]) => void;
  cut: (features: Feature<Geometry>[]) => void;
  clearClipboard: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedFeature: null,
  selectedFeatures: [],
  clipboard: { features: [], isCut: false, sourceIds: [] },

  setSelectedFeature: (feature) => set({ selectedFeature: feature }),
  setSelectedFeatures: (features) => set({ selectedFeatures: features }),
  clearSelection: () => set({ selectedFeature: null, selectedFeatures: [] }),

  copy: (features) => set({
    clipboard: {
      features: features.map(f => f.clone()),
      isCut: false,
      sourceIds: features.map(f => (f as any).ol_uid || ''),
    }
  }),

  cut: (features) => set({
    clipboard: {
      features: features.map(f => f.clone()),
      isCut: true,
      sourceIds: features.map(f => (f as any).ol_uid || ''),
    }
  }),

  clearClipboard: () => set({
    clipboard: { features: [], isCut: false, sourceIds: [] }
  }),
}));
```

Replaces: [useFeatureState.ts](src/hooks/useFeatureState.ts)

---

## Phase 3: Hook Extraction from MapInteractions

Split [MapInteractions.tsx](src/components/MapInteractions.tsx) (746 lines) into 8 focused hooks:

### 3.1 Create Hooks Directory

```
src/hooks/interactions/
├── useUndoRedo.ts           # Lines 84-117
├── useHoverInteraction.ts   # Lines 119-140
├── useSelectModify.ts       # Lines 142-269
├── useDragBoxSelection.ts   # Lines 271-335
├── useTransformTool.ts      # Lines 337-455
├── useSplitTool.ts          # Lines 457-498
├── useMergeTool.ts          # Lines 500-655
├── useOffsetTool.ts         # Lines 657-711
└── index.ts
```

### 3.2 Hook Extraction Details

| Hook | Source Lines | Responsibility | Dependencies |
|------|--------------|----------------|--------------|
| `useUndoRedo` | 84-117 | UndoRedo singleton | map, vectorLayer |
| `useHoverInteraction` | 119-140 | Feature highlighting | map, vectorLayer |
| `useSelectModify` | 142-269 | Selection & modification | map, vectorLayer, callbacks |
| `useDragBoxSelection` | 271-335 | Ctrl+Drag box select | map, selectInteraction |
| `useTransformTool` | 337-455 | Rotate/scale/stretch | map, isActive |
| `useSplitTool` | 457-498 | LineString splitting | map, isActive |
| `useMergeTool` | 500-655 | LineString merging | map, isActive, callbacks |
| `useOffsetTool` | 657-711 | Parallel line copy | map, isActive |

### 3.3 Refactored MapInteractions.tsx (~80 lines)

```typescript
import { useMapStore } from '@/stores/useMapStore';
import { useToolStore } from '@/stores/useToolStore';
import { useSelectionStore } from '@/stores/useSelectionStore';

export const MapInteractions = () => {
  // Zustand stores - no props needed!
  const { map, vectorLayer } = useMapStore();
  const { activeTool, setSelectInteraction, setUndoRedoInteraction } = useToolStore();
  const { setSelectedFeature, setSelectedFeatures } = useSelectionStore();

  // Compose all interaction hooks
  const { undoRedo } = useUndoRedo({ map, vectorLayer, onReady: setUndoRedoInteraction });
  useHoverInteraction({ map, vectorLayer });

  const { selectInteraction, modifyInteraction } = useSelectModify({
    map,
    vectorLayer,
    onFeatureSelect: setSelectedFeature,
    onMultiSelectChange: setSelectedFeatures,
    onReady: setSelectInteraction,
  });

  useDragBoxSelection({ map, vectorLayer, selectInteraction });
  useTransformTool({ map, vectorLayer, isActive: activeTool === 'transform', modifyInteraction });
  useSplitTool({ map, vectorLayer, isActive: activeTool === 'split', selectInteraction });
  useMergeTool({ map, vectorLayer, isActive: activeTool === 'merge', selectInteraction });
  useOffsetTool({ map, vectorLayer, isActive: activeTool === 'offset', selectInteraction });

  return null;
};
```

**Key benefits of Zustand approach:**
- No props drilling - components access stores directly
- No Provider wrappers needed
- Selective re-renders with selectors
- Simple API with less boilerplate

---

## Phase 4: Utility Consolidation

### 4.1 Merge Duplicate Tool Configs

**Merge `src/tools/toolConfig.ts` into `src/config/toolConfig.ts`:**

Current state:
- [src/config/toolConfig.ts](src/config/toolConfig.ts) - Tool capabilities (252 lines)
- [src/tools/toolConfig.ts](src/tools/toolConfig.ts) - Tool icons/names (118 lines)

Target: Single unified config with both icons and capabilities.

### 4.2 Consolidate Geometry Utils

**Fix `src/utils/geometryUtils.ts`:**

Lines 10-27 (`circleToPolygon`) and Lines 36-51 (`createCirclePolygon`) are identical.

```typescript
// Keep one implementation, alias the other
export const circleToPolygon = (centerOrCircle, radiusOrSides, sides = 32) => {
  // Single implementation handling both signatures
};
export const createCirclePolygon = circleToPolygon;
```

### 4.3 Fix Duplicate Feature Checks

**Fix `src/utils/splitUtils.ts`:**

Lines 13-27 (`isSplittableFeature`) and Lines 80-93 (`isMergeableFeature`) are identical.

```typescript
// Already has alias for offset, do same for merge
export const isMergeableFeature = isSplittableFeature;
```

### 4.4 Extract Coordinate Utils

**Create `src/utils/geometry/coordinateUtils.ts`:**

Extract coordinate transformation logic from [PropertiesPanel.tsx:288-413](src/components/PropertiesPanel.tsx#L288-L413):

```typescript
export const extractCoordinates = (geometry: Geometry) => { /* ... */ };
export const updateGeometryCoordinates = (geometry, targetLon, targetLat) => { /* ... */ };
```

---

## Phase 5: Component Refactoring

### 5.1 Refactor MapEditor.tsx

**Current:** 23+ values from hooks, heavy props drilling

**After Zustand (no providers needed!):**
```typescript
import { useMapStore } from '@/stores/useMapStore';
import { useToolStore } from '@/stores/useToolStore';
import { useSelectionStore } from '@/stores/useSelectionStore';

const MapEditor = () => {
  // Zustand - just use the stores directly, no providers!
  const { map, vectorSource } = useMapStore();
  const { activeTool } = useToolStore();
  const { selectedFeature } = useSelectionStore();

  return (
    <div className="flex h-screen">
      <MapInstance />
      <MapInteractions />
      <ToolManager />
      <Toolbar />
      <PropertiesPanel />
      {/* Dialogs - they access stores directly too */}
      <TextDialog />
      <IconPickerDialog />
      <MergePropertiesDialog />
    </div>
  );
};
```

**Zustand advantages in MapEditor:**
- Removed 23+ destructured values from hooks
- No Provider wrapper hierarchy
- Each component accesses only what it needs
- Dialogs can access state without prop passing

### 5.2 Refactor MapInstance.tsx

**Replace lines 127-137** with visibility utility:

```typescript
// Before: 11 duplicate if statements
// After:
if (isFeatureHidden(feature, hiddenTypes)) {
  return new Style({ stroke: undefined });
}
```

### 5.3 Refactor ToolManager.tsx

**Replace 16-case switch** with config-driven approach:

```typescript
const toolConfig = TOOLS[activeTool];
if (toolConfig.requiresDrawInteraction) {
  return createDrawInteraction(toolConfig);
}
if (toolConfig.requiresClickHandler) {
  return registerClickHandler(toolConfig);
}
```

---

## Implementation Order

| Step | Task | Files | Est. Changes |
|------|------|-------|--------------|
| 1 | Install Zustand | package.json | `npm i zustand` |
| 2 | Create types & constants | NEW: 3 files | +150 lines |
| 3 | Create visibilityUtils | NEW: 1 file | +50 lines |
| 4 | Create useMapStore | NEW: 1 file | +70 lines |
| 5 | Create useToolStore | NEW: 1 file | +50 lines |
| 6 | Create useSelectionStore | NEW: 1 file | +60 lines |
| 7 | Create useProjectStore | NEW: 1 file | +150 lines |
| 8 | Extract useUndoRedo | NEW: 1 file | +40 lines |
| 9 | Extract useHoverInteraction | NEW: 1 file | +30 lines |
| 10 | Extract useSelectModify | NEW: 1 file | +130 lines |
| 11 | Extract useDragBoxSelection | NEW: 1 file | +70 lines |
| 12 | Extract useTransformTool | NEW: 1 file | +120 lines |
| 13 | Extract useSplitTool | NEW: 1 file | +50 lines |
| 14 | Extract useMergeTool | NEW: 1 file | +160 lines |
| 15 | Extract useOffsetTool | NEW: 1 file | +60 lines |
| 16 | Refactor MapInteractions | MODIFY | -650 lines |
| 17 | Refactor MapInstance | MODIFY | -10 lines |
| 18 | Merge tool configs | MODIFY + DELETE | -100 lines |
| 19 | Consolidate geometryUtils | MODIFY | -20 lines |
| 20 | Fix splitUtils duplicates | MODIFY | -15 lines |
| 21 | Extract coordinateUtils | NEW + MODIFY | +80, -100 lines |
| 22 | Refactor MapEditor | MODIFY | -50 lines |
| 23 | Refactor ToolManager | MODIFY | -100 lines |
| 24 | Delete old hooks | DELETE: 3 files | -170 lines |

---

## Files Summary

### New Files (17)
- `src/types/features.ts`
- `src/types/tools.ts`
- `src/constants/styleDefaults.ts`
- `src/utils/features/visibilityUtils.ts`
- `src/utils/geometry/coordinateUtils.ts`
- `src/stores/useMapStore.ts` *(Zustand)*
- `src/stores/useToolStore.ts` *(Zustand)*
- `src/stores/useSelectionStore.ts` *(Zustand)*
- `src/stores/useProjectStore.ts` *(Zustand - migrate useMapProjects)*
- `src/stores/index.ts`
- `src/hooks/interactions/useUndoRedo.ts`
- `src/hooks/interactions/useHoverInteraction.ts`
- `src/hooks/interactions/useSelectModify.ts`
- `src/hooks/interactions/useDragBoxSelection.ts`
- `src/hooks/interactions/useTransformTool.ts`
- `src/hooks/interactions/useSplitTool.ts`
- `src/hooks/interactions/useMergeTool.ts`
- `src/hooks/interactions/useOffsetTool.ts`

### Modified Files (8)
- `src/components/MapInteractions.tsx` (746 → ~80 lines)
- `src/components/MapInstance.tsx` (use visibilityUtils + stores)
- `src/components/ToolManager.tsx` (config-driven + stores)
- `src/pages/MapEditor.tsx` (use Zustand stores)
- `src/config/toolConfig.ts` (merge with tools/)
- `src/utils/geometryUtils.ts` (deduplicate)
- `src/utils/splitUtils.ts` (deduplicate)
- `src/components/PropertiesPanel.tsx` (use coordinateUtils + stores)

### Deleted Files (4)
- `src/tools/toolConfig.ts` (merged into config/)
- `src/hooks/useMapState.ts` (replaced by useMapStore)
- `src/hooks/useToolState.ts` (replaced by useToolStore)
- `src/hooks/useFeatureState.ts` (replaced by useSelectionStore)

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| MapInteractions.tsx | 746 lines | ~80 lines |
| Props drilling depth | 3-4 levels | 0 (Zustand stores) |
| Provider wrappers | N/A | 0 (Zustand needs none) |
| Duplicate hidden checks | 11 | 1 utility |
| Tool config files | 2 | 1 |
| Duplicate functions | 3+ | 0 |
| Type safety | Magic strings | Typed interfaces |
| Re-render optimization | Manual | Automatic (Zustand selectors) |

---

## Risk Mitigation

1. **Incremental migration**: Zustand stores added alongside existing hooks, then hooks removed
2. **Hook extraction**: One hook at a time, verify app works after each
3. **Testing**: Run `npm run build` after each phase to catch type errors
4. **Rollback points**: Git commits after each phase

---

## Zustand Best Practices

### Selective Subscriptions (Prevent Re-renders)
```typescript
// Bad - re-renders on any store change
const { map, activeTool, selectedFeature } = useMapStore();

// Good - only re-renders when map changes
const map = useMapStore((state) => state.map);
const activeTool = useToolStore((state) => state.activeTool);
```

### Actions Outside React
```typescript
// Access store outside components
const { setActiveTool } = useToolStore.getState();
setActiveTool('select');
```

### Computed Values
```typescript
// Add computed/derived state
export const useMapStore = create<MapState>((set, get) => ({
  // ...state

  // Computed
  get hasFeatures() {
    return get().vectorSource.getFeatures().length > 0;
  },
}));
```
