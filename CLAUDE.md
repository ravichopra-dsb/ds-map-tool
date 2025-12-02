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
- **Map Library**: OpenLayers (v10.6.1) + ol-ext (v4.0.36)
- **Styling**: Tailwind CSS (v4.1.16)
- **UI Components**: Radix UI components
- **UI Icons**: Lucide React
- **Build Tool**: Vite 7.1.7
- **Package Manager**: npm/pnpm
- **Routing**: React Router 7.9.6

### Key Features
- Interactive map with OSM and satellite view toggle
- Advanced drawing tools (Point, Polyline, Line, Freehand, Arrow, GP, Tower, Junction Point, Measure)
- File import/export support (GeoJSON, KML, KMZ)
- Tool selection system with toolbar
- Universal feature selection (all features can be selected) with restricted editing (only Polyline, Freehand Line, Arrow, and Legend are editable)
- Legend creation and management
- Transform tool for advanced feature manipulation (rotate, scale, stretch)
- Distance measurement tool with inline text display
- **Cut, Copy, and Paste functionality** with keyboard shortcuts (Ctrl+C, Ctrl+X, Ctrl+V)
- **Point delete functionality** in polylines with vertex manipulation
- **Enhanced keyboard shortcuts** for improved workflow efficiency
- **Undo/Redo functionality** with keyboard shortcuts (Ctrl+Z, Ctrl+Y) for all drawing operations
- **Multi-Job/Project Management** - Create, edit, delete, and switch between multiple map projects with isolated databases
- **Data persistence with PGLite** - Local PostgreSQL-compatible database for reliable data storage and retrieval
- **Enhanced serialization utilities** - Advanced feature serialization and deserialization for complex data structures
- **Project-based data isolation** - Each project maintains its own separate database and map state
- **Multi-selection functionality** - Enhanced multi-selection with drag, copy, paste, and cut operations for multiple features
- Smooth map view transitions

### Architecture

The application follows a modular, component-based architecture with clear separation of concerns:

#### Core Components (`src/components/`)
- **`MapEditor.tsx`** - Main orchestrator component that coordinates all sub-components and project management
- **`MapInstance.tsx`** - Core OpenLayers map initialization, layer setup, and view configuration
- **`MapInteractions.tsx`** - Select, Modify, Transform, and UndoRedo interaction management
- **`ToolManager.tsx`** - Tool activation, draw interactions, and click handler coordination
- **`FeatureStyler.tsx`** - All feature styling logic (arrows, legends, icons, text)
- **`FileManager.tsx`** - File import/export operations (GeoJSON, KML, KMZ)
- **`ToolBar.tsx`** - UI toolbar for tool selection
- **`LegendDropdown.tsx`** - Legend creation and management component
- **`MapViewToggle.tsx`** - Map view switcher component
- **`LoadingOverlay.tsx`** - Loading overlay for transitions
- **`JobSelection.tsx`** - Multi-job/project selection, creation, and management component with edit/delete functionality
- **`CreatingJob.tsx`** - New job/project creation dialog with validation
- **`ui/`** - Reusable UI components (Button, Card, Dropdown, Toggle, ToggleGroup)

#### Custom Hooks (`src/hooks/`)
- **`useMapState.ts`** - Map view state, layer switching, and transition management
- **`useToolState.ts`** - Active tool and legend selection state management
- **`useFeatureState.ts`** - Feature selection, editing state, and clipboard management
- **`useClickHandlerManager.ts`** - OpenLayers event handler management
- **`useKeyboardShortcuts.ts`** - Keyboard shortcuts management for cut/copy/paste and undo/redo operations
- **`useMapProjects.ts`** - Multi-job/project management with isolated PGLite databases, project CRUD operations, and data persistence

#### Configuration & Tools
- **`src/config/toolConfig.ts`** - Tool configuration and definitions
- **`src/tools/legendsConfig.ts`** - Legend type configurations
- **Individual icon components** - Each icon (Triangle, Pit, GP, Tower, JunctionPoint) has its own component with integrated click handlers

