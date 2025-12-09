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
import { Select } from "ol/interaction";
import {
  convertFeaturesToGeoJSON,
  convertGeoJSONToFeatures,
  isEmptyExtent,
  normalizeImportedGeoJSON,
} from "@/utils/serializationUtils";
import { fitMapToFeatures, restoreMapView } from "@/utils/mapStateUtils";
import { JobSelection } from "./JobSelection";
import { useMapProjects } from "@/hooks/useMapProjects";
import PropertiesPanel from "./PropertiesPanel";
import { TextDialog } from "./TextDialog";
import { handleTextClick } from "@/icons/Text";

// Interface for properly serializable map data
interface SerializedMapData {
  features: any; // GeoJSON FeatureCollection - using any to avoid type issues
  mapState?: {
    center: [number, number];
    zoom: number;
    viewMode: "osm" | "satellite";
  };
}

const MapEditor: React.FC = () => {
  // Core map references
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const vectorLayerRef = useRef<any>(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const isProjectReadyRef = useRef(false);

  const {
    projects,
    currentProjectId,
    currentDb,
    loadProject,
    saveMapState: saveToDb,
    loadMapState: loadFromDb,
  } = useMapProjects();

  // Custom hooks
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

  const selectInteractionRef = useRef<Select | null>(null);
  const undoRedoInteractionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text dialog state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingCoordinate, setPendingCoordinate] = useState<number[] | null>(null);
  const [editingTextFeature, setEditingTextFeature] = useState<Feature<Geometry> | null>(null);

  // File import handler
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
          try {
            console.log("kml : ", data);

            // Step 1: Parse KML to OpenLayers Features with correct projections
            const kmlFeatures = new KML({ extractStyles: false }).readFeatures(
              data,
              {
                featureProjection: "EPSG:3857",
                dataProjection: "EPSG:4326", // CRITICAL: KML is always in WGS84
              }
            );

            // Step 2: Convert Features to GeoJSON with proper property preservation
            const tempSource = new VectorSource();
            tempSource.addFeatures(kmlFeatures);
            let geoJSONData = convertFeaturesToGeoJSON(tempSource);
            geoJSONData = normalizeImportedGeoJSON(geoJSONData);
            console.log(
              "KML converted and normalized to GeoJSON:",
              geoJSONData
            );

            // Step 3: Convert GeoJSON back to Features for map display
            features = convertGeoJSONToFeatures(geoJSONData);
            console.log("KML features parsed and converted:", features.length);
          } catch (error) {
            console.error("Error parsing KML:", error);
            alert("Failed to parse KML file. Check console for details.");
            return;
          }
        } else if (name.endsWith(".kmz")) {
          try {
            console.log("kmz : ", data);
            const zip = await JSZip.loadAsync(file);
            const kmlFile = Object.keys(zip.files).find((f) =>
              f.toLowerCase().endsWith(".kml")
            );

            if (!kmlFile) {
              alert("No KML file found in KMZ archive");
              return;
            }

            const kmlText = await zip.file(kmlFile)?.async("text");
            if (!kmlText) {
              alert("Failed to extract KML from KMZ file");
              return;
            }

            // Step 1: Parse KML to OpenLayers Features with correct projections
            const kmlFeatures = new KML({ extractStyles: false }).readFeatures(
              kmlText,
              {
                featureProjection: "EPSG:3857",
                dataProjection: "EPSG:4326", // CRITICAL: KML is always in WGS84
              }
            );

            // Step 2: Convert Features to GeoJSON with proper property preservation
            const tempSource = new VectorSource();
            tempSource.addFeatures(kmlFeatures);
            let geoJSONData = convertFeaturesToGeoJSON(tempSource);
            geoJSONData = normalizeImportedGeoJSON(geoJSONData);
            console.log(
              "KMZ converted and normalized to GeoJSON:",
              geoJSONData
            );

            // Step 3: Convert GeoJSON back to Features for map display
            features = convertGeoJSONToFeatures(geoJSONData);
            console.log("KMZ features parsed and converted:", features.length);
          } catch (error) {
            console.error("Error parsing KMZ:", error);
            alert("Failed to parse KMZ file. Check console for details.");
            return;
          }
        }

        if (features.length === 0) {
          alert("No valid features found in the file.");
          return;
        }

        vectorSourceRef.current.clear();
        vectorSourceRef.current.addFeatures(features);

        const extent: Extent = vectorSourceRef.current.getExtent();
        if (mapRef.current) {
          fitMapToFeatures(mapRef.current, extent);
        }

        await saveMapState();
      } catch (err) {
        console.error(err);
        alert("Invalid or unsupported file format.");
      }
    };

    if (name.endsWith(".kmz")) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Map initialization
  const handleMapReady = (map: Map) => {
    mapRef.current = map;
  };

  const handleToolActivation = (toolId: string) => {
    setActiveTool(toolId);
  };

  const handleDelete = () => {
    if (selectedFeature) {
      vectorSourceRef.current.removeFeature(selectedFeature);
      setSelectedFeature(null);
      saveMapState();
    } else {
      alert("Please select a feature to delete.");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCopyOperation = (
    features: Feature<Geometry>[],
    isCut: boolean
  ) => {
    setCopiedFeatures(features, isCut);
  };

  const handlePasteOperation = (
    _features: Feature<Geometry>[],
    coordinates: number[] // target center coordinate for paste
  ) => {
    const pastedFeatures: Feature<Geometry>[] = [];

    const originals = _features;
    if (originals.length === 0) return;

    // 1. Determine a reference point for the group —
    //    here: center of bounding box of first (or you can also compute bounding box of all)
    const refGeom = originals[0].getGeometry();
    if (!refGeom) return;
    const refExtent = refGeom.getExtent();
    const refCenter: [number, number] = [
      (refExtent[0] + refExtent[2]) / 2,
      (refExtent[1] + refExtent[3]) / 2,
    ];

    // 2. Compute how much to shift the *group* so refCenter goes to the user-specified coordinates
    const offsetX = coordinates[0] - refCenter[0];
    const offsetY = coordinates[1] - refCenter[1];

    originals.forEach((originalFeature) => {
      const clone = originalFeature.clone();
      const geom = clone.getGeometry();
      if (geom) {
        // Translate geometry by the group offset
        geom.translate(offsetX, offsetY);
        clone.setGeometry(geom);
      }
      vectorSourceRef.current.addFeature(clone);
      pastedFeatures.push(clone);
    });

    if (pastedFeatures.length > 0) {
      setSelectedFeature(pastedFeatures[0]);
    }

    if (clipboardState.isCutOperation) {
      clearClipboard();
    }
  };

  const handleSelectInteractionReady = (selectInteraction: Select | null) => {
    selectInteractionRef.current = selectInteraction;
  };

  const handleUndoInteractionReady = (undoInteraction: any) => {
    undoRedoInteractionRef.current = undoInteraction;
    setInteractionReady(true);
  };

  const handleUndoOperation = () => {
    if (undoRedoInteractionRef.current?.hasUndo()) {
      undoRedoInteractionRef.current.undo();
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportClick = async (format: "geojson" | "kml" | "kmz") => {
    if (!mapRef.current) return;

    try {
      const mapData = await loadFromDb();

      if (!mapData?.features || mapData.features.length === 0) {
        alert("No features to export.");
        return;
      }

      const fileName = `map-export-${new Date().toISOString().split("T")[0]}`;

      // -------------------------------
      // GEOJSON DOWNLOAD
      // -------------------------------
      if (format === "geojson") {
        const jsonString = JSON.stringify(mapData.features, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        downloadBlob(blob, `${fileName}.json`);
        return;
      }

      // Convert GeoJSON → OL Features
      const geojsonFormat = new GeoJSON();
      const olFeatures = geojsonFormat.readFeatures(mapData.features, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });

      // -------------------------------
      // KML DOWNLOAD
      // -------------------------------
      const kmlFormat = new KML();
      const kmlString = kmlFormat.writeFeatures(olFeatures, {
        featureProjection: "EPSG:3857", // Current display projection
        dataProjection: "EPSG:4326", // Export coordinates in WGS84
      });

      if (format === "kml") {
        const blob = new Blob([kmlString], {
          type: "application/vnd.google-earth.kml+xml",
        });

        downloadBlob(blob, `${fileName}.kml`);
        return;
      }

      // -------------------------------
      // KMZ DOWNLOAD (zip KML)
      // -------------------------------
      if (format === "kmz") {
        const zip = new JSZip();
        zip.file(`${fileName}.kml`, kmlString);

        const kmzBlob = await zip.generateAsync({ type: "blob" });

        downloadBlob(kmzBlob, `${fileName}.kmz`);
        return;
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Check console.");
    }
  };

  // ✅ SAVE to isolated DB
  const saveMapState = async () => {
    if (!isProjectReadyRef.current) {
      console.warn("Project not ready for saving, skipping");
      return;
    }

    if (!mapRef.current) return;

    try {
      const mapData: SerializedMapData = {
        features: convertFeaturesToGeoJSON(vectorSourceRef.current),
        mapState: {
          center: mapRef.current.getView().getCenter() as [number, number],
          zoom: mapRef.current.getView().getZoom() || 0,
          viewMode: currentMapView,
        },
      };

      await saveToDb(mapData);
      console.log("Saved to isolated DB");
    } catch (error) {
      console.error("Failed to save map state:", error);
    }
  };

  // ✅ LOAD from isolated DB
  const handleLoadMapState = async () => {
    try {
      // 1. ALWAYS clear the map first!
      // This ensures old project data is removed even if the new project is empty
      vectorSourceRef.current.clear();

      const mapData = await loadFromDb();
      if (mapData?.features) {
        // vectorSourceRef.current.clear();
        const features = convertGeoJSONToFeatures(mapData.features);
        vectorSourceRef.current.addFeatures(features);

        const extent = vectorSourceRef.current.getExtent();
        if (!isEmptyExtent(extent) && mapRef.current) {
          fitMapToFeatures(mapRef.current, extent);
        }
      }
      if (mapData?.mapState && mapRef.current) {
        restoreMapView(mapRef.current, mapData.mapState, handleMapViewChange);
      }
      console.log("Map state loaded");
    } catch (error) {
      console.error("Failed to load map state:", error);
    }
  };

  // Update ready flag
  useEffect(() => {
    if (currentProjectId && currentDb && interactionReady) {
      isProjectReadyRef.current = true;
      console.log("Project is ready for saving");
    } else {
      isProjectReadyRef.current = false;
    }
  }, [currentProjectId, currentDb, interactionReady]);

  // Load map state when project changes
  useEffect(() => {
    if (!currentProjectId || !currentDb) {
      console.log("Waiting for project to load...");
      return;
    }

    console.log("Project loaded, loading map state");
    handleLoadMapState();
  }, [currentProjectId, currentDb]);

  // Setup auto-save listeners
  useEffect(() => {
    console.log("currentMapView: ", currentMapView);
    if (!interactionReady || !currentProjectId || !currentDb) {
      console.log("Waiting for project to be ready...");
      return;
    }

    console.log("Setting up auto-save listeners");

    const onStackAdd = () => {
      console.log("Feature added to stack");
      saveMapState();
    };
    const onUndo = () => {
      console.log("Undo operation performed");
      saveMapState();
    };
    const onRedo = () => {
      console.log("Redo operation performed");
      saveMapState();
    };

    undoRedoInteractionRef.current?.on("stack:add", onStackAdd);
    undoRedoInteractionRef.current?.on("undo", onUndo);
    undoRedoInteractionRef.current?.on("redo", onRedo);

    return () => {
      undoRedoInteractionRef.current?.un("stack:add", onStackAdd);
      undoRedoInteractionRef.current?.un("undo", onUndo);
      undoRedoInteractionRef.current?.un("redo", onRedo);
    };
  }, [interactionReady, currentProjectId, currentDb, currentMapView]);

  // Text tool event listener
  useEffect(() => {
    const handleTextToolClick = (event: CustomEvent) => {
      const { coordinate } = event.detail;
      setPendingCoordinate(coordinate);
      setTextDialogOpen(true);
    };

    // Add event listener for text tool clicks
    window.addEventListener('textToolClick', handleTextToolClick as EventListener);

    return () => {
      // Clean up event listener
      window.removeEventListener('textToolClick', handleTextToolClick as EventListener);
    };
  }, []);

  // Handle text feature selection for editing
  useEffect(() => {
    // Only handle editing when select tool is active and a text feature is selected
    if (activeTool === "select" && selectedFeature && selectedFeature.get("isText")) {
      const geometry = selectedFeature.getGeometry();
      if (geometry && geometry.getType() === "Point") {
        const point = geometry as any;
        const coordinate = point.getCoordinates();

        setEditingTextFeature(selectedFeature);
        setPendingCoordinate(coordinate);
        setTextDialogOpen(true);
      }
    } else if (activeTool !== "select" || !selectedFeature || !selectedFeature.get("isText")) {
      // Clear editing state when not editing a text feature
      setEditingTextFeature(null);
    }
  }, [activeTool, selectedFeature]);

  // Text dialog handlers
  const handleTextSubmit = (textContent: string) => {
    if (editingTextFeature) {
      // Update existing text feature
      editingTextFeature.set("text", textContent);
      // Text styling handled by layer style function
      // Force re-render to update text
      if (mapRef.current) {
        mapRef.current.render();
      }
      // Clear selection after editing
      setSelectedFeature(null);
    } else if (pendingCoordinate && vectorSourceRef.current) {
      // Create new text feature
      handleTextClick(vectorSourceRef.current, pendingCoordinate, textContent);
    }
  };

  const handleTextDialogClose = () => {
    setTextDialogOpen(false);
    setPendingCoordinate(null);
    setEditingTextFeature(null);
  };

  const handleRedoOperation = () => {
    if (undoRedoInteractionRef.current?.hasRedo()) {
      undoRedoInteractionRef.current.redo();
    }
  };

  // Keyboard shortcuts
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

  return (
    <div>
      <MapInstance
        onMapReady={handleMapReady}
        osmLayerRef={osmLayerRef}
        satelliteLayerRef={satelliteLayerRef}
        vectorLayerRef={vectorLayerRef}
        vectorSourceRef={vectorSourceRef}
      />

      <PropertiesPanel
        map={mapRef.current}
        selectedFeature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onSave={saveMapState}
      />

      <TextDialog
        isOpen={textDialogOpen}
        onClose={handleTextDialogClose}
        onSubmit={handleTextSubmit}
        coordinate={pendingCoordinate || [0, 0]}
        initialText={editingTextFeature?.get("text") || ""}
        isEditing={!!editingTextFeature}
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
        onExportClick={handleExportClick}
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

      <JobSelection
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={loadProject}
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
