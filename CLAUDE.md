# Claude Code Configuration

This project uses Claude Code with the following MCP (Model Context Protocol) servers configured:

## Available MCP Servers

### Context7

- **Transport**: HTTP
- **URL**: https://mcp.context7.com/mcp
- **Description**: Context7 integration for enhanced context management

### Chrome DevTools

- **Transport**: stdio
- **Command**: npx chrome-devtools-mcp@latest
- **Description**: Chrome DevTools integration for web development and debugging

## Usage

These MCP servers provide additional capabilities to Claude Code for this project. You can use them through the standard Claude Code interface.

- Use Context7 to check up-to-date docs when needed for implementing new libraries or frameworks, or adding features using them.

## Project Overview

This is a **DS Map Tool** - a web-based map editor application built with React and OpenLayers.

### Technology Stack
- **Frontend**: React 19.1.1 + TypeScript + Vite
- **Map Library**: OpenLayers (v10.6.1) + ol-ext (v4.0.36) + ol-types
- **Database**: PGLite (v0.3.14) - PostgreSQL-compatible local database
- **Styling**: Tailwind CSS (v4.1.16)
- **UI Components**: Radix UI components (Dialog, Dropdown, Label, Slider, Slot, Toggle, ToggleGroup, Sheet, Checkbox)
- **UI Icons**: Lucide React (v0.552.0)
- **Build Tool**: Vite 7.1.7
- **Package Manager**: npm/pnpm
- **Routing**: React Router 7.9.6
- **File Processing**: JSZip (v3.10.1) for KMZ support
- **PDF Generation**: jsPDF (v3.0.4) for client-side PDF export
- **State Management**: Custom hooks with React Context patterns
- **Search**: OpenStreetMap Nominatim API via ol-ext

### Key Features
- Interactive map with OSM and satellite view toggle
- Advanced drawing tools (Point, Polyline, Line, Freehand, Arrow, GP, Tower, Junction Point, Measure, Text)
- File import/export support (GeoJSON, KML, KMZ) with enhanced KML/KMZ format handling
- **Download functionality** - Direct download of maps in GeoJSON, KML, and KMZ formats
- **PDF Export** - High-quality map export to PDF with DragBox area selection, configurable page sizes (A0-A5), and resolution options (72-3600 DPI) with real-time progress tracking
- **Split tool** - Split LineString features by clicking on them, preserving properties and recalculating measure distances
- **Merge tool** - Merge LineString features by dragging endpoints together with property conflict resolution dialog
- **Google Earth Icon Picker** - Comprehensive icon selection dialog with 400+ Google Earth icons across multiple categories (Paddle, Pushpin, Shapes, etc.)
- **Advanced text manipulation** - Text tool with rotate and scale capabilities for precise label placement
- Tool selection system with toolbar
- Universal feature selection (all features can be selected) with restricted editing (only Polyline, Freehand Line, Arrow, Legend, and Text features are editable)
- Legend creation and management
- Transform tool for advanced feature manipulation (rotate, scale, stretch)
- Distance measurement tool with inline text display
- **Cut, Copy, and Paste functionality** with keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V)
- **Point delete functionality** in polylines with vertex manipulation
- **Enhanced keyboard shortcuts** for improved workflow efficiency
- **Undo/Redo functionality** with keyboard shortcuts (Ctrl+Z, Ctrl+Y) for all drawing operations
- **Multi-Job/Project Management** - Create, edit, delete, and switch between multiple map projects with isolated databases
- **Data persistence with PGLite** - Local PostgreSQL-compatible database for reliable data storage and retrieval
- **Project-based data isolation** - Each project maintains its own separate database and map state
- **Multi-selection functionality** - Enhanced multi-selection with drag, copy, paste, and cut operations for multiple features
- **Properties panel** - View and edit feature properties including coordinates, names, and custom properties with full edit/save workflow
- **Search functionality** - Location search using Nominatim with autocomplete and geocoding capabilities
- **Toggling Objects** - Show/hide different feature types on the map through a slide-out panel interface
- **Feature name display** - Automatic display of feature names as text labels above Point geometry features
- **Auto-open Properties Panel** - Automatically opens Properties Panel when creating new Point features for immediate editing
- Smooth map view transitions

### Architecture

The application follows a modular, component-based architecture with clear separation of concerns:

