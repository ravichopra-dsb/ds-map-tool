# DS Map Tool - Project Configuration

## MCP Servers

| Server | Transport | Config |
|--------|-----------|--------|
| Context7 | HTTP | https://mcp.context7.com/mcp |
| Chrome DevTools | stdio | npx chrome-devtools-mcp@latest |

Use Context7 for up-to-date docs when implementing new libraries/frameworks.

## Tech Stack

**Frontend:** React 19.1.1 + TypeScript + Vite  
**Mapping:** OpenLayers 10.6.1 + ol-ext 4.0.36 + ol-types  
**Database:** PGLite 0.3.14 (PostgreSQL-compatible local DB)  
**Styling:** Tailwind CSS 4.1.16 + Radix UI components  
**Icons:** Lucide React 0.552.0  
**File Processing:** JSZip 3.10.1 (KMZ), jsPDF 3.0.4 (PDF export)  
**Routing:** React Router 7.9.6  
**Build:** Vite 7.1.7
**Package Manager:** pnpm

## Key Features

### Drawing Tools
- **Basic:** Point, Polyline, Line, Freehand, Arrow
- **Shapes:** Arc (3-point), Box, Circle, Revision Cloud (AutoCAD-style scalloped edges)
- **Icons:** GP, Tower, Junction Point, Triangle, Pit
- **Special:** Legend, Measure (dark gray dashed lines with distance labels), Text (rotate/scale), Search, Split, Merge, Transform, Offset
- **Ortho Mode:** F8 to constrain drawing to orthogonal directions (horizontal/vertical/diagonal), per-segment tracking for mixed-mode drawing
- **Folder-Based Drawing:** Draw features directly into active folder, auto-assignment on drawend

### File Operations
- **Import/Export:** GeoJSON, KML, KMZ with enhanced format handling and folder structure preservation
- **Folder Structure:** Import/export hierarchical folders in GeoJSON (dsMapTool metadata), KML/KMZ (`<Folder>` elements)
- **PDF Export:** DragBox area selection, page sizes A0-A5, resolution 72-3600 DPI, real-time progress
- **Download:** Direct client-side download of all formats

### Data Management
- **PGLite Persistence:** PostgreSQL-compatible local database with auto-recovery
- **Multi-Project Support:** Separate isolated databases per project, CRUD operations, cross-tab sync
- **Folder Management:** Hierarchical folder organization with CRUD, drag-drop reordering, nested folders
- **Undo/Redo:** Ctrl+Z/Y keyboard shortcuts, singleton pattern, auto-tracking
- **Clipboard:** Copy (Ctrl+C), Cut (Ctrl+X), Paste (Ctrl+V) with smart cursor positioning
- **Properties Panel:** View/edit coordinates, names, custom key-value pairs with auto-open on Point drop
- **Feature Visibility:** Show/hide any feature type via slide-out panel, per-folder visibility toggle

### Advanced Features
- **Multi-selection:** Shift-click, drag selection, batch copy/paste/cut
- **Split/Merge:** LineString splitting with property preservation, merge with endpoint snapping, conflict resolution dialog
- **Offset:** Create parallel copies of LineString features by dragging, Ctrl-drag to duplicate
- **Search:** OpenStreetMap Nominatim API, autocomplete, smart zoom, coordinate conversion
- **Name Display:** Automatic text labels above Point features with styling controls
- **Google Earth Icons:** 400+ icons across 8 categories (Paddle, Pushpin, Shapes, Map Files, Palettes 2-5, Track Directional)
- **Transform:** Rotate, scale, stretch on editable features
- **Hover Interaction:** Visual feedback (orange highlight) on feature hover without selection, conflict-free with selected features
- **Style Editing:** Live preview for line color/width/opacity, shape stroke/fill, point opacity with reset/commit pattern
- **Map Views:** OSM + satellite view toggle
- **Panel Switching:** Toggle between Features (folder tree) and Layers (type visibility) panels
- **Drag-Drop Organization:** Move features between folders, reorder folders, root drop zone

### Selection & Editing
- **Universal Selection:** All features selectable
- **Restricted Editing:** Only Polyline, Freehand, Arrow, Legend, Text editable
- **Icon Features:** GP, Tower, Junction, Triangle, Pit selectable but not editable

## Architecture

