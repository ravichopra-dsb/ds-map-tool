import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import type { Extent } from "ol/extent";
import { OSM, Vector as VectorSource, XYZ } from "ol/source";
import { fromLonLat } from "ol/proj";
import { MapViewToggle, type MapViewType } from "./MapViewToggle";
import { LoadingOverlay } from "./LoadingOverlay";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { FeatureLike } from "ol/Feature";
import { Style, Circle as CircleStyle, Text } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Modify, Select } from "ol/interaction";
import { Point, LineString } from "ol/geom";
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
import { getLegendById, type LegendType } from "@/tools/legendsConfig";
import PitRotationPanel from "./PitRotationPanel";

// ✅ Reusable function for legends with text along line path
const getTextAlongLineStyle = (
  feature: FeatureLike,
  legendType: LegendType
): Style[] => {
  const geometry = feature.getGeometry();
  if (!geometry) return [];

  const styles: Style[] = [];

  // Base line style from legend configuration
  styles.push(
    new Style({
      stroke: new Stroke({
        color: legendType.style.strokeColor,
        width: legendType.style.strokeWidth,
        lineDash: legendType.style.strokeDash,
        lineCap: "butt",
      }),
      zIndex: 1, // Base line layer
    })
  );

  // Add repeated text along the line if text is configured
  if (
    legendType.text &&
    legendType.textStyle &&
    (geometry.getType() === "LineString" ||
      geometry.getType() === "MultiLineString")
  ) {
    const textStyle = legendType.textStyle;

    // For dash centering, we need to account for text starting position
    // Since OpenLayers doesn't support along-line offset, we use mathematical alignment
    styles.push(
      new Style({
        text: new Text({
          text: legendType.text,
          placement: "line",
          repeat: textStyle.repeat,
          font: textStyle.font,
          fill: new Fill({
            color: textStyle.fill,
          }),
          stroke: new Stroke({
            color: textStyle.stroke,
            width: textStyle.strokeWidth,
          }),
          textAlign: "center",
          textBaseline: "middle",
          maxAngle: textStyle.maxAngle,
          offsetX: textStyle.offsetX || 0, // Perpendicular offset only
          offsetY: textStyle.offsetY || 0,
          scale: textStyle.scale,
        }),
        zIndex: 100, // High z-index to ensure text always appears above line
      })
    );
  }

  return styles;
};

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
  const [selectedLegend, setSelectedLegend] = useState<LegendType | undefined>(
    undefined
  );
  const drawInteractionRef = useRef<Draw | null>(null);

  // Pit rotation state
  const [isRotatingPit, setIsRotatingPit] = useState(false);
  const [currentPitRotation, setCurrentPitRotation] = useState(0);

  // ✅ NEW: Ref for Modify interaction to manage hover behavior
  const modifyInteractionRef = useRef<Modify | null>(null);
  // const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // ✅ Custom feature styles (used for GeoJSON, KML, and KMZ)
  const getFeatureStyle = (feature: FeatureLike) => {
    const type = feature.getGeometry()?.getType();
    const isArrow = feature.get("isArrow");
    const isPits = feature.get("isPits");

    console.log("Checking : ", activeTool);

    if (isPits && (type === "Point" || type === "MultiPoint")) {
      const rotation = feature.get("rotation") || 0;
      return new Style({
        image: new RegularShape({
          points: 4,
          radius: 10,
          radius2: 0,
          angle: rotation,
          stroke: new Stroke({ color: "red", width: 6 }),
          fill: new Fill({ color: "transparent" }),
        }),
      });
    }

    if (isArrow && (type === "LineString" || type === "MultiLineString")) {
      return getArrowStyle(feature);
    }

    if (
      feature.get("islegends") &&
      (type === "LineString" || type === "MultiLineString")
    ) {
      const legendTypeId = feature.get("legendType");
      let legendType: LegendType | undefined;

      if (legendTypeId) {
        // Use the configuration to get the legend type
        legendType = getLegendById(legendTypeId);
      } else if (selectedLegend) {
        // Use the currently selected legend
        legendType = selectedLegend;
      }

      // If no legend type is found, don't render the feature
      if (!legendType) {
        return [];
      }

      // Check if legend has text configured and use text styling function
      if (legendType.text) {
        return getTextAlongLineStyle(feature, legendType);
      }

      const styles: Style[] = [];
      const opacity = legendType.style.opacity || 1;
      const strokeColor = legendType.style.strokeColor;

      // Apply opacity to the stroke color
      const colorWithOpacity =
        opacity < 1
          ? strokeColor +
            Math.round(opacity * 255)
              .toString(16)
              .padStart(2, "0")
          : strokeColor;

      styles.push(
        new Style({
          stroke: new Stroke({
            color: colorWithOpacity,
            width: legendType.style.strokeWidth || 2,
            lineDash: legendType.style.strokeDash || [5, 5],
            lineCap: "butt",
          }),
        })
      );
      return styles;
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
  };

  // ✅ Arrow style function
  const getArrowStyle = (feature: FeatureLike) => {
    const geometry = feature.getGeometry();
    if (!geometry) return new Style();

    let coordinates: number[][];

    if (geometry.getType() === "LineString") {
      coordinates = (geometry as any).getCoordinates();
    } else if (geometry.getType() === "MultiLineString") {
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
      fill: new Fill({ color: "#000000" }),
    });

    return [
      // Line style
      new Style({
        stroke: new Stroke({
          color: "#000000",
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

  // ✅ Handle legend selection - only updates state
  const handleLegendSelect = (legend: LegendType) => {
    console.log("🎯 Legend selected:", legend.name, legend.id);
    setSelectedLegend(legend);
  };

  // ✅ Auto-activate legends tool when selectedLegend changes
  useEffect(() => {
    if (selectedLegend) {
      console.log("🔧 Activating legends tool for:", selectedLegend.name);
      // Remove any existing draw interaction first
      if (drawInteractionRef.current) {
        mapRef.current?.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      // Then activate the legends tool with the selected legend
      handleToolActivation("legends");
    }
  }, [selectedLegend]);

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
              color: "#000000",
              width: 4,
            }),
          }),
        });

        // Mark the feature as arrow when drawing finishes
        arrowDraw.on("drawend", (event) => {
          const feature = event.feature;
          feature.set("isArrow", true);
        });

        drawInteractionRef.current = arrowDraw;
        mapRef.current.addInteraction(arrowDraw);
        break;

      case "legends":
        console.log(
          "🎨 Legends tool activation, selectedLegend:",
          selectedLegend?.name || "none"
        );
        // Don't allow drawing if no legend is selected
        if (!selectedLegend) {
          console.log("❌ No legend selected, cannot activate legends tool");
          return;
        }

        const opacity = selectedLegend.style.opacity || 1;
        const strokeColor = selectedLegend.style.strokeColor;

        // Apply opacity to the stroke color
        const colorWithOpacity =
          opacity < 1
            ? strokeColor +
              Math.round(opacity * 255)
                .toString(16)
                .padStart(2, "0")
            : strokeColor;

        // Use text styling for legends that have text, otherwise use standard style
        let drawStyle;
        if (selectedLegend.text) {
          // Create a temporary feature to generate the proper text style
          const tempFeature = new Feature({
            geometry: new LineString([
              [0, 0],
              [1, 0],
            ]),
          });
          tempFeature.set("legendType", selectedLegend.id);
          tempFeature.set("islegends", true);
          drawStyle = getTextAlongLineStyle(tempFeature, selectedLegend);
        } else {
          drawStyle = new Style({
            stroke: new Stroke({
              color: colorWithOpacity,
              width: selectedLegend.style.strokeWidth,
              lineDash: selectedLegend.style.strokeDash,
              lineCap: "butt",
            }),
          });
        }

        const legendlineDraw = new Draw({
          source: vectorSourceRef.current,
          type: "LineString",
          style: drawStyle,
        });
        legendlineDraw.on("drawend", (event) => {
          const feature = event.feature;
          console.log(
            "✏️ Drawing completed for legend:",
            selectedLegend.name,
            "with color:",
            selectedLegend.style.strokeColor
          );
          feature.set("islegends", true);
          feature.set("legendType", selectedLegend.id);
        });
        drawInteractionRef.current = legendlineDraw;
        mapRef.current.addInteraction(legendlineDraw);
        console.log("✅ Legends tool activated with:", selectedLegend.name);
        break;

      case "select":
        // This enables the hover-to-show-dots behavior
        // if (modifyInteractionRef.current) {
        //   modifyInteractionRef.current.setActive(true);
        // }
        // Reactivate select/modify interactions
        const selectInteraction = mapRef.current
          .getInteractions()
          .getArray()
          .find((interaction) => interaction instanceof Select) as Select;
        if (selectInteraction) {
          selectInteraction.setActive(true);
        }
        break;

      case "pits":
        const pitsDraw = new Draw({
          source: vectorSourceRef.current,
          type: "Point",
          style: new Style({
            image: new RegularShape({
              points: 4,
              radius: 10,
              radius2: 0,
              angle: 0,
              stroke: new Stroke({ color: "red", width: 6 }),
              fill: new Fill({ color: "transparent" }),
            }),
          }),
        });

        // Mark the feature as pits when drawing finishes
        pitsDraw.on("drawend", (event) => {
          const feature = event.feature;
          feature.set("isPits", true);
          feature.set("rotation", 0); // Initialize rotation to 0 degrees
          console.log("✅ New pit created with rotation:", 0);
        });

        drawInteractionRef.current = pitsDraw;
        mapRef.current.addInteraction(pitsDraw);
        break;

      case "hand":
        // Deactivate select/modify for pan navigation
        const selectInteractionForHand = mapRef.current
          .getInteractions()
          .getArray()
          .find((interaction) => interaction instanceof Select) as Select;
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

    // ✅ NEW: Store vectorLayer ref for later use in Modify interaction
    // vectorLayerRef.current = vectorLayer;

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
    // ✅ NEW: Modify interaction with hitDetection for hover-to-show-dots behavior
    const modifyInteraction = new Modify({
      // ✅ KEY: Use hitDetection with vectorLayer to detect visual appearance
      hitDetection: vectorLayer,
      source: vectorSourceRef.current,
    });

    // ✅ NEW: Store ref to Modify interaction
    modifyInteractionRef.current = modifyInteraction;

    // ✅ NEW: Handle cursor changes on hover
    modifyInteraction.on(["modifystart", "modifyend"], function (evt) {
      const target = map.getTargetElement();
      target.style.cursor = evt.type === "modifystart" ? "grabbing" : "pointer";
    });

    // ✅ NEW: Show pointer cursor when hovering over a vertex dot (on overlay)
    const overlaySource = modifyInteraction.getOverlay().getSource();
    if (overlaySource) {
      overlaySource.on(["addfeature", "removefeature"], function (evt) {
        const target = map.getTargetElement();
        target.style.cursor = evt.type === "addfeature" ? "pointer" : "";
      });
    }

    map.addInteraction(selectInteraction);
    map.addInteraction(modifyInteraction);

    selectInteraction.on("select", (e) => {
      const selected = e.selected[0] || null;
      setSelectedFeature(selected);

      // Debug logging to track selection state
      console.log("🎯 Feature selected:", {
        hasFeature: !!selected,
        isPit: selected?.get("isPits"),
        activeTool: activeTool,
        rotation: selected?.get("rotation")
      });

      // Check if selected feature is a pit (regardless of active tool)
      if (selected && selected.get("isPits")) {
        const existingRotation = selected.get("rotation") || 0;
        setCurrentPitRotation(existingRotation);
        setIsRotatingPit(true);
        console.log("✅ Pit rotation panel should be visible");
      } else {
        setIsRotatingPit(false);
      }
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
      setIsRotatingPit(false); // Close rotation panel when deleting
    } else {
      alert("Please select a feature to delete.");
    }
  };

  // Handle pit rotation changes
  const handlePitRotationChange = (angle: number) => {
    setCurrentPitRotation(angle);

    // Update the selected feature with new rotation
    if (selectedFeature && selectedFeature.get("isPits")) {
      selectedFeature.set("rotation", angle);
      // Force map to re-render the feature
      selectedFeature.changed();
    }
  };

  // Close rotation panel and save rotation
  const handleRotationPanelClose = () => {
    setIsRotatingPit(false);
    // Rotation is already saved in feature properties during real-time updates
  };

  // Close rotation panel when tool changes or clicking away
  useEffect(() => {
    if (activeTool !== "select") {
      setIsRotatingPit(false);
    }
  }, [activeTool]);

  // Close rotation panel when selectedFeature changes to non-pit
  useEffect(() => {
    if (!selectedFeature || !selectedFeature.get("isPits")) {
      setIsRotatingPit(false);
    }
  }, [selectedFeature]);

  return (
    <div>
      <div id="map" className="relative w-full h-screen">
        <Toolbar
          onFileImport={handleImportClick}
          onDeleteFeature={handleDelete}
          onToolActivate={handleToolActivation}
          activeTool={activeTool}
          selectedLegend={selectedLegend}
          onLegendSelect={handleLegendSelect}
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

        {/* Pit Rotation Panel - shown only when rotating a pit */}
        {isRotatingPit && (
          <PitRotationPanel
            rotation={currentPitRotation}
            onRotationChange={handlePitRotationChange}
            onClose={handleRotationPanelClose}
          />
        )}

        {/* Toolbar */}
      </div>
    </div>
  );
};

export default MapEditor;