#### Core Components (`src/components/`)
- **`MapEditor.tsx`** - Main orchestrator component that coordinates all sub-components and project management
- **`MapInstance.tsx`** - Core OpenLayers map initialization, layer setup, and view configuration
- **`MapInteractions.tsx`** - Select, Modify, Transform, and UndoRedo interaction management
- **`ToolManager.tsx`** - Tool activation, draw interactions, and click handler coordination
- **`FeatureStyler.tsx`** - All feature styling logic (arrows, legends, icons, text labels)
- **`FileManager.tsx`** - File import/export operations (GeoJSON, KML, KMZ)
- **`ToolBar.tsx`** - UI toolbar for tool selection
- **`LegendDropdown.tsx`** - Legend creation and management component
- **`MapViewToggle.tsx`** - Map view switcher component
- **`LoadingOverlay.tsx`** - Loading overlay for transitions and job switching with backdrop blur
- **`JobSelection.tsx`** - Multi-job/project selection, creation, and management component with edit/delete functionality and loading states
- **`CreatingJob.tsx`** - New job/project creation dialog with validation and inline loading overlay
- **`TextDialog.tsx`** - Text input dialog for creating and editing text labels
- **`PropertiesPanel.tsx`** - Feature properties display and editing panel with custom properties management
- **`SearchPanel.tsx`** - Location search panel with Nominatim integration
- **`SearchWrapper.tsx`** - Search functionality wrapper component
- **`TogglingObject.tsx`** - Slide-out panel for showing/hiding different feature types on the map
- **`PdfExportDialog.tsx`** - PDF export dialog with page size, resolution selection, and real-time progress tracking
- **`DragBoxInstruction.tsx`** - Interactive overlay for DragBox area selection guidance
- **`MergePropertiesDialog.tsx`** - Property conflict resolution dialog for merging LineString features
- **`IconPickerDialog.tsx`** - Google Earth icon selection dialog with 400+ icons across multiple categories
- **`ui/`** - Reusable UI components (Button, Card, Dropdown, Toggle, ToggleGroup, Input, Sheet, Checkbox)

#### Custom Hooks (`src/hooks/`)
- **`useMapState.ts`** - Map view state, layer switching, and transition management
- **`useToolState.ts`** - Active tool and legend selection state management
- **`useFeatureState.ts`** - Feature selection, editing state, and clipboard management
- **`useClickHandlerManager.ts`** - OpenLayers event handler management
- **`useKeyboardShortcuts.ts`** - Keyboard shortcuts management for cut/copy/paste and undo/redo operations
- **`useMapProjects.ts`** - Multi-job/project management with isolated PGLite databases, project CRUD operations, and data persistence
- **`useToggleObjects.ts`** - Feature visibility management using useSyncExternalStore for reactive state synchronization

#### Configuration & Tools
- **`src/config/toolConfig.ts`** - Tool configuration and definitions
- **`src/tools/legendsConfig.ts`** - Legend type configurations
- **Individual icon components** - Each icon (Triangle, Pit, GP, Tower, JunctionPoint, Text) has its own component with integrated click handlers

#### Utilities (`src/utils/`)
- **`featureUtils.ts`** - Feature type detection and styling utilities
- **`styleUtils.ts`** - Consistent styling functions
- **`colorUtils.ts`** - Color manipulation utilities
- **`interactionUtils.ts`** - Draw interaction creation utilities
- **`featureTypeUtils.ts`** - Feature selection and editability logic
- **`geometryUtils.ts`** - Geometry conversion utilities (Circle to Polygon approximation for GeoJSON serialization)
- **`mapStateUtils.ts`** - Map state management and persistence utilities
- **`serializationUtils.ts`** - Advanced feature serialization and deserialization for database storage
- **`searchUtils.ts`** - Search functionality utilities including coordinate conversion and result formatting
- **`pdfExportUtils.ts`** - PDF export functionality with canvas rendering, aspect ratio preservation, format optimization, and progress tracking
- **`splitUtils.ts`** - Split and merge utilities for LineString features with property preservation and conflict resolution
- **`iconUtils.ts`** - Google Earth icon categorization and path management utilities

#### Icons (`src/icons/`)
- **Icon components** - Triangle, Pit, GP, Junction Point, Tower, Text SVG components and click handlers
- **`ToolBoxIcon.tsx`** - Toolbox icon component

#### Configuration (`src/`)
- **`config/`** - Tool configuration and definitions (moved from `src/tools/`)
- **`types/`** - TypeScript type definitions (including ol-ext types, PDF export types)
  - **`pdf.ts`** - PDF export configuration types (PageSize, Resolution, PageDimensions, PdfExportConfig)
- **`lib/`** - Shared utility functions (e.g., cn for className merging)

### Available Tools
- **Select**: Select all features (universal selection) with multi-selection support (shift-click, drag selection) and editing restricted to Polyline, Freehand Line, Arrow, Legend, and Text features
- **Hand**: Pan navigation mode
- **Point**: Place point markers with Google Earth icon picker support
- **Polyline**: Draw straight lines with vertex delete functionality
- **Line**: Draw line segments
- **Freehand**: Freehand drawing
- **Arrow**: Draw arrows with customizable styles
- **GP**: GP (General Purpose) drawing tool
- **Tower**: Place tower markers
- **Junction Point**: Place junction/connectivity points
- **Legend**: Create and manage map legends
- **Measure**: Distance measurement tool with inline text display (dark gray dashed lines)
- **Transform**: Advanced feature manipulation (rotate, scale, stretch) - works only on editable features
- **Text**: Place and edit text labels with customizable styling, rotation, and scale controls
- **Search**: Location search with autocomplete using OpenStreetMap Nominatim API
- **Split**: Split LineString features by clicking on them - preserves properties and recalculates measure distances
- **Merge**: Merge LineString features by dragging endpoints together - includes property conflict resolution dialog