### Components (`src/components/`)
| Component | Purpose |
|-----------|---------|
| MapEditor.tsx | Main orchestrator, project management |
| MapInstance.tsx | Core OL setup, layers, view, styling |
| MapInteractions.tsx | Select, Modify, Transform, UndoRedo |
| ToolManager.tsx | Tool activation, drawing, click handlers |
| FeatureStyler.tsx | All feature styling (arrows, legends, icons, text) |
| FileManager.tsx | Import/export (GeoJSON, KML, KMZ) |
| ToolBar.tsx | Tool selection UI |
| JobSelection.tsx | Multi-project selector with edit/delete |
| CreatingJob.tsx | New project dialog with validation |
| PropertiesPanel.tsx | Feature properties CRUD with custom key-value pairs |
| SearchPanel.tsx | Location search with Nominatim |
| TogglingObject.tsx | Feature visibility control panel |
| SeparateFeatures.tsx | Dual-purpose panel: folder tree + feature list with drag-drop, visibility toggles, delete buttons |
| FolderItem.tsx | Folder tree node: expand/collapse, rename, delete, visibility toggle, drag handle |
| DraggableFeatureItem.tsx | Draggable feature item: icon, name, visibility toggle, delete, folder assignment |
| PdfExportDialog.tsx | PDF config (page size, resolution, progress) |
| MergePropertiesDialog.tsx | Property conflict resolution for merges |
| IconPickerDialog.tsx | 400+ Google Earth icon selector |
| TextDialog.tsx | Text creation with rotation/scale controls |
| LoadingOverlay.tsx | Job switching transitions |
| Other UI | Button, Card, Dropdown, Toggle, Input, Sheet, Checkbox (Radix UI) |

### Custom Hooks (`src/hooks/`)
| Hook | Manages |
|------|---------|
| useMapState.ts | View state, layer switching, transitions |
| useToolState.ts | Active tool, legend selection |
| useFeatureState.ts | Selection, editing, clipboard (copy/cut/paste) |
| useClickHandlerManager.ts | OpenLayers event handlers |
| useKeyboardShortcuts.ts | Keyboard shortcuts (Ctrl+C/X/V, Ctrl+Z/Y, F8, Delete) |
| useMapProjects.ts | Multi-project CRUD, PGLite databases, persistence |
| useToggleObjects.ts | Feature visibility via useSyncExternalStore |
| useLineStyleEditor.ts | Line color/width/opacity editing with live preview |
| useShapeStyleEditor.ts | Shape stroke/fill colors and opacities for Box, Circle, RevisionCloud |
| usePointOpacityEditor.ts | Opacity editing for Point, GP, Tower, Junction, Triangle, Pit icons |

### Interaction Hooks (`src/hooks/interactions/`)
| Hook | Manages |
|------|---------|
| useUndoRedo.ts | Undo/redo operations |
| useSelectModify.ts | Feature selection and modification |
| useHoverInteraction.ts | Hover visual feedback with conflict resolution |
| useDragBoxSelection.ts | Drag box selection |
| useTransformTool.ts | Rotate, scale, stretch operations |
| useSplitTool.ts | LineString splitting |
| useMergeTool.ts | LineString merging |
| useOffsetTool.ts | Offset tool click handling (emits offsetRequest event) |

### Utilities (`src/utils/`)
| Utility | Purpose |
|---------|---------|
| featureUtils.ts | Feature type detection & styling |
| styleUtils.ts | Consistent styling functions, createHoverStyle() |
| colorUtils.ts | Color manipulation |
| interactionUtils.ts | Draw interaction creation with ortho support, geometryFunction parameter |
| featureTypeUtils.ts | Selection & editability logic, supportsCustomLineStyle(), supportsCustomShapeStyle() |
| geometryUtils.ts | Geometry conversion (Circle→Polygon for GeoJSON) |
| mapStateUtils.ts | Map state management & persistence |
| serializationUtils.ts | Feature serialization for database storage |
| searchUtils.ts | Coordinate conversion & result formatting |
| pdfExportUtils.ts | PDF generation with canvas rendering, progress tracking |
| splitUtils.ts | Split/merge with property preservation & conflict resolution, isOffsettableFeature() |
| iconUtils.ts | Google Earth icon categorization & paths |
| orthoUtils.ts | Ortho constraint calculation (horizontal, vertical, 45°, nearest), per-segment tracking |
| arcUtils.ts | 3-point arc calculation, circle from points, arc coordinate generation |
| revisionCloudUtils.ts | AutoCAD-style revision cloud with scalloped edges (radius: 20-200 map units) |
| propertyUtils.ts | Protected properties (name, long, lat, label), extractAllProperties(), applyPropertiesToFeature() |
| routeUtils.ts | URL-safe slug generation, getMapUrl() for project routing |
| visibilityUtils.ts | Feature visibility management |
| kmlFolderUtils.ts | KML/GeoJSON folder structure import/export, hierarchy parsing, XML generation |