#### Utilities (`src/utils/`)
- **`featureUtils.ts`** - Feature type detection and styling utilities
- **`styleUtils.ts`** - Consistent styling functions
- **`colorUtils.ts`** - Color manipulation utilities
- **`interactionUtils.ts`** - Draw interaction creation utilities
- **`featureTypeUtils.ts`** - Feature selection and editability logic
- **`geometryUtils.ts`** - Geometry conversion utilities (Circle to Polygon approximation for GeoJSON serialization)
- **`mapStateUtils.ts`** - Map state management and persistence utilities
- **`serializationUtils.ts`** - Advanced feature serialization and deserialization for database storage

#### Icons (`src/icons/`)
- **Icon components** - Triangle, Pit, GP, Junction Point, Tower SVG components and click handlers
- **`ToolBoxIcon.tsx`** - Toolbox icon component

#### Configuration (`src/`)
- **`config/`** - Tool configuration and definitions (moved from `src/tools/`)
- **`types/`** - TypeScript type definitions (including ol-ext types)
- **`lib/`** - Shared utility functions (e.g., cn for className merging)

### Available Tools
- **Select**: Select all features (universal selection) with multi-selection support (shift-click, drag selection) and editing restricted to Polyline, Freehand Line, Arrow, and Legend features
- **Hand**: Pan navigation mode
- **Point**: Place point markers
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
- **Text**: Place and edit text labels (planned feature)

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

5. **File Operations**:
   - File import/export logic is in `FileManager.tsx`
   - Support for additional formats can be added there
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

#### Benefits of the New Architecture
- **Easier debugging** - Issues can be isolated to specific components
- **Better testing** - Each component can be unit tested independently
- **Improved reusability** - Components can be reused in other parts of the application
- **Cleaner code** - Related functionality is grouped together
- **Type safety** - Better TypeScript support with proper interfaces and props

### Current Branch: Icons2.0

The `Icons2.0` branch includes the latest features and improvements over the main branch.

### Recent Changes

#### Enhanced Multi-Selection Functionality (Latest - v2.5)
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
- **All drawing operations tracked** - Point, Polyline, Line, Freehand, Arrow, GP, Tower, Junction Point, Legend tools
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

#### Icon Tools Implementation
- **Tower tool** - Place tower markers with custom SVG icons
- **Junction Point tool** - Place junction/connectivity points
- **GP (General Purpose) tool** - General purpose drawing tool with icon support
- **Triangle and Pit icons** - Additional icon-based drawing tools
- **Icon component architecture** - Each icon has its own React component with integrated click handlers
- **ToolBox icon** - Dedicated toolbox UI icon component

#### Previous Feature Updates
- Added Arrow tool for drawing arrows with various styles
- Enhanced Legend component with full CRUD operations (now LegendDropdown)
- **Updated Select tool for universal selection** - All features can now be selected, but editing is restricted to Polyline, Freehand Line, Arrow, and Legend features
- **Enhanced Transform tool** - Now respects editability restrictions and only works on editable features
- **Fixed icon feature editability** - Pit, Triangle, GP, and Junction features are now properly non-editable while remaining selectable
- **Unified visual selection feedback** - All selected features now have consistent blue highlighting regardless of editability
- Added file export support for KMZ format in addition to GeoJSON and KML
- Implemented auto-save functionality
- Added keyboard shortcuts for tool switching
- Enhanced UI with improved tooltips and visual feedback

### Version History
- **Icons2.0** (current) - Latest features including Enhanced Multi-Selection Functionality, Multi-Job Project Management, PGLite persistence, advanced serialization, Cut/Copy/Paste, point delete, Measure tool, icon improvements, and architecture refactoring
- **Icons** - Icon tools implementation
- **Legends** - Legend component enhancements
- **Satellite** - Arrow tool and satellite view improvements
- **feature-1** - Transform interaction and custom tools foundation
- **main** - Stable baseline (currently 11 commits behind)

---

_This file was generated by Claude Code_