### Keyboard Shortcuts
- **Ctrl+C**: Copy selected features to clipboard
- **Ctrl+X**: Cut selected features (copy and remove from map)
- **Ctrl+V**: Paste features from clipboard at cursor position
- **Ctrl+Z**: Undo last drawing operation
- **Ctrl+Y**: Redo last undone operation
- **Delete**: Remove selected points/vertices from polylines
- Tool switching shortcuts (configured in toolbar)

### Development
- Run development server: `npm run dev`
- Build for production: `npm run build`
- TypeScript compilation: `npm run build` (includes type checking)
- Linting: `npm run lint`
- Preview build: `npm run preview`

### Development Guidelines

#### Working with the New Architecture

1. **Component Updates**:
   - When modifying map functionality, identify which component needs changes (MapInstance, MapInteractions, ToolManager, etc.)
   - For state changes, use the appropriate custom hook (useMapState, useToolState, useFeatureState)
   - Keep components focused on their single responsibility

2. **Adding New Tools**:
   - Add tool configuration to `src/config/toolConfig.ts`
   - Implement tool logic in `ToolManager.tsx` or create a dedicated tool component
   - Update styling logic in `FeatureStyler.tsx` if needed
   - Add any new utility functions to appropriate files in `src/utils/`
   - Create icon component in `src/icons/` if the tool needs a custom icon

3. **State Management**:
   - Map-related state (view, layers, transitions): Use `useMapState`
   - Tool selection and legends: Use `useToolState`
   - Feature selection and editing: Use `useFeatureState`
   - Complex shared state should be lifted to the closest common ancestor component

4. **Styling**:
   - All feature styling logic is centralized in `FeatureStyler.tsx`
   - Use existing utility functions from `styleUtils.ts` and `colorUtils.ts`
   - For new feature types, add styling functions to `FeatureStyler.tsx`
   - Measure tool uses dedicated styling with custom dark gray dashed lines and distance text labels
   - Text features use 14px Arial font with white stroke (width 3) and black fill for optimal visibility
   - Text scaling and rotation applied through OpenLayers Text style properties for optimal rendering performance
   - Point features automatically display names via `shouldShowName()` and `getNameTextStyle()` functions
   - Name styling: 14px Arial, black fill, white stroke (width 3), positioned -15px above point with z-index 100

5. **File Operations**:
   - File import/export logic is in `FileManager.tsx`
   - Download functionality is implemented in `MapEditor.tsx` with `downloadBlob` function
   - Support for GeoJSON, KML, and KMZ formats with enhanced format handling
   - KML/KMZ exports include proper styling and feature metadata
   - Improved KML parsing with correct EPSG:4326 projection handling for geographic coordinates
   - The file input element is managed in `MapEditor.tsx` for better control

6. **Keyboard Shortcuts & Clipboard**:
   - Keyboard shortcuts are managed through `useKeyboardShortcuts.ts`
   - Clipboard state is handled in `useFeatureState.ts` with `ClipboardState` interface
   - Copy/paste operations support both cut and copy modes with proper feature tracking
   - Features are pasted at current cursor position with automatic coordinate transformation
   - Undo/redo operations use ol-ext UndoRedo interaction with singleton pattern to prevent re-initialization

7. **Undo/Redo Implementation**:
   - UndoRedo interaction is initialized once in `MapInteractions.tsx` with proper guard patterns
   - All drawing operations are automatically tracked through `autoTrack: true`
   - Keyboard shortcuts (Ctrl+Z/Ctrl+Y) trigger undo/redo operations
   - Undo history persists across tool switches due to singleton implementation
   - Uses ol-ext library with proper TypeScript type definitions in `src/types/ol-ext.d.ts`

8. **Multi-Selection Implementation**:
   - Multi-selection functionality is implemented in `MapInteractions.tsx` with configurable modes
   - Supports three multi-selection modes: "shift-click" (default), "always", and "custom"
   - Drag selection allows selecting multiple features within a selection box
   - Multi-feature copy/paste/cut operations work seamlessly with the clipboard system
   - Selection state is managed through callbacks for proper state synchronization
   - Visual feedback provides clear indication of selected features and multi-selection operations

9. **Data Persistence with PGLite**:
   - PGLite database integration for local data storage with PostgreSQL compatibility
   - Map state and feature data persistence through `mapStateUtils.ts`
   - Advanced serialization utilities in `serializationUtils.ts` for complex feature storage
   - Automatic data recovery and restoration capabilities
   - Performance-optimized database operations for real-time applications