### Configuration
- `src/config/toolConfig.ts` - Tool definitions (includes arc, box, circle, revisionCloud, offset)
- `src/tools/legendsConfig.ts` - Legend types
- `src/constants/styleDefaults.ts` - Style constants (colors, dimensions, hover highlight #ff6600)
- `src/types/` - TypeScript definitions (ol-ext, PDF export, folders)
- `src/types/folders.ts` - Folder interface and FolderStructure types
- `src/icons/` - Icon SVG components + click handlers

### State Management (`src/stores/`)
**Architecture:** Zustand stores for centralized reactive state

| Store | Manages |
|-------|---------|
| useToolStore.ts | Active tool, line color/width, ortho mode, undo/redo refs |
| useHiddenFeaturesStore.ts | Feature visibility toggle state |
| useMapStore.ts | Map view state |
| useSelectionStore.ts | Feature selection state |
| useFolderStore.ts | Folder hierarchy CRUD, active folder, expand/collapse, persistence |
| usePanelStore.ts | Panel switching (features/layers), open/close state |
| layoutStore.ts | UI layout persistence |

## Development

### Commands
```bash
npm run dev       # Development server
npm run build     # Production build (includes type checking)
npm run lint      # Linting
npm run preview   # Preview build
```

### Adding New Tools
1. Add config to `src/config/toolConfig.ts` with tool properties
2. Implement interaction logic:
   - For drawing tools: Add to `ToolManager.tsx` with `interactionUtils.ts`
   - For complex interactions: Create hook in `src/hooks/interactions/`
3. Add styling in `FeatureStyler.tsx` with style functions
4. Create icon in `src/icons/` if needed
5. Add utilities to `src/utils/` as needed (geometry, validation, etc.)
6. Update Zustand stores if tool needs global state (`useToolStore`, etc.)
7. Add keyboard shortcuts in `useKeyboardShortcuts.ts` if applicable
8. Update feature type checks in `featureTypeUtils.ts` for selection/editing logic

### Key Implementation Patterns

**State Management:**
- **Zustand Stores** (Primary): Centralized reactive state in `src/stores/`
  - Tool state → `useToolStore` (active tool, ortho mode, line styles, refs)
  - Hidden features → `useHiddenFeaturesStore`
  - Selection → `useSelectionStore`
  - Map view → `useMapStore`
  - Layout → `layoutStore`
- **Legacy Hooks** (Migration in progress):
  - Map state → `useMapState`
  - Tool selection → `useToolState`
  - Feature selection/editing → `useFeatureState`

**Styling:**
- Centralized in `FeatureStyler.tsx`
- Constants in `src/constants/styleDefaults.ts`
- Text: 14px Arial, white stroke (3px), black fill
- Measure: dark gray dashed (#3b4352, width 2, [12,8] pattern)
- Point names: -15px offset above icon, z-index 100
- Hover highlight: #ff6600 (orange), 18px radius
- Selection: Blue highlight for selected features

**Data Persistence:**
- PGLite database per project in `useMapProjects.ts`
- Advanced serialization in `serializationUtils.ts`
- Auto-recovery on startup via `mapStateUtils.ts`

**Undo/Redo:**
- ol-ext UndoRedo with singleton pattern (init once in `MapInteractions.tsx`)
- Auto-tracking on all drawing operations
- Persists across tool switches

**Keyboard Shortcuts:**
- Managed via `useKeyboardShortcuts.ts`
- Clipboard: Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste)
- Undo/Redo: Ctrl+Z, Ctrl+Y
- Ortho Mode: F8 (toggle orthogonal constraints)
- Delete: Remove vertices/points
- Tools: Configured per toolbar item

**Multi-Selection:**
- Shift-click, drag selection, three modes (shift-click default, always, custom)
- Batch copy/paste/cut support
- Selection state via callbacks

**Search:**
- OpenStreetMap Nominatim via ol-ext
- Autocomplete with real-time results
- Coordinate conversion WGS84↔map projection
- Smart zoom based on result type

**File Operations:**
- Import: GeoJSON, KML, KMZ with validation
- Export: Same formats with enhanced KML metadata
- PDF: DragBox selection → config dialog → progress → download
- Download: Client-side Blob URLs (no server)

**Split/Merge:**
- Split: Click LineString to split, preserves properties & measure distances
- Merge: Drag endpoints together, auto-detect with configurable tolerance
- Conflict resolution: Radio button selection for property conflicts
- Only LineString features (non-arrow) supported

**Properties Panel:**
- View/edit name, coordinates, custom key-value pairs
- Protected properties (name, long, lat) read-only keys, editable values
- Custom properties fully editable
- Auto-open on Point creation
- Full CRUD for custom properties

**PDF Export:**
- DragBox interaction for area selection
- Page sizes: A0-A5 with performance hints
- Resolution: 72-3600 DPI (default 1200)
- Progress: Preparing → Rendering → Creating → Complete
- Canvas max: 12192px with auto-scaling
- Format: JPEG (≥300 DPI), PNG (lower res)
- Timeout: 3 minutes for rendering
- White background for professional output

**Google Earth Icons:**
- 400+ icons in 8 categories
- Integrated with Point tool
- Search by name
- Grid layout with hover effects

**Name Display:**
- Auto-shows on Point features
- `shouldShowName()` & `getNameTextStyle()` functions
- Excludes arrows, text, legends, measure
- Respects visibility toggle

**Toggling/Visibility:**
- Global state via `useSyncExternalStore` and `useHiddenFeaturesStore` (Zustand)
- Supports: Point, Polyline, Freehand, Arrow, GP, Tower, Junction, Triangle, Pit, Measure, Text, Legends
- Hidden features get null styles (data preserved)
- Slide-out panel interfaces: TogglingObject.tsx and SeparateFeatures.tsx (Radix UI Sheet)
- SeparateFeatures shows all features with eye icon toggle and delete buttons

**Ortho Mode:**
- Toggle via F8 or toolbar button
- State managed in `useToolStore` (Zustand)
- Per-segment tracking: `orthoStates[]` array tracks ortho enabled/disabled per point
- AutoCAD-like mixed-mode drawing: toggle ortho mid-drawing for partial constraints
- Constraint functions in `orthoUtils.ts`: horizontal, vertical, 45°, nearest
- Integration: `geometryFunction` parameter in `interactionUtils.ts` for polyline/freehand

**Shape Tools:**
- Arc: 3-point drawing (start → through → end), circle calculation in `arcUtils.ts`
- Box: Rectangle/square with constrained corners
- Circle: Center + radius drawing
- Revision Cloud: Scalloped edges (20-200 map unit radius), `revisionCloudUtils.ts`
- All shapes support custom stroke/fill colors and opacities

**Hover Interaction:**
- Visual feedback on hover without selection
- Orange highlight (#ff6600) from `styleDefaults.ts`
- Conflict resolution: hover effects disabled on selected features
- Managed by `useHoverInteraction.ts` hook
- Style function: `createHoverStyle()` in `styleUtils.ts`

**Style Editing:**
- Live preview pattern: deselect feature during editing to show unmodified styles
- Line styles: `useLineStyleEditor` manages color, width, opacity
- Shape styles: `useShapeStyleEditor` manages stroke/fill colors and opacities
- Point opacity: `usePointOpacityEditor` for all icon types
- Reset/commit pattern for undo support
- Feature checks: `supportsCustomLineStyle()`, `supportsCustomShapeStyle()`

**Offset Tool:**
- Drag-based interaction for creating parallel LineString copies
- Ctrl-drag to duplicate feature
- Hook: `useOffsetTool` emits custom `offsetRequest` event
- Dialog: Not yet implemented (event-driven architecture ready)
- Helper: `isOffsettableFeature()` in `splitUtils.ts`

**Custom Event System:**
- Pattern: `window.dispatchEvent(new CustomEvent('eventName', { detail: {...} }))`
- Used by: Offset tool for dialog triggering
- Allows loose coupling between interaction hooks and UI components

**URL Routing:**
- Project URLs: `/map/{slug}/{projectId}` format
- Slug generation: `slugifyProjectName()` creates URL-safe slugs
- Helper: `getMapUrl(projectName, projectId)` in `routeUtils.ts`

**Properties Management:**
- Protected properties: `name`, `long`, `lat`, `label` (value-editable, key read-only)
- Calculated properties: `length`, `vertex` (read-only display)
- Style properties: `strokeColor`, `strokeOpacity`, `fillColor`, `fillOpacity`
- Full CRUD: `extractAllProperties()`, `applyPropertiesToFeature()` in `propertyUtils.ts`

**Feature List Management:**
- Component: `SeparateFeatures.tsx`
- Auto-updates on vector source changes
- Icon mapping for 16+ feature types
- Actions: visibility toggle (eye icon), delete button
- Hidden features shown with 50% opacity
- Bottom-left slide-out panel

**Folder Management:**
- Store: `useFolderStore.ts` (Zustand) with full CRUD
- Operations: createFolder, deleteFolder, renameFolder, moveFolder, toggleFolderExpanded, setActiveFolder
- Hierarchy: nested folders via `parentId`, helpers for descendants and root folders
- Persistence: `loadFromStorage()`, `exportToStorage()`, `clearAll()` for project switching
- Active folder: Features drawn while folder is active get auto-assigned via `folderId` property
- Integration: `interactionUtils.ts` assigns `folderId` on drawend event
- Components: `FolderItem.tsx` (tree node), `DraggableFeatureItem.tsx` (draggable feature)

**Panel Switching:**
- Store: `usePanelStore.ts` (Zustand)
- Panels: 'features' (folder tree + feature list) | 'layers' (type visibility) | null
- Actions: openFeatures(), openLayers(), closePanel(), toggleToFeatures(), toggleToLayers()
- Components: `SeparateFeatures.tsx` (features panel), `TogglingObject.tsx` (layers panel)
- Toggle button in each panel header to switch between views

**Drag-Drop Organization:**
- Library: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Features: drag folders to reorder, drag features between folders
- Root drop zone: move features out of folders to root level
- Sensors: PointerSensor (8px activation), KeyboardSensor
- Visual feedback: 50% opacity during drag, highlight on drop target
- Cascading: delete folder deletes all features within

**Folder Import/Export:**
- Utility: `kmlFolderUtils.ts` (334 lines)
- GeoJSON format: `{ dsMapTool: { version: "1.0", folderStructure: {...} } }`
- KML/KMZ format: Hierarchical `<Folder>` elements with nested Placemarks
- Import: `parseKmlFolders()` extracts hierarchy, maps placemarks to folders by index
- Export: `restructureKmlWithFolders()` injects folder hierarchy into flat KML
- Helpers: `buildFolderTree()`, `escapeXml()`, `generateKmlFolderXml()`
- Backward compatible: imports without folders work normally

## Version History (Latest First)

| Version | Branch | Key Features |
|---------|--------|--------------|
| v2.11 | tools | **Folder Management** (hierarchical CRUD, drag-drop), panel switching (features/layers), folder-based drawing, KML/GeoJSON folder import/export, @dnd-kit integration, FolderItem/DraggableFeatureItem components, useFolderStore/usePanelStore |
| v2.10 | tools | **Ortho Mode** (F8, per-segment tracking), hover interaction (#ff6600 highlight), offset tool (drag-based), style editing hooks (line/shape/point), Zustand migration, SeparateFeatures panel, hover conflict resolution |
| v2.9.5 | tools | **Shape Tools** (Arc 3-point, Box, Circle, Revision Cloud), arcUtils, revisionCloudUtils, supportsCustomShapeStyle() |
| v2.9.1 | tools | Hover fixes, separate feature toggling improvements, interaction hooks reorganization |
| v2.9 | tools | Split/Merge tools, icon picker (400+ Google Earth icons), endpoint snapping, measure recalc, property conflict resolution |
| v2.8 | exportPDF | PDF export (DragBox, A0-A5, 72-3600 DPI), progress tracking, job operation feedback |
| v2.7 | - | Toggling objects, auto name display, enhanced properties (custom key-value), auto-open on Point drop |
| v2.6 | - | Nominatim search, autocomplete, smart zoom, coordinate conversion |
| v2.5 | - | Multi-selection modes (shift/always/custom), drag selection, batch operations |
| v2.4 | - | Multi-project system, isolated PGLite DB per project, CRUD, cross-tab sync |
| v2.3 | - | PGLite persistence, advanced serialization, auto-recovery |
| v2.2 | - | Undo/Redo (Ctrl+Z/Y), singleton pattern, auto-tracking |
| v2.1 | - | Cut/Copy/Paste (Ctrl+C/X/V), cursor positioning, clipboard management |
| v2.0 | - | Measure tool, point delete, architecture refactoring, icon tools |
| Pre-2.0 | main | Foundation features |

## Current Branch: tools

All features above are included. Use for latest functionality (v2.11).

---

*Streamlined configuration document*