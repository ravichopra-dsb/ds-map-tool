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

### Key Features
- Interactive map with OSM and satellite view toggle
- Advanced drawing tools (Point, Polyline, Line, Freehand, Arrow, GP, Tower, Junction Point, Measure)
- File import/export support (GeoJSON, KML, KMZ)
- Tool selection system with toolbar
- Universal feature selection (all features can be selected) with restricted editing (only Polyline, Freehand Line, Arrow, and Legend are editable)
- Legend creation and management
- Transform tool for advanced feature manipulation (rotate, scale, stretch)
- Distance measurement tool with inline text display
- Smooth map view transitions

### Architecture

The application follows a modular, component-based architecture with clear separation of concerns:

#### Core Components (`src/components/`)
- **`MapEditor.tsx`** - Main orchestrator component that coordinates all sub-components
- **`MapInstance.tsx`** - Core OpenLayers map initialization, layer setup, and view configuration
- **`MapInteractions.tsx`** - Select, Modify, and Transform interaction management
- **`ToolManager.tsx`** - Tool activation, draw interactions, and click handler coordination
- **`FeatureStyler.tsx`** - All feature styling logic (arrows, legends, icons, text)
- **`FileManager.tsx`** - File import/export operations (GeoJSON, KML, KMZ)
- **`ToolBar.tsx`** - UI toolbar for tool selection
- **`LegendDropdown.tsx`** - Legend creation and management component
- **`MapViewToggle.tsx`** - Map view switcher component
- **`LoadingOverlay.tsx`** - Loading overlay for transitions
- **`ui/`** - Reusable UI components (Button, Card, Dropdown, Toggle, ToggleGroup)

#### Custom Hooks (`src/hooks/`)
- **`useMapState.ts`** - Map view state, layer switching, and transition management
- **`useToolState.ts`** - Active tool and legend selection state management
- **`useFeatureState.ts`** - Feature selection and editing state management
- **`useClickHandlerManager.ts`** - OpenLayers event handler management

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

#### Icons (`src/icons/`)
- **Icon components** - Triangle, Pit, GP, Junction Point, Tower SVG components and click handlers
- **`ToolBoxIcon.tsx`** - Toolbox icon component

#### Configuration (`src/`)
- **`config/`** - Tool configuration and definitions (moved from `src/tools/`)
- **`types/`** - TypeScript type definitions (including ol-ext types)
- **`lib/`** - Shared utility functions (e.g., cn for className merging)

### Available Tools
- **Select**: Select all features (universal selection) with editing restricted to Polyline, Freehand Line, Arrow, and Legend features
- **Hand**: Pan navigation mode
- **Point**: Place point markers
- **Polyline**: Draw straight lines
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

#### Benefits of the New Architecture
- **Easier debugging** - Issues can be isolated to specific components
- **Better testing** - Each component can be unit tested independently
- **Improved reusability** - Components can be reused in other parts of the application
- **Cleaner code** - Related functionality is grouped together
- **Type safety** - Better TypeScript support with proper interfaces and props

### Current Branch: Icons2.0

The `Icons2.0` branch includes the latest features and improvements over the main branch.

### Recent Changes

#### Measure Tool Implementation (Latest - v2.0)
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
- **Icons2.0** (current) - Latest features including Measure tool, icon improvements, and architecture refactoring
- **Icons** - Icon tools implementation
- **Legends** - Legend component enhancements
- **Satellite** - Arrow tool and satellite view improvements
- **feature-1** - Transform interaction and custom tools foundation
- **main** - Stable baseline (currently 11 commits behind)

---

_This file was generated by Claude Code_