10. **Multi-Job/Project Management**:
   - Project-based data isolation with separate PGLite databases for each project
   - Comprehensive CRUD operations through `useMapProjects.ts` hook
   - Project metadata management with timestamps and persistent storage
   - Dynamic database creation and deletion with proper cleanup
   - Cross-tab synchronization using localStorage events
   - Automatic default project initialization on first app load

11. **Search Functionality**:
   - Location search using OpenStreetMap Nominatim API through ol-ext SearchNominatim
   - Autocomplete suggestions with real-time search results
   - Coordinate conversion between WGS84 and map projections
   - Zoom level optimization based on search result type and bounding box
   - Search result formatting and display with detailed address information
   - `SearchPanel.tsx` component provides search UI with result selection
   - `SearchWrapper.tsx` component integrates search functionality with map
   - Search utilities in `src/utils/searchUtils.ts` for coordinate handling and result processing

12. **Toggling Objects Feature**:
   - Feature visibility control system using `useToggleObjects.ts` hook with `useSyncExternalStore` pattern
   - `TogglingObject.tsx` component provides slide-out panel interface (Radix UI Sheet)
   - Global state management allows reactive updates across all map components
   - Visibility toggling applies null styles to hidden features while preserving data
   - Supports all drawing tools: Point, Polyline, Freehand, Arrow, GP, Tower, Junction, Triangle, Pit, Measure, Text, Legends
   - Panel triggered via "Open" button positioned at bottom-left of map (absolute left-2 bottom-2)
   - Each feature type has checkbox with icon and label for intuitive control
   - `MapInstance.tsx` checks `hiddenTypes` state and returns empty styles for hidden features

13. **Feature Name Display**:
   - Automatic name display for Point geometry features via `shouldShowName()` and `getNameTextStyle()` in `FeatureStyler.tsx`
   - Text styling: 14px Arial font with black fill and white stroke (width 3) for optimal contrast
   - Positioned -15px above point with z-index 100 to appear above other features
   - Excludes features with own text systems (arrows, text features, legends, measure)
   - Names retrieved from feature's `name` property
   - Integrated into `getFeatureStyle()` function returning combined styles array
   - Works seamlessly with icon features (GP, Tower, Junction, Triangle, Pit)
   - Respects toggling system - names hidden when parent feature type is hidden

14. **Enhanced Properties Panel**:
   - Unified property system consolidating name, coordinates, and custom properties via `extractAllProperties()`
   - Custom properties management with add, update, and delete operations
   - Edit/Save/Cancel workflow with state backup for rollback capability
   - Protected properties (name, long, lat) have read-only keys but editable values
   - Custom properties are fully editable key-value pairs
   - Coordinate updates support all geometry types (Point, LineString, Polygon, GeometryCollection, MultiLineString)
   - Auto-open functionality when new Point features created via `onFeatureSelect` callback in `ToolManager.tsx`
   - Enhanced UI with Lucide icons (Edit2, Save, X, Plus, Trash2) and dark mode support
   - Empty state messages for better UX
   - Each property has unique ID: 'prop-name', 'prop-long', 'prop-lat', or `prop-${index}-${Date.now()}`

15. **PDF Export System**:
   - Client-side PDF generation using jsPDF library with high-quality map rendering
   - **DragBox interaction** for interactive area selection - users draw a rectangle to define export bounds
   - **PdfExportDialog component** provides configuration interface with page size (A0-A5) and resolution (72-3600 DPI) options
   - **DragBoxInstruction component** displays visual guidance overlay during area selection
   - **pdfExportUtils.ts** contains core export logic with `exportMapToPdf()` function
   - **Progress tracking system** with stage-based updates: preparing → rendering → creating → complete
   - **Canvas size management** with automatic scaling for large dimensions (max 12192px)
   - **Aspect ratio preservation** between selected extent and PDF page size
   - **Format optimization** - JPEG for high-resolution exports (≥300 DPI), PNG for lower resolutions
   - **Map state preservation** - Original map view restored after export
   - **3-minute timeout** for rendering operations to handle large/complex maps
   - **White background fill** for professional PDF output
   - **Performance hints** - Page sizes labeled with speed indicators (A5 "fast", A0 "slow")
   - **Resolution options**: 72 DPI (fastest), 150, 300 (standard), 600 (high), 1200 (ultra, default), 2400 (maximum), 3600 DPI (maximum quality, very slow)
   - Export workflow: Click PDF button → DragBox area selection → Configure dialog → Progress tracking → Download

16. **Visual Feedback Enhancements**:
   - **LoadingOverlay** component used for job switching with "Switching job..." message
   - **JobSelection** component displays loading state with Loader2 spinner during project switches
   - **CreatingJob** component shows inline loading overlay during job creation with backdrop blur
   - **Disabled states** prevent multiple submissions during async operations
   - **Full-screen overlays** with z-50 positioning for critical operations
   - **Lucide Loader2 icon** provides consistent spinning animation across all loading states

