import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
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

const MapEditor: React.FC = () => {
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const [drawType, setDrawType] = useState<'LineString' | 'Polygon' | 'Text' | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const transformRef = useRef<Transform | null>(null);

  // ✅ Initialize map
  useEffect(() => {
    const rasterLayer = new TileLayer({ source: new OSM() });
    const vectorLayer = new VectorLayer({ source: vectorSourceRef.current });

    const map = new Map({
      target: 'map',
      layers: [rasterLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5,
      }),
    });

    mapRef.current = map;
    addModifySelectTranslate();

    return () => map.setTarget(undefined);
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
        interaction instanceof Transform
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
      keepAspectRatio: (event) => event.originalEvent.shiftKey,
    });

    transform.on('select', (e) => {
      if (e.feature) {
        saveState();
      }
    });

    transformRef.current = transform;

    mapRef.current.addInteraction(modify);
    mapRef.current.addInteraction(select);
    mapRef.current.addInteraction(translate);
    mapRef.current.addInteraction(transform);
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

      draw.on('drawend', (event) => {
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

    setDrawType(type);
  };

  // ✅ Activate Select / Move / Rotate / Scale
  const activateSelectTool = () => {
    addModifySelectTranslate();
    setDrawType(null);
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

      <div id="map"></div>
    </div>
  );
};

export default MapEditor;
