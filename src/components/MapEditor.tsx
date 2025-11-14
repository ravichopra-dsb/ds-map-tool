import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import type { Extent } from "ol/extent";
import { OSM, Vector as VectorSource, XYZ } from "ol/source";
import { Collection } from "ol";
import { fromLonLat } from "ol/proj";
import { MapViewToggle, type MapViewType } from "./MapViewToggle";
import { LoadingOverlay } from "./LoadingOverlay";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { FeatureLike } from "ol/Feature";
import { Style, Text, RegularShape } from "ol/style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import { Modify, Select } from "ol/interaction";
import { Point, LineString } from "ol/geom";
import Transform from "ol-ext/interaction/Transform";
import { defaults as defaultControls } from "ol/control";
import { click } from "ol/events/condition";
import Toolbar from "./ToolBar";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import JSZip from "jszip";
import { Draw } from "ol/interaction";
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import { getLegendById, type LegendType } from "@/tools/legendsConfig";
import { isSelectableFeature, isEditableFeature } from "@/utils/featureTypeUtils";
import { handleTriangleClick } from "@/icons/Triangle";
import { handlePitClick } from "@/icons/Pit";
import { handleGPClick } from "@/icons/Gp";
import { handleJunctionClick } from "@/icons/JunctionPoint";
import { handleTowerClickFromSvg } from "@/icons/Tower";