17. **Split and Merge Tools**:
   - **Split Tool** functionality implemented in `MapInteractions.tsx` with click-to-split interaction
   - **Merge Tool** functionality with endpoint snapping and proximity detection
   - **`splitUtils.ts`** provides comprehensive utilities for both split and merge operations
   - **Property preservation** - All feature properties copied to split/merged results with intelligent handling
   - **Measure feature support** - Automatically recalculates distances for measure features after split
   - **`isSplittableFeature()`** - Validates that only LineString features (excluding arrows) can be split
   - **`isMergeableFeature()`** - Validates that only LineString features (excluding arrows) can be merged
   - **`copyFeatureProperties()`** - Preserves styling, names, and custom properties with name indexing for splits
   - **`findNearbyEndpoint()`** - Detects nearby endpoints for merge operations with configurable tolerance
   - **`mergeLineStrings()`** - Merges two LineString features with intelligent coordinate ordering
   - **`performMerge()`** - Complete merge operation including feature removal and addition
   - **MergePropertiesDialog** - User-friendly property conflict resolution with radio button selection
   - **Endpoint snapping** - Visual feedback and automatic snapping when dragging endpoints near each other
   - **Custom property support** - Merge dialog allows selecting which properties to keep from each feature

18. **Google Earth Icon Integration**:
   - **IconPickerDialog component** - Full-featured icon selection dialog with search and categorization
   - **400+ Google Earth icons** organized into 8 categories for comprehensive icon library
   - **Icon categories** - Paddle (numbered/lettered markers), Pushpin, Shapes (POI icons), Map Files, Palettes 2-5, Track Directional
   - **`iconUtils.ts`** - Centralized icon management with `getIconCategories()` and `getIconFullPath()` functions
   - **Search functionality** - Filter icons by name for quick selection
   - **Category organization** - Icons grouped logically for easy browsing
   - **Point tool integration** - Icon picker opens when placing Point features for custom icon selection
   - **Icon path management** - All icons stored in `public/google_earth_icons/` directory with organized subdirectories
   - **Responsive grid layout** - Icons displayed in grid with hover effects and visual feedback

#### Benefits of the New Architecture
- **Easier debugging** - Issues can be isolated to specific components
- **Better testing** - Each component can be unit tested independently
- **Improved reusability** - Components can be reused in other parts of the application
- **Cleaner code** - Related functionality is grouped together
- **Type safety** - Better TypeScript support with proper interfaces and props

### Current Branch: tools

The `tools` branch includes the latest features including Split/Merge functionality and Google Earth icon picker.

### Recent Changes

#### Split/Merge Tools & Icon Picker (Latest - v2.9)
- **Split Tool** - Complete LineString splitting functionality with click-to-split interaction
- **Merge Tool** - LineString merging with endpoint snapping and automatic detection
- **`MergePropertiesDialog.tsx` component** - Property conflict resolution dialog for merge operations
- **Property conflict resolution** - Radio button selection for choosing properties when merging features
- **`splitUtils.ts` utility** - Comprehensive split and merge utilities with property preservation
- **Split functionality** - Splits LineString features while preserving styling, names, and custom properties
- **Measure distance recalculation** - Automatically recalculates distances for split measure features
- **Merge endpoint detection** - Automatic detection of nearby endpoints with configurable tolerance
- **Merge coordinate merging** - Intelligent coordinate merging with proper direction handling
- **Property preservation** - Copies all properties from original features to split/merged results
- **Google Earth Icon Picker** - `IconPickerDialog.tsx` component with comprehensive icon selection
- **Icon categorization** - 400+ icons organized into categories: Paddle, Pushpin, Shapes, Map Files, Palette 2-5, Track Directional
- **`iconUtils.ts` utility** - Icon path management and category organization
- **Icon search** - Search functionality for finding icons by name
- **Point tool integration** - Icon picker integrated with Point tool for custom icon placement
- **Split/Merge configuration** - Added split and merge tool configurations in `toolConfig.ts`
- **Feature type validation** - Only LineString features (excluding arrows) can be split or merged
- **Name indexing for splits** - Split features automatically get indexed names (e.g., "Line 1", "Line 2")

