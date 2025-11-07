import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import type { Extent } from "ol/extent";
import { OSM, Vector as VectorSource, XYZ } from "ol/source";
import { fromLonLat } from "ol/proj";
import { MapViewToggle, type MapViewType } from "./MapViewToggle";
import { LoadingOverlay } from "./LoadingOverlay";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { FeatureLike } from "ol/Feature";
import { Style, Circle as CircleStyle } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Modify, Select } from "ol/interaction";
import { Point } from "ol/geom";
import { defaults as defaultControls } from "ol/control";
import { click } from "ol/events/condition";
import Toolbar from "./ToolBar";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import JSZip from "jszip";
import { Draw } from "ol/interaction";
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import { RegularShape } from "ol/style";

const MapEditor: React.FC = () => {
  const mapRef = useRef<Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const [currentMapView, setCurrentMapView] = useState<MapViewType>("osm");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const osmLayerRef = useRef<TileLayer<OSM> | null>(null);
  const satelliteLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<Feature<Geometry> | null>(null);
  const [activeTool, setActiveTool] = useState<string>("");
  const drawInteractionRef = useRef<Draw | null>(null);

  // ✅ Custom feature styles (used for GeoJSON, KML, and KMZ)
  const getFeatureStyle = (feature: FeatureLike) => {
    const type = feature.getGeometry()?.getType();
    const isArrow = feature.get('isArrow');

    if (isArrow && (type === "LineString" || type === "MultiLineString")) {
      return getArrowStyle(feature);
    }

    if (type === "LineString" || type === "MultiLineString") {
      return new Style({
        stroke: new Stroke({
          color: "#00ff00",
          width: 4,
        }),
      });
    }

    if (type === "Point" || type === "MultiPoint") {
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: "#ff0000" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      });
    }

    return new Style({
      fill: new Fill({ color: "rgba(255, 255, 0, 0.2)" }),
      stroke: new Stroke({ color: "#ff8800", width: 3 }),
    });
  };

  // ✅ Arrow style function
  const getArrowStyle = (feature: FeatureLike) => {
    const geometry = feature.getGeometry();
    if (!geometry) return new Style();

    let coordinates: number[][];

    if (geometry.getType() === 'LineString') {
      coordinates = (geometry as any).getCoordinates();
    } else if (geometry.getType() === 'MultiLineString') {
      // For MultiLineString, use the last line segment
      const lineStrings = (geometry as any).getLineStrings();
      if (lineStrings.length === 0) return new Style();
      coordinates = lineStrings[lineStrings.length - 1].getCoordinates();
    } else {
      return new Style();
    }

    if (coordinates.length < 2) return new Style();

    // Get the last segment for arrow direction
    const startPoint = coordinates[coordinates.length - 2];
    const endPoint = coordinates[coordinates.length - 1];

    // Calculate angle for arrow head
    const dx = endPoint[0] - startPoint[0];
    const dy = endPoint[1] - startPoint[1];
    const angle = Math.atan2(dy, dx);

    // Create arrow head using RegularShape
    const arrowHead = new RegularShape({
      points: 3,
      radius: 8,
      rotation: -angle,
      angle: 10,
      displacement: [0, 0],
      fill: new Fill({ color: '#00ff00' }),
    });

    return [
      // Line style
      new Style({
        stroke: new Stroke({
          color: '#00ff00',
          width: 4,
        }),
      }),
      // Arrow head style at the end point
      new Style({
        geometry: new Point(endPoint),
        image: arrowHead,
      }),
    ];
  };

  // ✅ Handle tool activation
  const handleToolActivation = (toolId: string) => {
    if (!mapRef.current) return;

    // Remove existing draw interaction if any
    if (drawInteractionRef.current) {
      mapRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }

    setActiveTool(toolId);

    switch (toolId) {
      case "point":
        const pointDraw = new Draw({
          source: vectorSourceRef.current,
          type: "Point",
          style: new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: "#ff0000" }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          }),
        });
        drawInteractionRef.current = pointDraw;
        mapRef.current.addInteraction(pointDraw);
        break;

      case "polyline":
        const lineDraw = new Draw({
          source: vectorSourceRef.current,
          type: "LineString",
          style: new Style({
            stroke: new Stroke({
              color: "#00ff00",
              width: 4,
            }),
          }),
        });
        drawInteractionRef.current = lineDraw;
        mapRef.current.addInteraction(lineDraw);
        break;

      case "freehand":
        const freehandDraw = new Draw({
          source: vectorSourceRef.current,
          type: "LineString",
          freehand: true,
          style: new Style({
            stroke: new Stroke({
              color: "#00ff00",
              width: 4,
            }),
          }),
        });
        drawInteractionRef.current = freehandDraw;
        mapRef.current.addInteraction(freehandDraw);
        break;

      case "arrow":
        const arrowDraw = new Draw({
          source: vectorSourceRef.current,
          type: "LineString",
          style: new Style({
            stroke: new Stroke({
              color: "#00ff00",
              width: 4,
            }),
          }),
        });

        // Mark the feature as arrow when drawing finishes
        arrowDraw.on('drawend', (event) => {
          const feature = event.feature;
          feature.set('isArrow', true);
        });

        drawInteractionRef.current = arrowDraw;
        mapRef.current.addInteraction(arrowDraw);
        break;

      case "select":
        // Reactivate select/modify interactions
        const selectInteraction = mapRef.current.getInteractions().getArray().find(
          (interaction) => interaction instanceof Select
        ) as Select;
        if (selectInteraction) {
          selectInteraction.setActive(true);
        }
        break;

      case "hand":
        // Deactivate select/modify for pan navigation
        const selectInteractionForHand = mapRef.current.getInteractions().getArray().find(
          (interaction) => interaction instanceof Select
        ) as Select;
        if (selectInteractionForHand) {
          selectInteractionForHand.setActive(false);
        }
        break;

      default:
        break;
    }
  };

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
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri",
        maxZoom: 18,
        minZoom: 0,
      }),
      visible: false,
    });

    // Store references for layer switching
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: getFeatureStyle,
    });

    const map = new Map({
      target: "map",
      layers: [osmLayer, satelliteLayer, vectorLayer],
      view: new View({
        center: fromLonLat([78.9629, 20.5937]),
        zoom: 5,
        maxZoom: 19,
        minZoom: 0,
        smoothExtentConstraint: true,
      }),
      controls: defaultControls({
        zoom: false,
        attribution: false,
        rotate: false,
      }),
    });

    // ✅ Select + Modify interactions
    const selectInteraction = new Select({
      condition: click,
      layers: [vectorLayer],
    });
    const modifyInteraction = new Modify({
      features: selectInteraction.getFeatures(),
    });
    map.addInteraction(selectInteraction);
    map.addInteraction(modifyInteraction);

    selectInteraction.on("select", (e) => {
      setSelectedFeature(e.selected[0] || null);
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  // ✅ Handle map view change with smooth transitions
  const handleMapViewChange = (newView: MapViewType) => {
    if (!osmLayerRef.current || !satelliteLayerRef.current || !mapRef.current)
      return;

    if (newView === currentMapView) return; // No change needed

    setIsTransitioning(true);
    setCurrentMapView(newView);

    // Set opacity for fade transition
    if (newView === "osm") {
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

  // ✅ Handle file import (GeoJSON, KML, KMZ)
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = e.target?.result;
      if (!data) return;

      let features: Feature<Geometry>[] = [];

      try {
        if (name.endsWith(".geojson") || name.endsWith(".json")) {
          const json = JSON.parse(data as string);
          features = new GeoJSON().readFeatures(json, {
            featureProjection: "EPSG:3857",
          });
        } else if (name.endsWith(".kml")) {
          features = new KML({ extractStyles: false }).readFeatures(data, {
            featureProjection: "EPSG:3857",
          });
        } else if (name.endsWith(".kmz")) {
          const zip = await JSZip.loadAsync(file);
          const kmlFile = Object.keys(zip.files).find((f) =>
            f.toLowerCase().endsWith(".kml")
          );
          if (kmlFile) {
            const kmlText = await zip.file(kmlFile)?.async("text");
            if (kmlText) {
              features = new KML({ extractStyles: false }).readFeatures(
                kmlText,
                {
                  featureProjection: "EPSG:3857",
                }
              );
            }
          }
        }

        if (features.length === 0) {
          alert("No valid features found in the file.");
          return;
        }

        vectorSourceRef.current.clear();
        console.log(features, "features");
        vectorSourceRef.current.addFeatures(features);

        const extent: Extent = vectorSourceRef.current.getExtent();
        mapRef.current?.getView().fit(extent, {
          duration: 1000,
          padding: [50, 50, 50, 50],
        });
      } catch (err) {
        console.error("File parsing error:", err);
        alert("Invalid or unsupported file format.");
      }
    };

    if (name.endsWith(".kmz")) {
      // JSZip reads blob directly, no need to use FileReader
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  // ✅ Delete selected feature
  const handleDelete = () => {
    if (selectedFeature) {
      vectorSourceRef.current.removeFeature(selectedFeature);
      setSelectedFeature(null);
    } else {
      alert("Please select a feature to delete.");
    }
  };

  return (
    <div>
      <div id="map" className="relative w-full h-screen">
        <Toolbar
          onFileImport={handleImportClick}
          onDeleteFeature={handleDelete}
          onToolActivate={handleToolActivation}
          activeTool={activeTool}
        />

        <input
          type="file"
          accept=".geojson,.json,.kml,.kmz"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <LoadingOverlay
          isVisible={isTransitioning}
          message="Switching map view..."
        />
        <MapViewToggle
          currentView={currentMapView}
          onViewChange={handleMapViewChange}
        />
        {/* Toolbar */}
      </div>
    </div>
  );
};

export default MapEditor;
