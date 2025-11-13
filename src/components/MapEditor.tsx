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
import { Style, Circle as CircleStyle, Text } from "ol/style";
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
import { RegularShape } from "ol/style";
import { getLegendById, type LegendType } from "@/tools/legendsConfig";
import {
  handleTriangleClick,
  isTriangleFeature,
  triangleUtils,
} from "@/icons/Triangle";
import { handlePitClick, isPitFeature, pitUtils } from "@/icons/Pit";
import { handleGPClick, isGPFeature, gpUtils } from "@/icons/Gp";
import {
  handleJunctionClick,
  isJunctionFeature,
  junctionUtils,
} from "@/icons/JuctionPoint";
import { handleTowerClickFromSvg } from "@/icons/Tower";

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

  // ✅ Custom feature styles (used for GeoJSON, KML, and KMZ)
  const getFeatureStyle = (feature: FeatureLike) => {
    const type = feature.getGeometry()?.getType();
    const isArrow = feature.get("isArrow");

    if (isArrow && (type === "LineString" || type === "MultiLineString")) {
      return getArrowStyle(feature);
    }

    // Handle triangle features
    if (isTriangleFeature(feature as Feature) && type === "Polygon") {
      return triangleUtils.getStyle();
    }

    // Handle pit features
    if (isPitFeature(feature as Feature) && type === "Polygon") {
      return pitUtils.getStyle();
    }

    // Handle gp features
    if (isGPFeature(feature as Feature) && type === "Polygon") {
      return gpUtils.getStyles();
    }

    // Handle juction point features
    if (isJunctionFeature(feature as Feature) && type === "Polygon") {
      return junctionUtils.getStyles();
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

    // Remove triangle click handler if switching away from triangle tool
    if ((mapRef.current as any).triangleClickHandler) {
      mapRef.current.un("click", (mapRef.current as any).triangleClickHandler);
      delete (mapRef.current as any).triangleClickHandler;
    }

    // Remove pit click handler if switching away from pit tool
    if ((mapRef.current as any).PitClickHandler) {
      mapRef.current.un("click", (mapRef.current as any).PitClickHandler);
      delete (mapRef.current as any).PitClickHandler;
    }

    // Remove gp click handler if switching away from gp tool
    if ((mapRef.current as any).GpClickHandler) {
      mapRef.current.un("click", (mapRef.current as any).GpClickHandler);
      delete (mapRef.current as any).GpClickHandler;
    }

    // Remove juction click handler if switching away from juction tool
    if ((mapRef.current as any).JuctionPointClickHandler) {
      mapRef.current.un(
        "click",
        (mapRef.current as any).JuctionPointClickHandler
      );
      delete (mapRef.current as any).JuctionPointClickHandler;
    }

    // Remove tower click handler if switching away from juction tool
    if ((mapRef.current as any).TowerClickHandler) {
      mapRef.current.un("click", (mapRef.current as any).TowerClickHandler);
      delete (mapRef.current as any).TowerClickHandler;
    }

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
        // Don't allow drawing if no legend is selected
        if (!selectedLegend) {
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
          feature.set("islegends", true);
          feature.set("legendType", selectedLegend.id);
        });
        drawInteractionRef.current = legendlineDraw;
        mapRef.current.addInteraction(legendlineDraw);
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

          // Add newly selected features to transform collection
          e.selected.forEach((feature) => {
            transformFeaturesRef.current?.push(feature);
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
          filter: (_feature) => {
            // Filter to prevent conflicts - allow all features for now
            return true;
          },
        });

        // Add and activate transform interaction
        mapRef.current.addInteraction(newTransformInteraction as any);
        transformInteractionRef.current = newTransformInteraction;
        newTransformInteraction.setActive(true);
        break;

      case "triangle":
        // Triangle tool: set up click listener for single-click triangle creation
        if (!mapRef.current) return;

        // Add click event listener for triangle creation
        const triangleClickHandler = (event: any) => {
          const coordinate = event.coordinate;
          handleTriangleClick(vectorSourceRef.current, coordinate);
        };

        mapRef.current.on("click", triangleClickHandler);

        // Store the handler reference for cleanup when switching tools
        (mapRef.current as any).triangleClickHandler = triangleClickHandler;
        break;

      case "pit":
        // Pit tool: set up click listener for single-click pit creation
        if (!mapRef.current) return;

        // Add click event listener for pit creation
        const PitClickHandler = (event: any) => {
          const coordinate = event.coordinate;
          handlePitClick(vectorSourceRef.current, coordinate);
        };

        mapRef.current.on("click", PitClickHandler);

        // Store the handler reference for cleanup when switching tools
        (mapRef.current as any).PitClickHandler = PitClickHandler;
        break;

      case "gp":
        // Gp tool: set up click listener for single-click gp creation
        if (!mapRef.current) return;

        // Add click event listener for gp creation
        const GpClickHandler = (event: any) => {
          const coordinate = event.coordinate;
          handleGPClick(vectorSourceRef.current, coordinate);
        };

        mapRef.current.on("click", GpClickHandler);

        // Store the handler reference for cleanup when switching tools
        (mapRef.current as any).GpClickHandler = GpClickHandler;
        break;

      case "junction":
        // Gp tool: set up click listener for single-click gp creation
        if (!mapRef.current) return;

        // Add click event listener for gp creation
        const JuctionPointClickHandler = (event: any) => {
          const coordinate = event.coordinate;
          handleJunctionClick(vectorSourceRef.current, coordinate);
        };

        mapRef.current.on("click", JuctionPointClickHandler);

        // Store the handler reference for cleanup when switching tools
        (mapRef.current as any).JuctionPointClickHandler =
          JuctionPointClickHandler;
        break;

      case "tower":
        const towerPathD = `M11.8545,6.4336l-.4131-.2813a4.7623,4.7623,0,0,0,.2813-4.8779l-.0835-.1533L12.0747.875l.0908.167a5.2619,5.2619,0,0,1-.311,5.3916Zm1.1521,7.1316V14h-11v-.4348H4.4952L6.0439,6.4a.5.5,0,0,1,.4888-.3945h.7255V4.6014A1.14,1.14,0,0,1,6.3756,3.5a1.1568,1.1568,0,1,1,2.3136,0,1.14,1.14,0,0,1-.931,1.1112V6.0059h.7223A.5.5,0,0,1,8.9692,6.4l1.5478,7.1648ZM8.4543,8.751H6.5588L6.236,10.2441H8.777ZM6.1279,10.7441l-.3233,1.4952H9.2082l-.3231-1.4952ZM6.936,7.0059,6.6669,8.251H8.3463L8.0771,7.0059ZM5.5179,13.5652H9.4948l-.1786-.8259h-3.62ZM5.21,5.0137a2.7523,2.7523,0,0,1,.0161-3.0518L4.812,1.6826a3.25,3.25,0,0,0-.019,3.6065ZM10.7568,3.5a3.2433,3.2433,0,0,0-.5341-1.7861l-.418.2754a2.7517,2.7517,0,0,1-.0176,3.0488l.4141.2793A3.2341,3.2341,0,0,0,10.7568,3.5ZM3.5342,6.1182A4.7637,4.7637,0,0,1,3.3813,1.13L2.9478.88a5.2643,5.2643,0,0,0,.1694,5.5137Z`;
        const towerHandler = (evt: any) => {
          const coordinate = evt.coordinate;
          handleTowerClickFromSvg(
            vectorSourceRef.current,
            coordinate,
            towerPathD,
            15,
            1
          );
        };
        mapRef.current.on("click", towerHandler);
        (mapRef.current as any).TowerClickHandler = towerHandler;
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