#### PDF Export & Visual Feedback (v2.8)
- **PDF Export Functionality** - Complete client-side PDF generation system with high-quality map rendering
- **`PdfExportDialog.tsx` component** - Comprehensive dialog with page size (A0-A5), resolution (72-3600 DPI), and real-time progress tracking
- **`DragBoxInstruction.tsx` component** - Interactive overlay guiding users through area selection process
- **DragBox area selection** - OpenLayers DragBox interaction for selecting specific map regions to export
- **3600 DPI support** - Maximum quality export option added alongside existing resolution options
- **Progress tracking system** - Stage-based progress bar with percentage display (preparing → rendering → creating → complete)
- **`pdfExportUtils.ts` utility** - Core export functionality with canvas rendering, aspect ratio preservation, and format optimization
- **PDF types system** - Complete TypeScript definitions in `src/types/pdf.ts` for PageSize, Resolution, and export configuration
- **Canvas size management** - Automatic scaling for large dimensions with 12192px maximum and aspect ratio preservation
- **Format optimization** - Smart JPEG/PNG selection based on resolution (JPEG for ≥300 DPI exports)
- **Map state preservation** - Automatic restoration of original view after export completion
- **Performance hints** - User-friendly labels indicating export speed for different page sizes
- **Visual feedback for job operations** - Enhanced loading states during project creation and switching
- **LoadingOverlay enhancements** - Full-screen overlay with backdrop blur for job switching transitions
- **JobSelection loading states** - Loader2 spinner in dropdown trigger with disabled state during switches
- **CreatingJob inline overlay** - Centered loading indicator with "Creating job..." message in dialog
- **jsPDF integration** - Added jsPDF (v3.0.4) and @types/jspdf (v2.0.0) dependencies for PDF generation
- **Export workflow** - Seamless user experience: PDF button → DragBox selection → Configuration → Progress → Download

#### Toggling Objects & Enhanced Features (v2.7)
- **Toggling Objects Feature** - Comprehensive visibility control system for showing/hiding feature types
- **`TogglingObject.tsx` component** - Slide-out panel interface using Radix UI Sheet with checkboxes for each tool
- **`useToggleObjects.ts` hook** - Global state management using `useSyncExternalStore` for reactive visibility control
- **Feature visibility control** - Hide/show Point, Polyline, Freehand, Arrow, GP, Tower, Junction, Triangle, Pit, Measure, Text, and Legends
- **Seamless integration** - Visibility checks in `MapInstance.tsx` apply null styles to hidden features while preserving data
- **Automatic name display for Point features** - Point geometry features automatically show their names as text labels above the icon
- **`shouldShowName()` function** - Determines which features should display names (Point geometries excluding arrows, text, legends, measure)
- **`getNameTextStyle()` function** - Creates consistent name text styling (14px Arial, black fill, white stroke, -15px offset, z-index 100)
- **Name integration** - Names seamlessly integrate with icon features (GP, Tower, Junction, Triangle, Pit)
- **Enhanced Properties Panel** - Major upgrade with custom properties management and improved edit workflow
- **Custom properties CRUD** - Add, update, and delete unlimited custom key-value pairs for any feature
- **Unified property system** - `extractAllProperties()` consolidates name, coordinates, and custom properties
- **Edit/Save/Cancel workflow** - Full state management with backup and rollback capability
- **Auto-open on Point drop** - Properties Panel automatically opens when new Point features are created
- **Enhanced UI elements** - Modern interface with Lucide icons (Edit2, Save, X, Plus, Trash2) and dark mode support
- **Protected and custom properties** - Protected properties (name, long, lat) with read-only keys; custom properties fully editable
- **New UI components** - Added Radix UI Sheet and Checkbox components for enhanced user interface
- **Icon styling improvements** - Refined icon rendering to properly integrate with name display system

#### Search Functionality Implementation (v2.6)
- **Location search with Nominatim** - Integrated OpenStreetMap Nominatim API for place search and geocoding
- **Autocomplete search** - Real-time search suggestions with comprehensive place data
- **Smart zoom control** - Automatic zoom level adjustment based on search result type and bounding box
- **SearchPanel component** - Dedicated search UI with result list and detailed information display
- **SearchWrapper component** - Integration layer that connects search functionality with map instance
- **Coordinate conversion utilities** - Seamless conversion between WGS84 coordinates and map projections
- **Search result formatting** - Enhanced display of search results with address details and place metadata
- **ol-ext SearchNominatim integration** - Leveraged ol-ext library for robust search functionality

#### Enhanced Multi-Selection Functionality (v2.5)
- **Advanced multi-selection modes** - Support for shift-click, always-on, and custom multi-selection modes
- **Drag selection support** - Select multiple features by dragging a selection box
- **Multi-feature operations** - Enhanced copy, paste, and cut operations for multiple selected features
- **Improved selection feedback** - Visual feedback for multi-selection operations with proper highlighting
- **Flexible selection modes** - Configurable multi-selection behavior through `multiSelectMode` parameter
- **Enhanced interaction handling** - Improved event handling for complex multi-selection scenarios

#### Multi-Job Project Management (v2.4)
- **Project-based architecture** - Complete multi-job system with isolated PGLite databases for each project
- **`useMapProjects.ts` hook** - Comprehensive project management with CRUD operations and state persistence
- **`JobSelection.tsx` component** - Advanced project selection interface with edit/delete functionality and keyboard shortcuts
- **`CreatingJob.tsx` component** - Streamlined project creation dialog with validation and immediate project switching
- **Dynamic database management** - Automatic PGLite database creation, initialization, and cleanup for each project
- **Cross-tab synchronization** - Real-time project list updates across browser tabs using localStorage events
- **Automatic default project** - Seamless first-time user experience with default "My First Map" project
- **Project metadata tracking** - Complete timestamp management for creation and modification tracking
- **Integrated project switching** - Immediate project switching with proper database connection management and UI updates

