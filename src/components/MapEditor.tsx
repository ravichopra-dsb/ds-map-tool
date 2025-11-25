import React, { useEffect, useRef, useState } from "react";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Extent } from "ol/extent";
import type Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import JSZip from "jszip";
import { MapViewToggle } from "./MapViewToggle";
import { LoadingOverlay } from "./LoadingOverlay";
import Toolbar from "./ToolBar";
import FileManager from "./FileManager";
import MapInstance from "./MapInstance";
import MapInteractions from "./MapInteractions";
import ToolManager from "./ToolManager";
import { useMapState } from "@/hooks/useMapState";
import { useToolState } from "@/hooks/useToolState";
import { useFeatureState } from "@/hooks/useFeatureState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { cloneFeature, offsetFeature } from "@/utils/interactionUtils";
import { Select } from "ol/interaction";
import SuperJSON from "superjson";
import { usePGlite } from "@electric-sql/pglite-react";

// Interface for properly serializable map data
interface SerializedMapData {
  features: any; // GeoJSON FeatureCollection - using any to avoid type issues
  mapState?: {
    center: [number, number];
    zoom: number;
    viewMode: "osm" | "satellite";
  };
}

// Conversion utilities for proper serialization
const convertFeaturesToGeoJSON = (vectorSource: any): any => {
  const features = vectorSource.getFeatures();
  const geoJSONFormat = new GeoJSON();

  try {
    const geoJSONFeatures = features.map((feature: Feature<Geometry>) => {
      // Extract style metadata before converting to GeoJSON
      const styleMetadata = extractStyleMetadata(feature);

      // Create a copy of the feature and add style metadata to properties
      const featureClone = feature.clone();

      // Add style metadata to feature properties
      Object.keys(styleMetadata).forEach((key) => {
        featureClone.set(key, styleMetadata[key]);
      });

      const geoJSONFeature = geoJSONFormat.writeFeature(featureClone, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      });

      const parsed = JSON.parse(geoJSONFeature);

      // Ensure properties object exists and contains our metadata
      if (!parsed.properties) {
        parsed.properties = {};
      }

      // Explicitly add all style metadata to properties
      Object.assign(parsed.properties, styleMetadata);

      return parsed;
    });

    return {
      type: "FeatureCollection",
      features: geoJSONFeatures,
    };
  } catch (error) {
    console.error("Error converting features to GeoJSON:", error);
    return {
      type: "FeatureCollection",
      features: [],
    };
  }
};

const convertGeoJSONToFeatures = (geoJSONData: any): Feature<Geometry>[] => {
  const geoJSONFormat = new GeoJSON();

  try {
    const features = geoJSONFormat.readFeatures(geoJSONData, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    });

    // Restore feature properties from GeoJSON properties
    features.forEach((feature: Feature<Geometry>) => {
      const geoJSONProperties = feature.getProperties();

      // Restore all icon type identifiers and metadata
      Object.keys(geoJSONProperties).forEach((key) => {
        if (key !== "geometry" && geoJSONProperties[key] !== undefined) {
          feature.set(key, geoJSONProperties[key]);
        }
      });

      // Call style recreation (though styling is handled by FeatureStyler)
      recreateFeatureStyle(feature);
    });

    return features;
  } catch (error) {
    console.error("Error converting GeoJSON to features:", error);
    return [];
  }
};

const saveMapDataToLocalStorage = (data: SerializedMapData): void => {
  try {
    const serializedData = SuperJSON.serialize(data);
    localStorage.setItem("DS-Stack", JSON.stringify(serializedData));
  } catch (error) {
    console.error("Error saving map data to localStorage:", error);
    // Handle localStorage quota exceeded
    if (error instanceof Error && error.name === "QuotaExceededError") {
      alert("Storage quota exceeded. Some old data may be cleared.");
      // Optionally clear old data or implement cleanup strategy
    }
  }
};

const loadMapDataFromLocalStorage = (): SerializedMapData | null => {
  try {
    const savedData = localStorage.getItem("DS-Stack");
    if (!savedData) return null;

    const parsedData = JSON.parse(savedData);
    const deserializedData = SuperJSON.deserialize(parsedData);

    // Validate the structure
    if (!deserializedData || typeof deserializedData !== "object") {
      console.warn("Invalid data structure in localStorage");
      return null;
    }

    return deserializedData as SerializedMapData;
  } catch (error) {
    console.error("Error loading map data from localStorage:", error);
    // Clear corrupted data
    localStorage.removeItem("DS-Stack");
    return null;
  }
};

