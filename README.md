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

### Core Capabilities
- **Interactive Map Display** with OpenStreetMap and satellite view toggle
- **Advanced Drawing Tools** for creating various geometric features
- **Feature Management** with selection, editing, and transformation capabilities
- **Data Persistence** with local database storage using PGLite
- **File Operations** supporting GeoJSON, KML, and KMZ formats
- **Collaborative Features** with clipboard operations and undo/redo functionality

## 🛠️ Available Tools & Features

### Drawing Tools
| Tool | Description | Use Case |
|------|-------------|----------|
| **Select** | Universal feature selection and editing | Select and modify existing features |
| **Hand** | Pan navigation mode | Navigate around the map |
| **Point** | Place point markers | Mark specific locations |
| **Polyline** | Draw straight lines with vertex control | Create precise paths and boundaries |
| **Line** | Draw continuous line segments | Free-form line drawing |
| **Freehand** | Freehand drawing | Sketch irregular shapes |
| **Arrow** | Create directional arrows | Indicate flow or direction |
| **GP** | General purpose drawing tool | Custom marker placement |
| **Tower** | Place tower infrastructure markers | Map communication towers |
| **Junction Point** | Mark connection points | Identify network junctions |
| **Legend** | Create map legends | Add descriptive labels and information |
| **Measure** | Distance measurement tool | Calculate distances between points |
| **Transform** | Advanced feature manipulation | Rotate, scale, and stretch features |

### Data Management Features
- **Copy/Paste Operations**: Cut, copy, and paste features with keyboard shortcuts
- **Undo/Redo System**: Complete history tracking for all drawing operations
- **Vertex Editing**: Delete and modify individual points in polylines
- **Feature Styling**: Customize appearance of all map elements
- **Import/Export**: Support for multiple geospatial file formats

## 🎯 Workflow Guide

### 1. Getting Started
1. **Launch the application** - The map loads with OpenStreetMap view
2. **Familiarize with the interface** - Toolbar on the left, map view on the right
3. **Choose your base layer** - Toggle between OSM and satellite views using the layer control

### 2. Creating Features
1. **Select a drawing tool** from the toolbar
2. **Click on the map** to start drawing:
   - **Point tools**: Single click to place
   - **Line tools**: Click to add vertices, double-click to finish
   - **Freehand**: Click and drag to draw
3. **Customize appearance** using the styling options (when available)

### 3. Editing Existing Features
1. **Switch to Select tool**
2. **Click on any feature** to select it (all features are selectable)
3. **Edit capabilities vary by feature type**:
   - **Editable features**: Polyline, Freehand Line, Arrow, Legend
   - **Non-editable features**: Points, Tower, Junction Point (selectable but not modifiable)
4. **Use transformation tools** for advanced manipulation (rotate, scale, stretch)

### 4. Managing Your Data
1. **Save your work** - Data is automatically persisted to local storage
2. **Export your map**:
   - Choose File → Export
   - Select format (GeoJSON, KML, KMZ)
   - Download your work
3. **Import existing data**:
   - Choose File → Import
   - Select supported file format
   - Features appear on the map automatically

### 5. Advanced Operations

#### Copy/Paste Workflow
1. **Select features** using the Select tool
2. **Copy** (Ctrl+C) or **Cut** (Ctrl+X) selected features
3. **Move cursor** to desired location
4. **Paste** (Ctrl+V) features at cursor position

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

## 🏗️ Technical Architecture

### Frontend Stack
- **React 19.1.1** - Modern reactive UI framework
- **TypeScript** - Type-safe development experience
- **Vite 7.1.7** - Fast development build tool
- **OpenLayers 10.6.1** - Professional mapping library
- **Tailwind CSS 4.1.16** - Utility-first styling
- **Radix UI** - Accessible component library

### Key Libraries
- **ol-ext 4.0.36** - Extended OpenLayers functionality
- **PGLite** - PostgreSQL-compatible local database
- **Lucide React** - Modern icon library

### Data Persistence
- **Local Storage**: Basic settings and preferences
- **PGLite Database**: Structured feature data storage
- **Automatic Serialization**: Complex data handling and recovery

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── MapEditor.tsx   # Main application orchestrator
│   ├── MapInstance.tsx # Map initialization and setup
│   ├── ToolManager.tsx # Drawing tool management
│   ├── FeatureStyler.tsx # Feature styling logic
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
│   ├── useMapState.ts  # Map state management
│   ├── useToolState.ts # Tool selection state
│   └── useFeatureState.ts # Feature selection and editing
├── utils/              # Utility functions
│   ├── mapStateUtils.ts # Map persistence utilities
│   ├── serializationUtils.ts # Data serialization
│   └── featureUtils.ts # Feature type detection
├── config/             # Configuration files
│   └── toolConfig.ts   # Tool definitions and settings
└── types/              # TypeScript type definitions
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
- **KML** - For Google Earth integration
- **KMZ** - Compressed format with media support

## 🎨 Feature Types & Properties

### Geometric Features
- **Points**: Single location markers with custom icons
- **Lines**: Connected point sequences with styling options
- **Polylines**: Multi-segment lines with vertex control
- **Freehand**: Hand-drawn irregular shapes
- **Arrows**: Directional indicators with customizable heads

### Special Features
- **Legends**: Text-based information displays
- **Measurements**: Distance calculations with automatic formatting
- **Icons**: Custom SVG markers (Tower, Junction, GP, etc.)

### Styling Options
- **Colors**: Full RGB color customization
- **Line Width**: Adjustable stroke width
- **Opacity**: Transparency control
- **Patterns**: Dashed, dotted, and solid line styles
- **Icons**: Custom SVG markers with click handlers

## 🔒 Data Persistence & Security

### Local Storage Strategy
- **Application Settings**: Stored in browser localStorage
- **Map Features**: Persisted in PGLite database
- **User Preferences**: Automatic preference saving
- **Session Recovery**: Restore last session on startup

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

### Performance Issues
1. **Slow rendering**: Reduce number of features or simplify geometries
2. **Memory usage**: Clear cache and restart browser
3. **Network errors**: Check internet connectivity

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

Built with ❤️ using modern web technologies for professional map editing and data management.