#### Data Persistence with PGLite (v2.3)
- **PGLite database integration** - Implemented PostgreSQL-compatible local database for reliable data storage
- **Advanced serialization system** - New `serializationUtils.ts` handles complex feature serialization and deserialization
- **Map state persistence** - `mapStateUtils.ts` provides comprehensive map state management and recovery
- **Automatic data recovery** - Robust restoration of application state and features on startup
- **Performance optimization** - Efficient database operations optimized for real-time map interactions
- **Enhanced data integrity** - Comprehensive error handling and validation for database operations
- **Seamless integration** - Persistence layer integrates cleanly with existing component architecture

#### Undo/Redo Implementation (v2.2)
- **Complete undo/redo functionality** - Implemented comprehensive undo/redo system using ol-ext UndoRedo interaction
- **Keyboard shortcuts** - Added Ctrl+Z (undo) and Ctrl+Y (redo) keyboard shortcuts
- **All drawing operations tracked** - Point, Polyline, Line, Freehand, Arrow, GP, Tower, Junction Point, Legend, Text tools
- **Singleton pattern** - UndoRedo interaction initialized once to prevent history reset on tool switches
- **Auto-tracking** - Uses ol-ext's built-in drawing interaction tracking with `autoTrack: true`
- **History persistence** - Undo/redo state persists across tool switches due to proper initialization guard
- **Type safety** - Leverages existing TypeScript definitions in `src/types/ol-ext.d.ts`
- **DRY compliance** - Follows established architectural patterns and integrates seamlessly with existing codebase

#### Cut, Copy, and Paste Implementation (v2.1)
- **Full clipboard functionality** - Implemented cut, copy, and paste operations with keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V)
- **Smart cursor tracking** - Features are pasted at current cursor position with fallback to map center
- **Clipboard state management** - Added `ClipboardState` interface in `useFeatureState.ts` with proper feature tracking
- **Keyboard shortcuts system** - New `useKeyboardShortcuts.ts` hook for managing all keyboard interactions
- **Feature validation** - Only copyable features are included in clipboard operations with proper filtering
- **Automatic tool switching** - Returns to Select tool after copy/cut operations for better workflow

#### Point Delete Functionality in Polylines
- **Vertex deletion** - Added ability to delete individual points/vertices from polylines using Delete key
- **Enhanced Modify interaction** - Improved polyline editing with precise vertex control
- **Visual feedback** - Clear indication of selectable vertices for deletion

