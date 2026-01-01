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

## Key Features

### Drawing Tools
- **Basic:** Point, Polyline, Line, Freehand, Arrow
- **Icons:** GP, Tower, Junction Point, Triangle, Pit
- **Special:** Legend, Measure (dark gray dashed lines with distance labels), Text (rotate/scale), Search, Split, Merge, Transform

### File Operations
- **Import/Export:** GeoJSON, KML, KMZ with enhanced format handling
- **PDF Export:** DragBox area selection, page sizes A0-A5, resolution 72-3600 DPI, real-time progress
- **Download:** Direct client-side download of all formats

### Data Management
- **PGLite Persistence:** PostgreSQL-compatible local database with auto-recovery
- **Multi-Project Support:** Separate isolated databases per project, CRUD operations, cross-tab sync
- **Undo/Redo:** Ctrl+Z/Y keyboard shortcuts, singleton pattern, auto-tracking
- **Clipboard:** Copy (Ctrl+C), Cut (Ctrl+X), Paste (Ctrl+V) with smart cursor positioning
- **Properties Panel:** View/edit coordinates, names, custom key-value pairs with auto-open on Point drop
- **Feature Visibility:** Show/hide any feature type via slide-out panel

### Advanced Features
- **Multi-selection:** Shift-click, drag selection, batch copy/paste/cut
- **Split/Merge:** LineString splitting with property preservation, merge with endpoint snapping, conflict resolution dialog
- **Search:** OpenStreetMap Nominatim API, autocomplete, smart zoom, coordinate conversion
- **Name Display:** Automatic text labels above Point features with styling controls
- **Google Earth Icons:** 400+ icons across 8 categories (Paddle, Pushpin, Shapes, Map Files, Palettes 2-5, Track Directional)
- **Transform:** Rotate, scale, stretch on editable features
- **Map Views:** OSM + satellite view toggle

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
| useKeyboardShortcuts.ts | Keyboard shortcuts (Ctrl+C/X/V, Ctrl+Z/Y, Delete) |
| useMapProjects.ts | Multi-project CRUD, PGLite databases, persistence |
| useToggleObjects.ts | Feature visibility via useSyncExternalStore |

### Utilities (`src/utils/`)
| Utility | Purpose |
|---------|---------|
| featureUtils.ts | Feature type detection & styling |
| styleUtils.ts | Consistent styling functions |
| colorUtils.ts | Color manipulation |
| interactionUtils.ts | Draw interaction creation |
| featureTypeUtils.ts | Selection & editability logic |
| geometryUtils.ts | Geometry conversion (Circle→Polygon for GeoJSON) |
| mapStateUtils.ts | Map state management & persistence |
| serializationUtils.ts | Feature serialization for database storage |
| searchUtils.ts | Coordinate conversion & result formatting |
| pdfExportUtils.ts | PDF generation with canvas rendering, progress tracking |
| splitUtils.ts | Split/merge with property preservation & conflict resolution |
| iconUtils.ts | Google Earth icon categorization & paths |

### Configuration
- `src/config/toolConfig.ts` - Tool definitions
- `src/tools/legendsConfig.ts` - Legend types
- `src/types/` - TypeScript definitions (ol-ext, PDF export)
- `src/icons/` - Icon SVG components + click handlers

## Development

### Commands
```bash
npm run dev       # Development server
npm run build     # Production build (includes type checking)
npm run lint      # Linting
npm run preview   # Preview build
```

### Adding New Tools
1. Add config to `src/config/toolConfig.ts`
2. Implement logic in `ToolManager.tsx` or dedicated component
3. Add styling in `FeatureStyler.tsx`
4. Create icon in `src/icons/` if needed
5. Add utilities to `src/utils/` as needed

### Key Implementation Patterns

**State Management:**
- Map state → `useMapState`
- Tool selection → `useToolState`
- Feature selection/editing → `useFeatureState`

**Styling:**
- Centralized in `FeatureStyler.tsx`
- Text: 14px Arial, white stroke (3px), black fill
- Measure: dark gray dashed (#3b4352, width 2, [12,8] pattern)
- Point names: -15px offset above icon, z-index 100

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
- Global state via `useSyncExternalStore`
- Supports: Point, Polyline, Freehand, Arrow, GP, Tower, Junction, Triangle, Pit, Measure, Text, Legends
- Hidden features get null styles (data preserved)
- Slide-out panel interface (Radix UI Sheet)

## Version History (Latest First)

| Version | Branch | Key Features |
|---------|--------|--------------|
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

All features above are included. Use for latest functionality.

---

*Streamlined configuration document*