// Helper function to check if extent is empty
const isEmptyExtent = (extent: Extent): boolean => {
  return (
    extent[0] === Infinity ||
    extent[1] === Infinity ||
    extent[2] === -Infinity ||
    extent[3] === -Infinity
  );
};

// Style serialization utilities
const extractStyleMetadata = (feature: Feature<Geometry>): any => {
  const featureType = feature.getGeometry()?.getType();
  const properties: any = {};

  // Store feature type for recreation
  properties.featureType = featureType;

  // Store icon type identifiers
  if (feature.get("isPit")) properties.isPit = true;
  if (feature.get("isGP")) properties.isGP = true;
  if (feature.get("isJunction")) properties.isJunction = true;
  if (feature.get("isTower")) properties.isTower = true;
  if (feature.get("isTriangle")) properties.isTriangle = true;
  if (feature.get("isArrow")) properties.isArrow = true;
  if (feature.get("isMeasure")) properties.isMeasure = true;
  if (feature.get("islegends")) properties.islegends = true;
  if (feature.get("legendType"))
    properties.legendType = feature.get("legendType");
  if (feature.get("distance")) properties.distance = feature.get("distance");
  if (feature.get("nonEditable")) properties.nonEditable = true;

  return properties;
};

const recreateFeatureStyle = (_feature: Feature<Geometry>): void => {
  // This will be called after features are loaded from GeoJSON
  // The FeatureStyler will handle the actual styling via getFeatureTypeStyle
  // We just need to make sure the feature properties are preserved
  // The style will be applied automatically when the feature is rendered
};