#### Measure Tool Implementation (v2.0)
- **Added Measure tool** for distance measurement with custom dark gray dashed styling (#3b4352, width 2, dash pattern [12, 8])
- **Distance text display** - Shows formatted distance at the end point of each polyline with automatic unit switching (m/km)
- **Legend separation** - Measure tool is completely independent and excluded from legend dropdown selection
- **Enhanced user experience** - Removed alert popups, distance is now displayed inline with good contrast styling
- **Integrated styling system** - Uses dedicated `getMeasureTextStyle` function in `FeatureStyler.tsx` for consistent appearance
- **Proper feature management** - Measure features have `isMeasure: true` property and stored distance data

#### Major Architecture Refactoring
- **Complete codebase refactoring** - Broke down the monolithic 821-line MapEditor.tsx into modular, reusable components
- **Added custom hooks** - Implemented `useMapState`, `useToolState`, and `useFeatureState` for better state management
- **Component separation** - Created specialized components:
  - `MapInstance.tsx` - Core map initialization and setup
  - `MapInteractions.tsx` - Select/Modify/Transform interactions
  - `ToolManager.tsx` - Tool activation and drawing logic
  - `FeatureStyler.tsx` - All styling functionality
  - `FileManager.tsx` - Import/export operations
  - `LegendDropdown.tsx` - Legend management (refactored from Legend.tsx)
- **UI Components Modernization** - Added Radix UI components for better accessibility and consistency
- **Improved maintainability** - Each component now has a single responsibility
- **Enhanced testability** - Smaller components are easier to unit test
- **Better code organization** - Clear separation of concerns and consistent architecture patterns
- **TypeScript improvements** - All type errors resolved and enhanced type safety
- **Configuration restructuring** - Moved tool config to `src/config/` for better organization

#### Icon Tools Implementation (Updated in v2.7)
- **Tower tool** - Place tower markers with custom SVG icons
- **Junction Point tool** - Place junction/connectivity points
- **GP (General Purpose) tool** - General purpose drawing tool with icon support
- **Triangle and Pit icons** - Additional icon-based drawing tools
- **Icon component architecture** - Each icon has its own React component with integrated click handlers
- **Icon styling improvements** - Refined icon rendering to properly integrate with automatic name display system
- **ToolBox icon** - Dedicated toolbox UI icon component

#### Text Tool Enhancement (Latest)
- **Advanced text manipulation** - Text tool with rotate and scale capabilities for precise label placement
- **Interactive text controls** - Real-time sliders for rotation (0-360°) and scale (0.5-3.0) in TextDialog
- **Text drawing functionality** - Complete text tool implementation for placing and editing text labels on maps
- **`TextDialog.tsx` component** - Enhanced modal dialog with rotation and scale controls, keyboard shortcuts (Enter to submit, Escape to cancel)
- **`src/icons/Text.ts`** - Text tool styling and click handler with support for scale and rotation parameters
- **Text styling system** - Features 14px Arial font with white stroke outline and black fill for visibility
- **Position-based text placement** - Text features use Point geometry and are positioned at click coordinates
- **Transform support** - Text features can be rotated and scaled using slider controls in the dialog
- **Text editing support** - Full CRUD operations with preserved rotation and scale values
- **Feature integration** - Text features marked as editable with `textScale` and `textRotation` properties
- **Undo/Redo support** - Text operations including transform changes tracked through undo/redo system

#### Enhanced Download Functionality
- **Multi-format download support** - Direct download of maps in GeoJSON, KML, and KMZ formats
- **Download integration** - Seamlessly integrated into toolbar with dedicated download button
- **`downloadBlob` function** - Client-side download implementation for all file formats
- **Enhanced KML/KMZ exports** - Improved format handling with proper styling preservation
- **Feature metadata inclusion** - Downloads include all feature properties and styling information
- **Automatic file naming** - Smart file naming with format-specific extensions
- **No server dependency** - Pure client-side download functionality using Blob URLs

#### Properties Panel Enhancement (Updated in v2.7)
- **Feature properties display** - Show detailed information about selected features including coordinates and metadata
- **Coordinate editing** - Edit feature positions through longitude/latitude input fields
- **Name/attribute editing** - Edit feature names and other attributes
- **Custom properties management** - Add, update, and delete unlimited custom key-value pairs for any feature
- **Edit/Save/Cancel workflow** - Full state management with backup for rollback capability
- **Auto-open on Point drop** - Automatically opens when new Point features are created for immediate editing
- **Real-time updates** - Changes are immediately reflected on the map
- **Geometry type support** - Works with Point, LineString, Polygon, and other geometry types

#### Previous Feature Updates
- Added Arrow tool for drawing arrows with various styles
- Enhanced Legend component with full CRUD operations (now LegendDropdown)
- **Updated Select tool for universal selection** - All features can now be selected, but editing is restricted to Polyline, Freehand Line, Arrow, Legend, and Text features
- **Enhanced Transform tool** - Now respects editability restrictions and only works on editable features
- **Fixed icon feature editability** - Pit, Triangle, GP, and Junction features are now properly non-editable while remaining selectable
- **Unified visual selection feedback** - All selected features now have consistent blue highlighting regardless of editability
- Added file export support for KMZ format in addition to GeoJSON and KML
- Implemented auto-save functionality
- Added keyboard shortcuts for tool switching
- Enhanced UI with improved tooltips and visual feedback

### Version History
- **tools** (current) - Latest features including **Split/Merge Tools & Icon Picker (v2.9)** with LineString split/merge functionality, property conflict resolution, Google Earth icon picker with 400+ icons, endpoint snapping, and measure distance recalculation; **PDF Export (v2.8)** with DragBox area selection, configurable page sizes and resolutions (72-3600 DPI), progress tracking, and visual feedback enhancements for job operations; **Toggling Objects (v2.7)** with feature visibility control, **Automatic name display for Point features**, **Enhanced Properties Panel with custom properties management**, **Auto-open Properties Panel on Point drop**, Search functionality with Nominatim integration (v2.6), Enhanced Text tool with rotate/scale controls, Multi-format download functionality (GeoJSON, KML, KMZ), Enhanced Multi-Selection Functionality (v2.5), Multi-Job Project Management (v2.4), PGLite persistence (v2.3), advanced serialization, Undo/Redo (v2.2), Cut/Copy/Paste (v2.1), point delete, Measure tool (v2.0), icon improvements, and architecture refactoring
- **exportPDF** - Previous branch with PDF Export functionality and visual feedback enhancements
- **Icons2.0** - Enhanced Multi-Selection Functionality, Multi-Job Project Management, and architecture improvements
- **Icons** - Icon tools implementation
- **Legends** - Legend component enhancements
- **Satellite** - Arrow tool and satellite view improvements
- **feature-1** - Transform interaction and custom tools foundation
- **main** - Stable baseline

---

_This file was generated by Claude Code_
