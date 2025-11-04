import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource, XYZ } from 'ol/source';
import { Draw, Modify, Select, Translate } from 'ol/interaction';
import { fromLonLat } from 'ol/proj';
import GeoJSON from 'ol/format/GeoJSON';
import { Feature } from 'ol';
import Point from 'ol/geom/Point';
import { Icon, Style, Text as TextStyle, Fill, Stroke } from 'ol/style';
import { Plus, Undo2, Redo2 } from 'lucide-react';
import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import Transform from 'ol-ext/interaction/Transform'; // ✅ ol-ext transform
import { MapViewToggle, type MapViewType } from './MapViewToggle';
import { LoadingOverlay } from './LoadingOverlay';

const MapEditor: React.FC = () => {
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const transformRef = useRef<Transform | null>(null);
  const [currentMapView, setCurrentMapView] = useState<MapViewType>('osm');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null);

  // ✅ Initialize map
  useEffect(() => {
    // Create OSM layer
    const osmLayer = new TileLayer({
      source: new OSM(),
      visible: true,
    });

    // Create Satellite layer using Esri World Imagery
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri',
        maxZoom: 19,
        minZoom: 0,
      }),
      visible: false,
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const vectorLayer = new VectorLayer({ source: vectorSourceRef.current });

    const map = new Map({
      target: 'map',
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5,
        maxZoom: 19,
        minZoom: 0,
        smoothExtentConstraint: true,
      }),
    });

    mapRef.current = map;
    addModifySelectTranslate();

    return () => map.setTarget(undefined);
  }, []);

  // ✅ Add keyboard shortcuts for zoom controls
  useEffect(() => {
    if (!mapRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!mapRef.current) return;

      const view = mapRef.current.getView();
      if (!view) return;

      const currentZoom = view.getZoom() || 5;

      switch (event.key) {
        case '+':
        case '=':
          // Zoom in
          if (currentZoom < 19) {
            event.preventDefault();
            view.animate({
              zoom: Math.min(currentZoom + 1, 19),
              duration: 300
            });
          }
          break;

        case '-':
        case '_':
          // Zoom out
          if (currentZoom > 0) {
            event.preventDefault();
            view.animate({
              zoom: Math.max(currentZoom - 1, 0),
              duration: 300
            });
          }
          break;

        case '0':
          // Reset zoom to initial view
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            view.animate({
              center: [8725933.439846955, 2343485.3266368586], // India center
              zoom: 5,
              duration: 600
            });
          }
          break;

        case '1':
          // Zoom to world view
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            view.animate({
              center: [0, 0],
              zoom: 2,
              duration: 600
            });
          }
          break;

        case 'ArrowUp':
          // Pan up
          event.preventDefault();
          const currentCenter = view.getCenter();
          if (currentCenter) {
            view.animate({
              center: [currentCenter[0], currentCenter[1] + 100000],
              duration: 200
            });
          }
          break;

        case 'ArrowDown':
          // Pan down
          event.preventDefault();
          const centerDown = view.getCenter();
          if (centerDown) {
            view.animate({
              center: [centerDown[0], centerDown[1] - 100000],
              duration: 200
            });
          }
          break;

        case 'ArrowLeft':
          // Pan left
          event.preventDefault();
          const centerLeft = view.getCenter();
          if (centerLeft) {
            view.animate({
              center: [centerLeft[0] - 100000, centerLeft[1]],
              duration: 200
            });
          }
          break;

        case 'ArrowRight':
          // Pan right
          event.preventDefault();
          const centerRight = view.getCenter();
          if (centerRight) {
            view.animate({
              center: [centerRight[0] + 100000, centerRight[1]],
              duration: 200
            });
          }
          break;
      }
    };

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ✅ Helper: remove only editing interactions
  const removeEditingInteractions = () => {
    if (!mapRef.current) return;
    mapRef.current.getInteractions().forEach((interaction) => {
      if (
        interaction instanceof Draw ||
        interaction instanceof Modify ||
        interaction instanceof Select ||
        interaction instanceof Translate ||
        (interaction as any).constructor?.name === 'Transform'
      ) {
        mapRef.current?.removeInteraction(interaction);
      }
    });
  };

  // ✅ Add modify + select + translate + transform
  const addModifySelectTranslate = () => {
    if (!mapRef.current) return;

    removeEditingInteractions();

    const modify = new Modify({ source: vectorSourceRef.current });
    const select = new Select();
    const translate = new Translate({ features: select.getFeatures() });

    // ✅ Add Transform interaction for rotate/scale
    const transform = new Transform({
      enableRotatedTransform: true,
      addCondition: () => true,
      translateFeature: true,
      scale: true,
      rotate: true,
      keepAspectRatio: (event: any) => event.originalEvent.shiftKey,
    });

    transform.on('select', (e: any) => {
      if (e.feature) {
        saveState();
      }
    });

    transformRef.current = transform;

    mapRef.current.addInteraction(modify);
    mapRef.current.addInteraction(select);
    mapRef.current.addInteraction(translate);
    mapRef.current.addInteraction(transform as any);
  };

  // ✅ Save state
  const saveState = () => {
    const features = vectorSourceRef.current.getFeatures();
    const geojson = new GeoJSON().writeFeatures(features);
    setHistory((prev) => [...prev, geojson]);
  };

  // ✅ Undo
  const undo = () => {
    if (!history.length) return;
    const newRedo = [...redoStack, history[history.length - 1]];
    const newHistory = history.slice(0, -1);
    setRedoStack(newRedo);
    setHistory(newHistory);

    const last = newHistory[newHistory.length - 1];
    if (last) {
      const features = new GeoJSON().readFeatures(last);
      vectorSourceRef.current.clear();
      vectorSourceRef.current.addFeatures(features);
    } else vectorSourceRef.current.clear();
  };

  // ✅ Redo
  const redo = () => {
    if (!redoStack.length) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setHistory([...history, restored]);

    const features = new GeoJSON().readFeatures(restored);
    vectorSourceRef.current.clear();
    vectorSourceRef.current.addFeatures(features);
  };

  // ✅ Draw interaction for Line / Polygon / Text
  const addDrawInteraction = (type: 'LineString' | 'Polygon' | 'Text') => {
    if (!mapRef.current) return;
    removeEditingInteractions();

    if (type === 'Text') {
      const draw = new Draw({
        source: vectorSourceRef.current,
        type: 'Point',
      });

      draw.on('drawend', (event: any) => {
        const userText = prompt('Enter text label:') || 'Label';
        const feature = event.feature;

        feature.setStyle(
          new Style({
            text: new TextStyle({
              text: userText,
              font: '16px Calibri,sans-serif',
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          })
        );

        saveState();
      });

      mapRef.current.addInteraction(draw);
    } else {
      const draw = new Draw({
        source: vectorSourceRef.current,
        type,
      });

      draw.on('drawend', saveState);
      mapRef.current.addInteraction(draw);
    }
  };

  // ✅ Activate Select / Move / Rotate / Scale
  const activateSelectTool = () => {
    addModifySelectTranslate();
  };

  // ✅ Add marker (Plus)
  const addMarkerAtCenter = () => {
    if (!mapRef.current) return;

    const center = mapRef.current.getView().getCenter();
    if (!center) return;

    const marker = new Feature({
      geometry: new Point(center),
    });

    marker.setStyle(
      new Style({
        image: new Icon({
          src: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
          scale: 0.05,
        }),
      })
    );

    vectorSourceRef.current.addFeature(marker);
    saveState();
  };

  // ✅ Export
  const exportGeoJSON = () => {
    const features = vectorSourceRef.current.getFeatures();
    const geojson = new GeoJSON().writeFeatures(features);
    const blob = new Blob([geojson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'features.geojson';
    a.click();
  };

  // ✅ Clear
  const clearAll = () => {
    vectorSourceRef.current.clear();
    setHistory([]);
    setRedoStack([]);
  };

  // ✅ Handle map view change with smooth transitions
  const handleMapViewChange = (newView: MapViewType) => {
    if (!osmLayerRef.current || !satelliteLayerRef.current || !mapRef.current) return;

    if (newView === currentMapView) return; // No change needed

    setIsTransitioning(true);
    setCurrentMapView(newView);

    // Set opacity for fade transition
    if (newView === 'osm') {
      // Fade out satellite, fade in OSM
      satelliteLayerRef.current!.setOpacity(1);
      osmLayerRef.current!.setOpacity(0);
      osmLayerRef.current!.setVisible(true);

      // Simple opacity change with CSS transition (since OpenLayers layer.animate is not available)
      setTimeout(() => {
        satelliteLayerRef.current!.setOpacity(0);
        osmLayerRef.current!.setOpacity(1);
      }, 50);

      setTimeout(() => {
        satelliteLayerRef.current!.setVisible(false);
        setIsTransitioning(false);
      }, 250);
    } else {
      // Fade out OSM, fade in satellite
      osmLayerRef.current!.setOpacity(1);
      satelliteLayerRef.current!.setOpacity(0);
      satelliteLayerRef.current!.setVisible(true);

      // Simple opacity change with CSS transition
      setTimeout(() => {
        osmLayerRef.current!.setOpacity(0);
        satelliteLayerRef.current!.setOpacity(1);
      }, 50);

      setTimeout(() => {
        osmLayerRef.current!.setVisible(false);
        setIsTransitioning(false);
      }, 250);
    }
  };

  return (
    <div className="map-editor">
      <div
        className="toolbar"
        style={{
          padding: '8px',
          background: '#eee',
          display: 'flex',
          gap: '6px',
        }}
      >
        <button onClick={() => addDrawInteraction('LineString')}>Line</button>
        <button onClick={() => addDrawInteraction('Polygon')}>Polygon</button>
        <button onClick={() => addDrawInteraction('Text')}>Text</button>
        <button onClick={activateSelectTool}>Select / Move / Rotate / Scale</button>

        <button onClick={addMarkerAtCenter} title="Add Marker">
          <Plus size={16} />
        </button>

        <button onClick={undo}>
          <Undo2 size={16} />
        </button>
        <button onClick={redo}>
          <Redo2 size={16} />
        </button>

        <button onClick={exportGeoJSON}>Export</button>
        <button onClick={clearAll}>Clear</button>
      </div>

      <div id="map" style={{ position: 'relative' }}>
        <LoadingOverlay
          isVisible={isTransitioning}
          message="Switching map view..."
        />
        <MapViewToggle
          currentView={currentMapView}
          onViewChange={handleMapViewChange}
        />
      </div>
    </div>
  );
};

export default MapEditor;