const MapEditor: React.FC = () => {
  // Core map references
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  console.log(vectorSourceRef);
  const vectorLayerRef = useRef<any>(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // PgLite database instance from hook
  const db = usePGlite();

  // Initialize database table
  const initializeDatabase = async () => {
    if (!db) return;

    try {
      // Create map_state table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS map_state (
          id INTEGER PRIMARY KEY,
          serialized_data TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("Database initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      return false;
    }
  };

  // Custom hooks for state management
  const {
    currentMapView,
    isTransitioning,
    osmLayerRef,
    satelliteLayerRef,
    handleMapViewChange,
  } = useMapState();

  const { activeTool, selectedLegend, setActiveTool, handleLegendSelect } =
    useToolState();

  const {
    selectedFeature,
    setSelectedFeature,
    clipboardState,
    setCopiedFeatures,
    clearClipboard,
  } = useFeatureState();

  // Reference to select interaction for keyboard shortcuts
  const selectInteractionRef = useRef<Select | null>(null);

  // Reference to undo interaction for keyboard shortcuts
  const undoRedoInteractionRef = useRef<any>(null);

  // File input reference for FileManager
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File change handler
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

  // Handle map initialization
  const handleMapReady = (map: Map) => {
    mapRef.current = map;
  };

  // Handle tool activation
  const handleToolActivation = (toolId: string) => {
    setActiveTool(toolId);
  };

  // Handle feature deletion
  const handleDelete = () => {
    if (selectedFeature) {
      vectorSourceRef.current.removeFeature(selectedFeature);
      setSelectedFeature(null);
      saveMapState(); // ✨ Save after delete
    } else {
      alert("Please select a feature to delete.");
    }
  };

  // Handle file import
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Copy-paste operation handlers
  const handleCopyOperation = (
    features: Feature<Geometry>[],
    isCut: boolean
  ) => {
    setCopiedFeatures(features, isCut);
  };

  const handlePasteOperation = (
    _features: Feature<Geometry>[],
    coordinates: number[]
  ) => {
    const pastedFeatures: Feature<Geometry>[] = [];

    clipboardState.copiedFeatures.forEach((originalFeature) => {
      const clonedFeature = cloneFeature(originalFeature);

      // Move cloned feature to the exact coordinates provided
      // Calculate offset needed to move feature from original position to target
      const originalGeometry = originalFeature.getGeometry();
      if (originalGeometry) {
        const originalExtent = originalGeometry.getExtent();
        const originalCenter = [
          (originalExtent[0] + originalExtent[2]) / 2,
          (originalExtent[1] + originalExtent[3]) / 2,
        ];

        // Calculate offset to move feature center to target coordinates
        const offsetX = coordinates[0] - originalCenter[0];
        const offsetY = coordinates[1] - originalCenter[1];

        // Apply translation
        const translatedFeature = offsetFeature(
          clonedFeature,
          offsetX,
          offsetY
        );
        vectorSourceRef.current.addFeature(translatedFeature);
        pastedFeatures.push(translatedFeature);
      }
    });

    // Select the first pasted feature
    if (pastedFeatures.length > 0) {
      setSelectedFeature(pastedFeatures[0]);
    }

    // If it was a cut operation, clear the clipboard after pasting
    if (clipboardState.isCutOperation) {
      clearClipboard();
    }
  };

  // Handle select interaction reference from MapInteractions
  const handleSelectInteractionReady = (selectInteraction: Select | null) => {
    selectInteractionRef.current = selectInteraction;
  };

  // Handle undo interaction reference from MapInteractions
  const handleUndoInteractionReady = (undoInteraction: any) => {
    undoRedoInteractionRef.current = undoInteraction;
    setInteractionReady(true);
    // console.log(undoRedoInteractionRef.current?.getStack());
    // console.log(
    //   "handleUndoInteractionReady UndoInteration MapEditor : ",
    //   undoInteraction
    // );
  };

  // Undo operation handler
  const handleUndoOperation = () => {
    // console.log("handleUndoOperation : ", undoRedoInteractionRef.current);
    // console.log(undoRedoInteractionRef.current?.getStack());
    // console.log(undoRedoInteractionRef.current?.getStack());
    if (
      undoRedoInteractionRef.current &&
      undoRedoInteractionRef.current.hasUndo()
    ) {
      undoRedoInteractionRef.current.undo();
    }
  };

  // Save map data to localStorage
  // const saveMapState = () => {
  //   if (!undoRedoInteractionRef.current || !mapRef.current) return;

  //   const mapData: SerializedMapData = {
  //     features: convertFeaturesToGeoJSON(vectorSourceRef.current),
  //     mapState: {
  //       center: mapRef.current.getView().getCenter() as [number, number],
  //       zoom: mapRef.current.getView().getZoom() || 0,
  //       viewMode: currentMapView,
  //     },
  //   };

  //   saveMapDataToLocalStorage(mapData);
  // };

  // Save map state to PgLite
  const saveMapState = async () => {
    if (!db || !mapRef.current) return;

    try {
      const mapData: SerializedMapData = {
        features: convertFeaturesToGeoJSON(vectorSourceRef.current),
        mapState: {
          center: mapRef.current.getView().getCenter() as [number, number],
          zoom: mapRef.current.getView().getZoom() || 0,
          viewMode: currentMapView,
        },
      };

      const serialized = JSON.stringify(SuperJSON.serialize(mapData));

      // Upsert single record with id=1
      const exists = await db.query("SELECT id FROM map_state WHERE id = 1;");
      if (exists.rows.length === 0) {
        await db.query(
          "INSERT INTO map_state (id, serialized_data) VALUES (1, $1);",
          [serialized]
        );
      } else {
        await db.query(
          "UPDATE map_state SET serialized_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1;",
          [serialized]
        );
      }

      console.log("Map state saved to PgLite");
    } catch (error) {
      console.error("Failed to save map state to PgLite:", error);
      // Fallback to localStorage if PgLite fails
      const mapData: SerializedMapData = {
        features: convertFeaturesToGeoJSON(vectorSourceRef.current),
        mapState: {
          center: mapRef.current.getView().getCenter() as [number, number],
          zoom: mapRef.current.getView().getZoom() || 0,
          viewMode: currentMapView,
        },
      };
      saveMapDataToLocalStorage(mapData);
    }
  };

  // Load map state from PgLite on DB ready
  const loadMapState = async () => {
    if (!db) return;

    try {
      const result = await db.query(
        "SELECT serialized_data FROM map_state WHERE id = 1;"
      );
      if (result.rows.length === 0) {
        console.log("No saved map state found in PgLite");
        return;
      }

      const row = result.rows[0] as { serialized_data: string };
      const serializedData: string = row.serialized_data;
      const mapData = SuperJSON.deserialize(JSON.parse(serializedData)) as SerializedMapData;

      if (mapData.features && mapData.features.features.length > 0) {
        vectorSourceRef.current.clear();
        const features = convertGeoJSONToFeatures(mapData.features);
        vectorSourceRef.current.addFeatures(features);

        const extent = vectorSourceRef.current.getExtent();
        if (!isEmptyExtent(extent) && mapRef.current) {
          mapRef.current.getView().fit(extent, {
            duration: 1000,
            padding: [50, 50, 50, 50],
            maxZoom: 18,
          });
        }
      }

      if (mapData.mapState && mapRef.current) {
        const { center, zoom, viewMode } = mapData.mapState;
        const view = mapRef.current.getView();
        if (center && zoom !== undefined) {
          view.setCenter(center);
          view.setZoom(zoom);
        }
        if (viewMode && viewMode !== currentMapView) {
          handleMapViewChange(viewMode);
        }
      }

      console.log("Map state loaded from PgLite");
    } catch (error) {
      console.error("Failed to load map state from PgLite:", error);
      // Fallback to localStorage if PgLite fails
      const savedMapData = loadMapDataFromLocalStorage();
      if (savedMapData) {
        console.log("Falling back to localStorage");
        // Load features from GeoJSON
        if (
          savedMapData.features &&
          savedMapData.features.features.length > 0
        ) {
          vectorSourceRef.current.clear();
          const savedFeatures = convertGeoJSONToFeatures(savedMapData.features);
          vectorSourceRef.current.addFeatures(savedFeatures);

          const extent = vectorSourceRef.current.getExtent();
          if (extent && extent.length === 4 && !isEmptyExtent(extent)) {
            mapRef.current?.getView().fit(extent, {
              duration: 1000,
              padding: [50, 50, 50, 50],
              maxZoom: 18,
            });
          }
        }

        // Restore map state if available
        if (savedMapData.mapState && mapRef.current) {
          const view = mapRef.current.getView();
          const { center, zoom, viewMode } = savedMapData.mapState;

          // Restore center and zoom
          if (center && zoom !== undefined) {
            view.setCenter(center);
            view.setZoom(zoom);
          }

          // Restore view mode
          if (viewMode && viewMode !== currentMapView) {
            handleMapViewChange(viewMode);
          }
        }
      }
    }
  };

  // Load once PgLite DB is ready
  useEffect(() => {
    if (!db) return;

    // Initialize database first, then load state
    initializeDatabase().then((success) => {
      if (success) {
        loadMapState();
      } else {
        console.log("Database initialization failed, using localStorage fallback");
        // Load from localStorage if database initialization fails
        const savedMapData = loadMapDataFromLocalStorage();
        if (savedMapData) {
          // Load features from GeoJSON
          if (
            savedMapData.features &&
            savedMapData.features.features.length > 0
          ) {
            vectorSourceRef.current.clear();
            const savedFeatures = convertGeoJSONToFeatures(savedMapData.features);
            vectorSourceRef.current.addFeatures(savedFeatures);

            const extent = vectorSourceRef.current.getExtent();
            if (extent && extent.length === 4 && !isEmptyExtent(extent)) {
              mapRef.current?.getView().fit(extent, {
                duration: 1000,
                padding: [50, 50, 50, 50],
                maxZoom: 18,
              });
            }
          }

          // Restore map state if available
          if (savedMapData.mapState && mapRef.current) {
            const view = mapRef.current.getView();
            const { center, zoom, viewMode } = savedMapData.mapState;

            // Restore center and zoom
            if (center && zoom !== undefined) {
              view.setCenter(center);
              view.setZoom(zoom);
            }

            // Restore view mode
            if (viewMode && viewMode !== currentMapView) {
              handleMapViewChange(viewMode);
            }
          }
        }
      }
    });
  }, [db]);

  useEffect(() => {
    if (!interactionReady) return;

    // Set up event listeners for undo/redo operations
    undoRedoInteractionRef.current?.on("stack:add", () => {
      console.log("Feature added to stack");
      saveMapState();
    });

    undoRedoInteractionRef.current?.on("stack:remove", () => {
      console.log("Feature removed from stack");
      saveMapState();
    });

    undoRedoInteractionRef.current?.on("undo", () => {
      console.log("Undo operation performed");
      saveMapState();
    });

    undoRedoInteractionRef.current?.on("redo", () => {
      console.log("Redo operation performed");
      saveMapState();
    });
  }, [undoRedoInteractionRef, interactionReady, currentMapView]);

  // Redo operation handler
  const handleRedoOperation = () => {
    if (
      undoRedoInteractionRef.current &&
      undoRedoInteractionRef.current.hasRedo()
    ) {
      undoRedoInteractionRef.current.redo();
    }
  };

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    map: mapRef.current,
    vectorSource: vectorSourceRef.current,
    selectInteraction: selectInteractionRef.current,
    clipboardFeatures: clipboardState.copiedFeatures,
    onCopyOperation: handleCopyOperation,
    onPasteOperation: handlePasteOperation,
    onSetActiveTool: setActiveTool,
    onUndoOperation: handleUndoOperation,
    onRedoOperation: handleRedoOperation,
    disabled: false,
  });

  // Load saved map data from localStorage on mount
  useEffect(() => {
    // Prevent duplicate loads during React StrictMode double-mounting
    if (hasLoadedFromStorage) return;

    const savedMapData = loadMapDataFromLocalStorage();

    if (savedMapData) {
      try {
        // Load features from GeoJSON
        if (
          savedMapData.features &&
          savedMapData.features.features.length > 0
        ) {
          vectorSourceRef.current.clear(); // Clear existing features before loading saved ones
          const savedFeatures = convertGeoJSONToFeatures(savedMapData.features);
          vectorSourceRef.current.addFeatures(savedFeatures);

          // Fit map view to loaded features extent
          const extent = vectorSourceRef.current.getExtent();
          if (extent && extent.length === 4 && !isEmptyExtent(extent)) {
            mapRef.current?.getView().fit(extent, {
              duration: 1000,
              padding: [50, 50, 50, 50],
              maxZoom: 18,
            });
          }
        }

        // Restore map state if available
        if (savedMapData.mapState && mapRef.current) {
          const view = mapRef.current.getView();
          const { center, zoom, viewMode } = savedMapData.mapState;

          // Restore center and zoom
          if (center && zoom !== undefined) {
            view.setCenter(center);
            view.setZoom(zoom);
          }

          // Restore view mode
          if (viewMode && viewMode !== currentMapView) {
            handleMapViewChange(viewMode);
          }
        }

        console.log(
          `Loaded ${savedMapData.features.features.length} features from localStorage`
        );
      } catch (error) {
        console.error("Error loading saved map data:", error);
      }
    }

    // Mark as loaded to prevent duplicate loads during StrictMode
    setHasLoadedFromStorage(true);
  }, [hasLoadedFromStorage]); // Add dependency to prevent duplicate loads

  return (
    <div>
      <MapInstance
        onMapReady={handleMapReady}
        osmLayerRef={osmLayerRef}
        satelliteLayerRef={satelliteLayerRef}
        vectorLayerRef={vectorLayerRef}
        vectorSourceRef={vectorSourceRef}
      />

      <MapInteractions
        map={mapRef.current}
        vectorLayer={vectorLayerRef.current}
        activeTool={activeTool}
        onFeatureSelect={setSelectedFeature}
        clipboardFeatures={clipboardState.copiedFeatures}
        onCopyFeatures={handleCopyOperation}
        onPasteFeatures={handlePasteOperation}
        onSelectInteractionReady={handleSelectInteractionReady}
        onUndoInteractionReady={handleUndoInteractionReady}
      />

      <ToolManager
        map={mapRef.current}
        vectorSource={vectorSourceRef.current}
        activeTool={activeTool}
        selectedLegend={selectedLegend}
        onToolChange={setActiveTool}
      />

      <Toolbar
        onFileImport={handleImportClick}
        onDeleteFeature={handleDelete}
        onToolActivate={handleToolActivation}
        activeTool={activeTool}
        selectedLegend={selectedLegend}
        onLegendSelect={handleLegendSelect}
      />

      <FileManager
        map={mapRef.current}
        vectorSource={vectorSourceRef.current}
        fileInputRef={fileInputRef}
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
    </div>
  );
};

export default MapEditor;