// New utilities
import { applyOpacityToColor } from "@/utils/colorUtils";
import { getFeatureTypeStyle } from "@/utils/featureUtils";
import { createPointStyle, createLineStyle } from "@/utils/styleUtils";
import {
  createPointDraw,
  createPolylineDraw,
  createFreehandDraw,
  createArrowDraw,
  createLegendDraw,
} from "@/utils/interactionUtils";
import { useClickHandlerManager } from "@/hooks/useClickHandlerManager";
import { TOWER_CONFIG } from "@/config/toolConfig";

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
  const transformInteractionRef = useRef<Transform | null>(null);
  const transformSelectInteractionRef = useRef<Select | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const transformFeaturesRef = useRef<Collection<Feature<Geometry>> | null>(
    null
  );

  // Click handler manager hook
  const { registerClickHandler, removeAllClickHandlers } =
    useClickHandlerManager();

  // ✅ Custom feature styles (used for GeoJSON, KML, and KMZ)
  const getFeatureStyle = (feature: FeatureLike) => {
    const type = feature.getGeometry()?.getType();
    const isArrow = feature.get("isArrow");

    if (isArrow && (type === "LineString" || type === "MultiLineString")) {
      return getArrowStyle(feature);
    }

    // Handle icon features using utility
    const iconStyle = getFeatureTypeStyle(feature);
    if (iconStyle) {
      return iconStyle;
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
      const strokeColor = legendType.style.strokeColor || "#000000";

      styles.push(
        new Style({
          stroke: new Stroke({
            color: applyOpacityToColor(strokeColor, opacity),
            width: legendType.style.strokeWidth || 2,
            lineDash: legendType.style.strokeDash || [5, 5],
            lineCap: "butt",
          }),
        })
      );
      return styles;
    }

    if (type === "LineString" || type === "MultiLineString") {
      return createLineStyle("#00ff00", 4);
    }

    if (type === "Point" || type === "MultiPoint") {
      return createPointStyle({
        radius: 6,
        fillColor: "#ff0000",
        strokeColor: "#ffffff",
        strokeWidth: 2,
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
    setSelectedLegend(legend);
  };

  // ✅ Auto-activate legends tool when selectedLegend changes
  useEffect(() => {
    if (selectedLegend) {
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

    // Remove all click handlers using the hook
    removeAllClickHandlers(mapRef.current);

    // Deactivate and remove transform interaction when switching away from transform tool
    if (toolId !== "transform" && transformInteractionRef.current) {
      transformInteractionRef.current.setActive(false);
      if (
        mapRef.current
          .getInteractions()
          .getArray()
          .includes(transformInteractionRef.current as any)
      ) {
        mapRef.current.removeInteraction(
          transformInteractionRef.current as any
        );
      }
      transformInteractionRef.current = null;
    }

    // Remove transform selection interaction when switching away from transform tool
    if (toolId !== "transform" && transformSelectInteractionRef.current) {
      if (
        mapRef.current
          .getInteractions()
          .getArray()
          .includes(transformSelectInteractionRef.current)
      ) {
        mapRef.current.removeInteraction(transformSelectInteractionRef.current);
      }
      transformSelectInteractionRef.current = null;
    }

    // Clear transform features collection when switching away from transform tool
    if (toolId !== "transform" && transformFeaturesRef.current) {
      transformFeaturesRef.current.clear();
      transformFeaturesRef.current = null;
    }

    // Reactivate modify interaction when switching away from transform tool
    if (toolId !== "transform") {
      const modifyInteraction = mapRef.current
        .getInteractions()
        .getArray()
        .find((interaction) => interaction instanceof Modify) as Modify;
      if (modifyInteraction) {
        modifyInteraction.setActive(true);
      }
    }

    setActiveTool(toolId);

    switch (toolId) {
      case "point":
        drawInteractionRef.current = createPointDraw(vectorSourceRef.current);
        mapRef.current.addInteraction(drawInteractionRef.current);
        break;

      case "polyline":
        drawInteractionRef.current = createPolylineDraw(
          vectorSourceRef.current
        );
        mapRef.current.addInteraction(drawInteractionRef.current);
        break;

      case "freehand":
        drawInteractionRef.current = createFreehandDraw(
          vectorSourceRef.current
        );
        mapRef.current.addInteraction(drawInteractionRef.current);
        break;

      case "arrow":
        drawInteractionRef.current = createArrowDraw(vectorSourceRef.current);
        mapRef.current.addInteraction(drawInteractionRef.current);
        break;

      case "legends":
        // Don't allow drawing if no legend is selected
        if (!selectedLegend) {
          return;
        }

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
          const opacity = selectedLegend.style.opacity || 1;
          const strokeColor = selectedLegend.style.strokeColor || "#000000";

          drawStyle = createLineStyle(
            strokeColor,
            selectedLegend.style.strokeWidth,
            opacity,
            selectedLegend.style.strokeDash
          );
        }

        drawInteractionRef.current = createLegendDraw(
          vectorSourceRef.current,
          drawStyle,
          selectedLegend.id
        );
        mapRef.current.addInteraction(drawInteractionRef.current);
        break;

      case "select":
        // Reactivate select/modify interactions
        const selectInteraction = mapRef.current
          .getInteractions()
          .getArray()
          .find((interaction) => interaction instanceof Select) as Select;
        if (selectInteraction) {
          selectInteraction.setActive(true);
        }
        break;

      case "transform":
        // Ensure vector layer is available
        if (!vectorLayerRef.current) {
          break;
        }

        // Deactivate modify interaction to prevent vertex editing during transform
        const modifyInteraction = mapRef.current
          .getInteractions()
          .getArray()
          .find((interaction) => interaction instanceof Modify) as Modify;
        if (modifyInteraction) {
          modifyInteraction.setActive(false);
        }

        // Create dedicated feature collection for transform
        transformFeaturesRef.current = new Collection<Feature<Geometry>>();

        // Create transform selection interaction to add features to transform collection
        const transformSelectInteraction = new Select({
          condition: click,
          layers: [vectorLayerRef.current],
          style: null,
        });

        // When transform selection happens, add features to transform collection
        transformSelectInteraction.on("select", (e) => {
          // Clear previous selection
          transformFeaturesRef.current?.clear();

          // Add newly selected features to transform collection (only editable ones)
          e.selected.forEach((feature) => {
            if (isEditableFeature(feature)) {
              transformFeaturesRef.current?.push(feature);
            }
          });
        });

        // Add selection interaction to map
        mapRef.current.addInteraction(transformSelectInteraction);
        transformSelectInteractionRef.current = transformSelectInteraction;

        // Create transform interaction with proper configuration
        const newTransformInteraction = new Transform({
          features: transformFeaturesRef.current, // Use dedicated collection
          layers: [vectorLayerRef.current], // Restrict to vector layer
          translate: true, // Enable move/translate
          translateFeature: true, // Enable direct feature translation
          rotate: true, // Enable rotation
          scale: true, // Enable scaling
          stretch: true, // Enable stretching
          keepAspectRatio: (e) => e.originalEvent.shiftKey, // Hold Shift for aspect ratio
          hitTolerance: 3, // Better hit tolerance for selection
          filter: (feature) => {
            // Only allow transformation of editable features
            return isEditableFeature(feature);
          },
        });

        // Add and activate transform interaction
        mapRef.current.addInteraction(newTransformInteraction as any);
        transformInteractionRef.current = newTransformInteraction;
        newTransformInteraction.setActive(true);
        break;

      case "triangle":
        registerClickHandler(
          mapRef.current,
          {
            toolId: "triangle",
            handlerKey: "triangleClickHandler",
            onClick: (coordinate) =>
              handleTriangleClick(vectorSourceRef.current, coordinate),
          },
          vectorSourceRef.current
        );
        break;

      case "pit":
        registerClickHandler(
          mapRef.current,
          {
            toolId: "pit",
            handlerKey: "PitClickHandler",
            onClick: (coordinate) =>
              handlePitClick(vectorSourceRef.current, coordinate),
          },
          vectorSourceRef.current
        );
        break;

      case "gp":
        registerClickHandler(
          mapRef.current,
          {
            toolId: "gp",
            handlerKey: "GpClickHandler",
            onClick: (coordinate) =>
              handleGPClick(vectorSourceRef.current, coordinate),
          },
          vectorSourceRef.current
        );
        break;

      case "junction":
        registerClickHandler(
          mapRef.current,
          {
            toolId: "junction",
            handlerKey: "JuctionPointClickHandler",
            onClick: (coordinate) =>
              handleJunctionClick(vectorSourceRef.current, coordinate),
          },
          vectorSourceRef.current
        );
        break;

      case "tower":
        registerClickHandler(
          mapRef.current,
          {
            toolId: "tower",
            handlerKey: "TowerClickHandler",
            onClick: (coordinate) => {
              handleTowerClickFromSvg(
                vectorSourceRef.current,
                coordinate,
                TOWER_CONFIG.svgPath,
                TOWER_CONFIG.scale,
                TOWER_CONFIG.strokeWidth
              );
            },
          },
          vectorSourceRef.current
        );
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

    // Store vector layer reference
    vectorLayerRef.current = vectorLayer;

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

    // ✅ Select + Modify interactions with feature type filtering
    const selectInteraction = new Select({
      condition: click,
      layers: [vectorLayer],
      filter: isSelectableFeature,
      style: (feature) => {
        const geometry = feature.getGeometry();

        if (!geometry) return undefined;

        const geometryType = geometry.getType();

        // Same blue solid highlight for all features
        if (geometryType === "Point" || geometryType === "MultiPoint") {
          return createPointStyle({
            radius: 8,
            fillColor: "#0066cc",
            strokeColor: "#ffffff",
            strokeWidth: 2,
          });
        } else {
          return createLineStyle("#0066cc", 4, 1, []);
        }
      },
    });

    // Create a separate collection for editable features
    const editableFeatures = new Collection<Feature<Geometry>>();
    const modifyInteraction = new Modify({
      features: editableFeatures,
    });

    map.addInteraction(selectInteraction);
    map.addInteraction(modifyInteraction);

    selectInteraction.on("select", (e) => {
      setSelectedFeature(e.selected[0] || null);

      // Clear editable features collection
      editableFeatures.clear();

      // Add only editable features to the modify collection
      e.selected.forEach((feature) => {
        if (isEditableFeature(feature as Feature<Geometry>)) {
          editableFeatures.push(feature as Feature<Geometry>);
        }
      });
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
        vectorSourceRef.current.addFeatures(features);

        const extent: Extent = vectorSourceRef.current.getExtent();
        mapRef.current?.getView().fit(extent, {
          duration: 1000,
          padding: [50, 50, 50, 50],
        });
      } catch (err) {
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
        {/* Toolbar */}
      </div>
    </div>
  );
};

export default MapEditor;
