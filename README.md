# DS Map Tool

A powerful web-based map editor built with React, TypeScript, and OpenLayers that enables advanced drawing, editing, and data management capabilities with persistent storage.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm package manager

### Installation & Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ds-map-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build
```

## 🗺️ Project Overview

DS Map Tool is an interactive map editor that combines powerful drawing capabilities with professional-grade features for creating, editing, and managing geographic data.

## ✨ Current Release Highlights (tools branch)

### 🆕 Latest Features (v2.9)
- **Split Tool**: Split LineString features by clicking on them with property preservation
- **Merge Tool**: Merge LineString features by dragging endpoints together with conflict resolution
- **Google Earth Icon Picker**: 400+ icons across 8 categories (Paddle, Pushpin, Shapes, Map Files, etc.)
- **PDF Export**: High-quality map export with DragBox area selection and configurable resolution (72-3600 DPI)
- **Search Functionality**: Location search with OpenStreetMap Nominatim API and autocomplete
- **Toggling Objects**: Show/hide different feature types through a slide-out panel

### 🎯 Core Features
- **Enhanced Text Tool**: Place text labels with interactive rotation (0-360°) and scale (0.5-3.0) controls
- **Direct Download Functionality**: Export maps directly to GeoJSON, KML, and KMZ formats
- **Multi-Selection Support**: Select multiple features using drag selection and Shift+Click
- **Properties Panel**: View and edit feature coordinates, names, and custom properties
- **Enhanced KML/KMZ Handling**: Improved format support with proper EPSG:4326 projection

### 🏗️ Architecture Improvements
- **Modular Component System**: Refactored into specialized, reusable components
- **Advanced State Management**: Custom hooks for map, tool, and feature states
- **PGLite Database Integration**: PostgreSQL-compatible local storage with project isolation
- **Cross-Tab Synchronization**: Real-time project updates across browser tabs

### 🎯 User Experience
- **Multi-Job Project Management**: Create, edit, and switch between multiple map projects
- **Universal Feature Selection**: All features can be selected with appropriate edit permissions
- **Comprehensive Undo/Redo**: Complete history tracking for all drawing operations
- **Smart Clipboard Operations**: Copy, cut, and paste features with automatic coordinate transformation

### Core Capabilities
- **Interactive Map Display** with OpenStreetMap and satellite view toggle
- **Advanced Drawing Tools** for creating various geometric features including text labels
- **Split & Merge Tools** for dividing and combining LineString features with property preservation
- **Google Earth Icon Library** with 400+ icons for professional map markers
- **PDF Export System** with DragBox area selection and high-resolution output (up to 3600 DPI)
- **Location Search** with OpenStreetMap Nominatim API and autocomplete suggestions
- **Feature Visibility Control** to show/hide different feature types on the map
- **Feature Management** with selection, editing, and transformation capabilities
- **Multi-Job Project Management** with isolated databases for different projects
- **Data Persistence** with local PostgreSQL-compatible storage using PGLite
- **Enhanced File Operations** supporting GeoJSON, KML, and KMZ formats with direct download
- **Advanced Text Manipulation** with rotate and scale capabilities for precise labeling
- **Collaborative Features** with clipboard operations, undo/redo, and multi-selection support

## 🛠️ Available Tools & Features

### Drawing Tools
| Tool | Description | Use Case |
|------|-------------|----------|
| **Select** | Universal feature selection and editing | Select and modify existing features |
| **Hand** | Pan navigation mode | Navigate around the map |
| **Point** | Place point markers with icon picker | Mark locations with 400+ Google Earth icons |
| **Polyline** | Draw straight lines with vertex control | Create precise paths and boundaries |
| **Line** | Draw continuous line segments | Free-form line drawing |
| **Freehand** | Freehand drawing | Sketch irregular shapes |
| **Arrow** | Create directional arrows | Indicate flow or direction |
| **GP** | General purpose drawing tool | Custom marker placement |
| **Tower** | Place tower infrastructure markers | Map communication towers |
| **Junction Point** | Mark connection points | Identify network junctions |
| **Legend** | Create map legends | Add descriptive labels and information |
| **Measure** | Distance measurement tool | Calculate distances between points |
| **Text** | Place and edit text labels | Add annotations with rotate/scale controls |
| **Transform** | Advanced feature manipulation | Rotate, scale, and stretch features |
| **Split** | Split LineString features | Divide lines while preserving properties |
| **Merge** | Merge LineString features | Combine lines with conflict resolution |
| **Search** | Location search with autocomplete | Find places using OpenStreetMap Nominatim |

### Data Management Features
- **Multi-Job Project Management**: Create, edit, and switch between multiple map projects
- **Multi-Selection Support**: Select multiple features with drag selection and shift-click
- **Copy/Paste Operations**: Cut, copy, and paste features with keyboard shortcuts
- **Undo/Redo System**: Complete history tracking for all drawing operations
- **Vertex Editing**: Delete and modify individual points in polylines
- **Properties Panel**: View and edit feature properties including coordinates and custom properties
- **Feature Styling**: Customize appearance of all map elements
- **Enhanced File Operations**: Import/Export and direct download of multiple geospatial formats
- **Split & Merge Tools**: Divide and combine LineString features with property preservation
- **PDF Export**: High-quality map export with DragBox selection and configurable settings
- **Location Search**: Find places using OpenStreetMap Nominatim API with autocomplete
- **Feature Visibility**: Toggle visibility of different feature types without deleting data
- **Icon Library**: Access 400+ Google Earth icons for professional point markers

## 🎯 Workflow Guide

### 1. Getting Started
1. **Launch the application** - The map loads with OpenStreetMap view and creates a default project
2. **Familiarize with the interface** - Toolbar on the left, map view on the right, project selector at the top
3. **Choose your base layer** - Toggle between OSM and satellite views using the layer control
4. **Create or select a project** - Use the project selector to create new jobs or switch between existing ones

### 2. Creating Features
1. **Select a drawing tool** from the toolbar
2. **Click on the map** to start drawing:
   - **Point tools**: Single click to place
   - **Line tools**: Click to add vertices, double-click to finish
   - **Freehand**: Click and drag to draw
   - **Text tool**: Click to open text dialog, enter content and adjust rotation/scale
3. **Customize appearance** using the styling options (when available)
   - **Text features**: Use interactive sliders for rotation (0-360°) and scale (0.5-3.0)

### 3. Editing Existing Features
1. **Switch to Select tool**
2. **Click on any feature** to select it (all features are selectable)
3. **Multi-selection options**:
   - **Shift+Click**: Add/remove features from selection
   - **Drag selection**: Select multiple features within a box
4. **Edit capabilities vary by feature type**:
   - **Editable features**: Polyline, Freehand Line, Arrow, Legend, Text
   - **Non-editable features**: Points, Tower, Junction Point (selectable but not modifiable)
5. **Properties Panel**: View and edit feature coordinates and attributes
6. **Use transformation tools** for advanced manipulation (rotate, scale, stretch)

### 4. Managing Your Data
1. **Project Management**:
   - **Create new projects** using the project selector
   - **Switch between projects** with isolated databases
   - **Edit/delete projects** with automatic data preservation
2. **Data persistence** - All work is automatically saved to local database
3. **Export your map**:
   - **Download directly** using the toolbar download button
   - **Choose format**: GeoJSON, KML, or KMZ
   - **Enhanced formats**: Improved KML/KMZ with proper styling preservation
4. **Import existing data**:
   - **Drag and drop** or select files
   - **Supported formats**: GeoJSON, KML, KMZ with EPSG:4326 projection handling
   - **Automatic conversion** to map features with proper styling

### 5. Advanced Operations

#### Multi-Selection & Copy/Paste Workflow
1. **Select features** using the Select tool:
   - **Single selection**: Click on individual features
   - **Multi-selection**: Hold Shift and click multiple features
   - **Drag selection**: Draw a box around multiple features
2. **Copy** (Ctrl+C) or **Cut** (Ctrl+X) selected features
3. **Move cursor** to desired location
4. **Paste** (Ctrl+V) features at cursor position with automatic coordinate transformation

#### Undo/Redo Operations
1. **Make a mistake** while drawing or editing
2. **Undo** (Ctrl+Z) to reverse the last operation
3. **Redo** (Ctrl+Y) to restore an undone operation
4. **History persists** across tool switches and sessions

#### Distance Measurement
1. **Select Measure tool** from toolbar
2. **Click points** to create a measuring line
3. **Double-click** to finish measurement
4. **Distance displays** automatically with appropriate units (m/km)

#### Text Label Manipulation
1. **Select Text tool** from toolbar
2. **Click on map** to open text dialog
3. **Enter text content** and adjust properties:
   - **Rotation**: Use slider (0-360°) for text orientation
   - **Scale**: Use slider (0.5-3.0) for text size
4. **Position and confirm** - Text appears with applied transformations
5. **Edit existing text**: Select text feature and reopen dialog for modifications

#### Split Tool Workflow
1. **Select Split tool** from toolbar
2. **Click on a LineString feature** (Polyline, Freehand, or Measure line)
3. **Feature splits at click point** into two separate features
4. **Properties are preserved** - Names get indexed (e.g., "Line (1)", "Line (2)")
5. **Measure distances recalculated** automatically for split measure features

#### Merge Tool Workflow
1. **Select Merge tool** from toolbar
2. **Select a LineString feature** you want to merge
3. **Drag an endpoint** near another LineString's endpoint
4. **Endpoints snap together** when within tolerance distance
5. **Property conflict dialog** appears if features have different properties
6. **Choose properties** from either feature using radio buttons
7. **Merged feature created** with selected properties and combined geometry

#### PDF Export Workflow
1. **Click PDF Export button** in toolbar
2. **Draw a rectangle** using DragBox to select export area
3. **Configure export settings**:
   - **Page Size**: A0-A5 (larger = slower but higher quality)
   - **Resolution**: 72-3600 DPI (higher = better quality but slower)
4. **Click Export** and monitor progress bar
5. **PDF downloads automatically** when complete

#### Icon Picker Usage
1. **Select Point tool** from toolbar
2. **Click on map** to place a point
3. **Icon picker dialog opens** automatically
4. **Search or browse** 400+ Google Earth icons across 8 categories
5. **Click an icon** to select it for your point marker
6. **Icon appears on map** at the selected location

#### Location Search
1. **Click Search button** or use Search tool
2. **Type location name** in search box
3. **Select from autocomplete suggestions** powered by Nominatim
4. **Map zooms to location** with appropriate zoom level
5. **Search results** show detailed address information

#### Toggling Feature Visibility
1. **Click "Open" button** at bottom-left of map
2. **Slide-out panel appears** with all feature types
3. **Check/uncheck feature types** to show/hide them
4. **Changes apply instantly** to the map
5. **Hidden features preserved** - data not deleted, just visually hidden

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19.1.1** - Modern reactive UI framework
- **TypeScript** - Type-safe development experience
- **Vite 7.1.7** - Fast development build tool
- **OpenLayers 10.6.1** - Professional mapping library
- **Tailwind CSS 4.1.16** - Utility-first styling
- **Radix UI** - Accessible component library

### Key Libraries
- **ol-ext 4.0.36** - Extended OpenLayers functionality (UndoRedo, SearchNominatim, advanced interactions)
- **PGLite 0.3.14** - PostgreSQL-compatible local database for data persistence
- **jsPDF 3.0.4** - Client-side PDF generation with high-quality rendering
- **JSZip 3.10.1** - KMZ file processing and creation
- **Lucide React 0.552.0** - Modern icon library with extensive icon collection
- **Radix UI** - Accessible component library (Dialog, Dropdown, Checkbox, Slider, Sheet, Toggle)

### Data Persistence
- **Local Storage**: Basic settings and preferences
- **PGLite Database**: PostgreSQL-compatible structured feature data storage
- **Project Isolation**: Separate databases for each map project
- **Advanced Serialization**: Complex feature data handling and recovery
- **Cross-Tab Synchronization**: Real-time project updates across browser tabs
- **Automatic Recovery**: Robust restoration of application state on startup

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── MapEditor.tsx   # Main application orchestrator
│   ├── MapInstance.tsx # Map initialization and setup
│   ├── MapInteractions.tsx # Select, Modify, Transform, Split/Merge interactions
│   ├── ToolManager.tsx # Drawing tool management
│   ├── FeatureStyler.tsx # Feature styling logic
│   ├── FileManager.tsx # File import/export operations
│   ├── TextDialog.tsx  # Text input dialog with rotate/scale controls
│   ├── PropertiesPanel.tsx # Feature properties display and editing
│   ├── MergePropertiesDialog.tsx # Property conflict resolution for merges
│   ├── IconPickerDialog.tsx # Google Earth icon selection dialog
│   ├── PdfExportDialog.tsx # PDF export configuration and progress
│   ├── DragBoxInstruction.tsx # PDF export area selection guidance
│   ├── SearchPanel.tsx # Location search panel
│   ├── SearchWrapper.tsx # Search functionality wrapper
│   ├── TogglingObject.tsx # Feature visibility control panel
│   ├── JobSelection.tsx # Multi-job project management
│   ├── CreatingJob.tsx # New project creation dialog
│   ├── ToolBar.tsx     # UI toolbar for tool selection
│   ├── LegendDropdown.tsx # Legend management component
│   ├── MapViewToggle.tsx # Map view switcher
│   ├── LoadingOverlay.tsx # Loading overlay for transitions
│   └── ui/             # Reusable UI components (Button, Dialog, Sheet, etc.)
├── hooks/              # Custom React hooks
│   ├── useMapState.ts  # Map view state and layer management
│   ├── useToolState.ts # Tool selection and legend state
│   ├── useFeatureState.ts # Feature selection, editing, and clipboard
│   ├── useKeyboardShortcuts.ts # Keyboard shortcuts management
│   ├── useMapProjects.ts # Multi-job project management
│   ├── useToggleObjects.ts # Feature visibility state management
│   └── useClickHandlerManager.ts # OpenLayers event handling
├── utils/              # Utility functions
│   ├── mapStateUtils.ts # Map state management and persistence
│   ├── serializationUtils.ts # Advanced feature serialization
│   ├── featureUtils.ts # Feature type detection and utilities
│   ├── styleUtils.ts   # Consistent styling functions
│   ├── colorUtils.ts   # Color manipulation utilities
│   ├── interactionUtils.ts # Draw interaction creation
│   ├── featureTypeUtils.ts # Feature selection and editability
│   ├── geometryUtils.ts # Geometry conversion utilities
│   ├── splitUtils.ts   # Split and merge utilities
│   ├── iconUtils.ts    # Google Earth icon management
│   ├── pdfExportUtils.ts # PDF export with canvas rendering
│   └── searchUtils.ts  # Location search utilities
├── config/             # Configuration files
│   └── toolConfig.ts   # Tool definitions and settings (includes Split/Merge)
├── tools/              # Tool-specific configurations
│   └── legendsConfig.ts # Legend type configurations
├── icons/              # Custom icon components
│   ├── Text.ts         # Text tool icon and handler
│   ├── Triangle.ts     # Triangle icon
│   ├── Pit.ts          # Pit icon
│   ├── GP.ts           # General Purpose icon
│   ├── Tower.ts        # Tower icon
│   ├── JunctionPoint.ts # Junction Point icon
│   └── ToolBoxIcon.tsx # Toolbox UI icon
├── lib/                # Shared utility functions
└── types/              # TypeScript type definitions
    ├── ol-ext.d.ts     # ol-ext library type definitions
    └── pdf.ts          # PDF export configuration types
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+C** | Copy selected features |
| **Ctrl+X** | Cut selected features |
| **Ctrl+V** | Paste features at cursor |
| **Ctrl+Z** | Undo last operation |
| **Ctrl+Y** | Redo last undone operation |
| **Delete** | Delete selected vertices/points |
| **1-12** | Quick tool switching (number keys) |

## 🔧 Development

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Adding New Tools
1. **Add tool configuration** to `src/config/toolConfig.ts`
2. **Create icon component** in `src/icons/` if needed
3. **Implement tool logic** in `ToolManager.tsx`
4. **Add styling functions** to `FeatureStyler.tsx`
5. **Update utilities** in `src/utils/` as needed

### Code Architecture Principles
- **Single Responsibility**: Each component has one clear purpose
- **State Management**: Custom hooks for different types of state
- **Type Safety**: Comprehensive TypeScript usage
- **Performance**: Optimized for real-time map interactions
- **Accessibility**: WCAG compliant UI components

## 📊 Supported File Formats

### Import Formats
- **GeoJSON (.geojson)** - Standard geospatial data format
- **KML (.kml)** - Google Earth format
- **KMZ (.kmz)** - Compressed KML with images

### Export Formats
- **GeoJSON** - For web mapping applications
- **KML** - For Google Earth integration with enhanced styling preservation
- **KMZ** - Compressed format with media support
- **PDF** - High-quality map export with configurable page sizes (A0-A5) and resolution (72-3600 DPI)
- **Direct Download** - Client-side download functionality with automatic file naming

## 🎨 Feature Types & Properties

### Geometric Features
- **Points**: Single location markers with 400+ Google Earth icon options
- **Lines**: Connected point sequences with styling options
- **Polylines**: Multi-segment lines with vertex control and split capability
- **Freehand**: Hand-drawn irregular shapes with merge capability
- **Arrows**: Directional indicators with customizable heads

### Special Features
- **Legends**: Text-based information displays with full CRUD operations
- **Measurements**: Distance calculations with automatic formatting and inline display
- **Text Labels**: Place and edit text with rotation (0-360°) and scale (0.5-3.0) controls
- **Icons**: Custom SVG markers (Tower, Junction, GP, Triangle, Pit, etc.) with click handlers
- **Google Earth Icons**: 400+ professional icons across 8 categories:
  - **Paddle**: Numbered/lettered markers (1-10, A-Z) with various colors
  - **Pushpin**: Classic pushpin markers in 8 colors
  - **Shapes**: POI icons (restaurants, hotels, gas stations, landmarks, etc.)
  - **Map Files**: Directional arrows and traffic icons
  - **Palettes 2-5**: General purpose icon collections
  - **Track Directional**: Direction indicators for paths and routes

### Line Operations
- **Split**: Divide LineString features at any point while preserving properties
- **Merge**: Combine LineString features by connecting endpoints with conflict resolution

### Styling Options
- **Colors**: Full RGB color customization
- **Line Width**: Adjustable stroke width
- **Opacity**: Transparency control
- **Patterns**: Dashed, dotted, and solid line styles
- **Text Styling**: 14px Arial font with white stroke outline and black fill
- **Transform Properties**: Rotation and scale controls for text features
- **Icons**: Custom SVG markers with integrated click handlers

## 🔒 Data Persistence & Security

### Local Storage Strategy
- **Application Settings**: Stored in browser localStorage
- **PGLite Database**: PostgreSQL-compatible storage for map features
- **Project Isolation**: Separate databases for each map project
- **User Preferences**: Automatic preference saving
- **Session Recovery**: Restore last session on startup
- **Cross-Tab Sync**: Real-time project updates across browser tabs

### Data Integrity
- **Automatic Backups**: Regular data snapshots
- **Error Recovery**: Graceful handling of corruption
- **Validation**: Input sanitization and type checking
- **Migration**: Schema versioning for data updates

## 🚀 Performance Optimizations

### Rendering Optimizations
- **Virtualization**: Efficient handling of large feature sets
- **Caching**: Aggressive caching of map tiles and features
- **Lazy Loading**: On-demand feature loading
- **Debouncing**: Optimized event handling

### Database Performance
- **Indexing**: Optimized database queries
- **Batching**: Efficient bulk operations
- **Connection Pooling**: Resource management
- **Compression**: Reduced storage footprint

## 🐛 Troubleshooting

### Common Issues
1. **Map not loading**: Check network connection and CORS settings
2. **Tools not working**: Verify OpenLayers library loading
3. **Data not saving**: Check browser storage permissions
4. **Import failing**: Validate file format and structure
5. **PDF export slow**: Reduce resolution or page size for faster exports
6. **Icons not displaying**: Verify Google Earth icon files are in public/google_earth_icons/
7. **Search not working**: Check internet connection for Nominatim API access
8. **Merge not working**: Ensure endpoints are within snap tolerance distance

### Performance Issues
1. **Slow rendering**: Reduce number of features or simplify geometries
2. **Memory usage**: Clear cache and restart browser
3. **Network errors**: Check internet connectivity
4. **PDF export timeout**: For large/complex maps, reduce resolution or select smaller area
5. **Split/Merge lag**: Complex LineStrings with many vertices may take longer to process

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support with minor UI differences
- **Mobile**: Limited touch interaction support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in `CLAUDE.md`
- Review the code comments for detailed explanations

---

## 🎉 Feature Highlights Summary

**Version 2.9 (tools branch)** brings powerful new capabilities:
- ✂️ **Split & Merge** - Professional line editing with property management
- 🎨 **Icon Library** - 400+ Google Earth icons for enhanced visualization
- 📄 **PDF Export** - Publication-ready maps with high DPI output
- 🔍 **Location Search** - Find places worldwide with Nominatim
- 👁️ **Feature Toggling** - Control layer visibility without data loss

Built with ❤️ using modern web technologies for professional map editing and data management.

**Current Branch**: `tools` | **Main Technologies**: React 19 + TypeScript + OpenLayers 10 + PGLite + jsPDF