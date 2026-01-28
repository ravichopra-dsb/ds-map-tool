import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { Vector as VectorSource } from "ol/source";
import { Feature } from "ol";
import { Point } from "ol/geom";
import type { Geometry } from "ol/geom";
import type { Extent } from "ol/extent";
import type Map from "ol/Map";
import GeoJSON from "ol/format/GeoJSON";
import KML from "ol/format/KML";
import JSZip from "jszip";
import { MapViewToggle } from "../components/MapViewToggle";
import { LoadingOverlay } from "../components/LoadingOverlay";
import Toolbar from "../components/ToolBar";
import FileManager from "../components/FileManager";
import MapInstance from "../components/MapInstance";
import MapInteractions from "../components/MapInteractions";
import ToolManager from "../components/ToolManager";
import { useMapState } from "@/hooks/useMapState";
import { useToolState } from "@/hooks/useToolState";
import { useFeatureState } from "@/hooks/useFeatureState";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEscapeHandler } from "@/hooks/useEscapeHandler";
import { Select, DragBox } from "ol/interaction";
import {
  convertFeaturesToGeoJSON,
  convertGeoJSONToFeatures,
  isEmptyExtent,
  normalizeImportedGeoJSON,
} from "@/utils/serializationUtils";
import { fitMapToFeatures, restoreMapView } from "@/utils/mapStateUtils";
import { getMapUrl } from "@/utils/routeUtils";
// import { JobSelection } from "../components/JobSelection";
import { useMapProjects } from "@/hooks/useMapProjects";
import PropertiesPanel from "../components/PropertiesPanel";
import { TextDialog } from "../components/TextDialog";
import { handleTextClick } from "@/icons/Text";
import SearchWrapper, {
  type SearchWrapperRef,
} from "../components/SearchWrapper";
import type { SearchResult } from "../components/SearchPanel";
import { PdfExportDialog } from "../components/PdfExportDialog";
import { DragBoxInstruction } from "../components/DragBoxInstruction";
import {
  exportMapToImage,
  type MapImageExportResult,
  type ExportProgress,
} from "@/utils/mapImageExport";
import { IconPickerDialog } from "../components/IconPickerDialog";
import { MergePropertiesDialog } from "@/components/MergePropertiesDialog";
import { OffsetDialog } from "@/components/OffsetDialog";
import { type MergeRequestDetail } from "@/components/MapInteractions";
import { performMerge } from "@/utils/splitUtils";
import { createOffsetFeature, type OffsetSide } from "@/utils/offsetUtils";
import {
  injectKmlStyles,
  parseKmlStyles,
  parsePlacemarkStyles,
  applyKmlStylesToFeatures,
} from "@/utils/kmlStyleUtils";
import {
  createExportedGeoJSON,
  extractFolderStructureFromGeoJSON,
  parseKmlFolders,
} from "@/utils/kmlFolderUtils";
import type { PdfExportConfig } from "@/types/pdf";
import { HelpModal } from "@/components/HelpModal";
import { useToolStore } from "@/stores/useToolStore";
import { useFolderStore } from "@/stores/useFolderStore";
import { SeparateFeatures } from "@/components/SeparateFeatures";
import { ToolCommand } from "@/components/ToolCommand";

// Interface for properly serializable map data
interface SerializedMapData {
  features: any; // GeoJSON FeatureCollection - using any to avoid type issues
  mapState?: {
    center: [number, number];
    zoom: number;
    viewMode: "osm" | "satellite";
  };
  folderStructure?: {
    folders: Record<string, any>;
  };
}

const MapEditor: React.FC = () => {
  // URL routing
  const { projectId: urlProjectId } = useParams<{
    projectId: string;
    projectName: string;
  }>();
  const navigate = useNavigate();

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

  const {
    activeTool,
    selectedLegend,
    selectedIconPath,
    lineColor,
    lineWidth,
    setActiveTool,
    setLineColor,
    setLineWidth,
    handleLegendSelect,
    handleIconSelect: handleIconSelectFromHook,
  } = useToolState();

  const skipNextPickerOpen = useRef(false);

  const {
    selectedFeature,
    setSelectedFeature,
    clipboardState,
    setCopiedFeatures,
    clearClipboard,
  } = useFeatureState();

  const { setUndoRedoInteraction, toggleOrthoMode } = useToolStore();

  const selectInteractionRef = useRef<Select | null>(null);
  const undoRedoInteractionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapperRef = useRef<SearchWrapperRef | null>(null);

  // Text dialog state
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingCoordinate, setPendingCoordinate] = useState<number[] | null>(
    null
  );
  const [editingTextFeature, setEditingTextFeature] =
    useState<Feature<Geometry> | null>(null);
  const [editingTextScale, setEditingTextScale] = useState(1);
  const [editingTextRotation, setEditingTextRotation] = useState(0);

  // Icon picker dialog state
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Merge properties dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<MergeRequestDetail | null>(
    null
  );

  // Offset dialog state
  const [offsetDialogOpen, setOffsetDialogOpen] = useState(false);
  const [pendingOffsetFeature, setPendingOffsetFeature] = useState<Feature<Geometry> | null>(
    null
  );

  // PDF export dialog state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDragBoxActive, setIsDragBoxActive] = useState(false);
  const [selectedExtent, setSelectedExtent] = useState<Extent | null>(null);
  const dragBoxRef = useRef<DragBox | null>(null);

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

          // Check for folder structure from dsMapTool export
          const importedFolderStructure = extractFolderStructureFromGeoJSON(json);
          if (importedFolderStructure) {
            // Merge imported folders with existing folders
            const currentFolders = useFolderStore.getState().folders;
            useFolderStore.getState().loadFromStorage({
              folders: { ...currentFolders, ...importedFolderStructure.folders },
            });
            console.log("Imported folder structure:", Object.keys(importedFolderStructure.folders).length, "folders");
          }

          features = new GeoJSON().readFeatures(json, {
            featureProjection: "EPSG:3857",
          });
        } else if (name.endsWith(".kml")) {
          try {
            console.log("kml : ", data);

            // Step 0: Parse folder structure from KML
            const { folders: importedFolders, featureFolderMap } = parseKmlFolders(data as string);
            console.log("Parsed KML folders:", Object.keys(importedFolders).length, "folders found");

            // Step 0.5: Parse standard KML styles (for Google Earth compatibility)
            const kmlStyleMap = parseKmlStyles(data as string);
            const placemarkStyles = parsePlacemarkStyles(data as string);
            console.log("Parsed KML styles:", kmlStyleMap.size, "styles found");

            // Step 1: Parse KML to OpenLayers Features with correct projections
            const kmlFeatures = new KML({ extractStyles: false }).readFeatures(
              data,
              {
                featureProjection: "EPSG:3857",
                dataProjection: "EPSG:4326", // CRITICAL: KML is always in WGS84
              }
            );

            // Step 1.5: Apply parsed KML styles to features (if no ExtendedData styles)
            applyKmlStylesToFeatures(kmlFeatures, kmlStyleMap, placemarkStyles);

            // Step 1.6: Apply folder assignments from KML structure
            if (Object.keys(importedFolders).length > 0) {
              kmlFeatures.forEach((feature, index) => {
                const folderId = featureFolderMap.get(index);
                if (folderId) {
                  feature.set("folderId", folderId);
                }
              });
              // Merge imported folders into store
              const currentFolders = useFolderStore.getState().folders;
              useFolderStore.getState().loadFromStorage({
                folders: { ...currentFolders, ...importedFolders },
              });
            }

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

            // Step 0: Parse folder structure from KML
            const { folders: importedFolders, featureFolderMap } = parseKmlFolders(kmlText);
            console.log("Parsed KMZ folders:", Object.keys(importedFolders).length, "folders found");

            // Step 0.5: Parse standard KML styles (for Google Earth compatibility)
            const kmlStyleMap = parseKmlStyles(kmlText);
            const placemarkStyles = parsePlacemarkStyles(kmlText);
            console.log("Parsed KMZ styles:", kmlStyleMap.size, "styles found");

            // Step 1: Parse KML to OpenLayers Features with correct projections
            const kmlFeatures = new KML({ extractStyles: false }).readFeatures(
              kmlText,
              {
                featureProjection: "EPSG:3857",
                dataProjection: "EPSG:4326", // CRITICAL: KML is always in WGS84
              }
            );

            // Step 1.5: Apply parsed KML styles to features (if no ExtendedData styles)
            applyKmlStylesToFeatures(kmlFeatures, kmlStyleMap, placemarkStyles);

            // Step 1.6: Apply folder assignments from KML structure
            if (Object.keys(importedFolders).length > 0) {
              kmlFeatures.forEach((feature, index) => {
                const folderId = featureFolderMap.get(index);
                if (folderId) {
                  feature.set("folderId", folderId);
                }
              });
              // Merge imported folders into store
              const currentFolders = useFolderStore.getState().folders;
              useFolderStore.getState().loadFromStorage({
                folders: { ...currentFolders, ...importedFolders },
              });
            }

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

        // Check if features already have folder assignments (from imported structure)
        const hasExistingFolders = features.some((f) => f.get("folderId"));

        // Only create wrapper folder if features don't already have folder assignments
        if (!hasExistingFolders) {
          const filename = file.name.replace(/\.[^/.]+$/, "");
          const folderId = useFolderStore.getState().createFolder(filename);

          // Set folderId on all imported features
          features.forEach((feature) => {
            feature.set("folderId", folderId);
          });
        }

        // Add features without clearing existing ones
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

  // Search location handler
  const handleLocationSelected = (
    coordinate: [number, number],
    result: SearchResult
  ) => {
    console.log("Search location selected:", coordinate, result);
    // You can add custom logic here when a location is selected
    // For example, you could save it to the current project or add it as a feature
  };

  // Map initialization
  const handleMapReady = (map: Map) => {
    mapRef.current = map;
  };

  const handleToolActivation = (toolId: string) => {
    // Special handling for icons tool - if already active, dispatch event to reopen picker
    if (toolId === "icons" && activeTool === "icons") {
      const iconPickerEvent = new CustomEvent("iconPickerOpen");
      window.dispatchEvent(iconPickerEvent);
      return;
    }

    setActiveTool(toolId);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearSelection = () => {
    setSelectedFeature(null);
  };

  const handleDeleteFromKeyboard = () => {
    saveMapState();
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
    //    here: center of bounding box of first
    const refGeom = originals[0].getGeometry();
    if (!refGeom) return;
    const refExtent = refGeom.getExtent();
    const refCenter: [number, number] = [
      (refExtent[0] + refExtent[2]) / 2,
      (refExtent[1] + refExtent[3]) / 2,
    ];

    // 2. Compute how much to shift the *group*
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

      // FIX: Reset style to prevent inheriting the "selected" style 
      // from the original feature (if it was selected).
      // This ensures the clone starts with the layer's default style.
      clone.setStyle(undefined);

      vectorSourceRef.current.addFeature(clone);
      pastedFeatures.push(clone);
    });

    // Sync with Select interaction to ensure pasted features are selected
    if (selectInteractionRef.current && pastedFeatures.length > 0) {
      // Ensure Select interaction is active before modifying selection
      const wasActive = selectInteractionRef.current.getActive();
      selectInteractionRef.current.setActive(true);

      // Clear old selection (removes originals from selection)
      selectInteractionRef.current.getFeatures().clear();

      // Add pasted features to selection so they appear selected
      pastedFeatures.forEach((feature) => {
        selectInteractionRef.current!.getFeatures().push(feature);
      });

      // Restore previous active state if it wasn't active before
      if (!wasActive) {
        selectInteractionRef.current.setActive(false);
      }
    }

    if (pastedFeatures.length > 0) {
      setSelectedFeature(pastedFeatures[0]);
    }

    if (clipboardState.isCutOperation) {
      clearClipboard();
    }
  };

  const handleSelectInteractionReady = useCallback(
    (selectInteraction: Select | null) => {
      selectInteractionRef.current = selectInteraction;
    },
    []
  );

  const handleUndoInteractionReady = (undoInteraction: any) => {
    undoRedoInteractionRef.current = undoInteraction;
    setUndoRedoInteraction(undoInteraction);
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

      // Use current active job name as fileName
      const currentProject = projects.find(p => p.id === currentProjectId);
      const fileName = currentProject?.name || "map-export";

      // -------------------------------
      // GEOJSON DOWNLOAD (with folder structure)
      // -------------------------------
      if (format === "geojson") {
        const exportData = createExportedGeoJSON(
          mapData.features,
          mapData.folderStructure
        );
        const jsonString = JSON.stringify(exportData, null, 2);
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
      let kmlString = kmlFormat.writeFeatures(olFeatures, {
        featureProjection: "EPSG:3857", // Current display projection
        dataProjection: "EPSG:4326", // Export coordinates in WGS84
      });

      // Inject standard KML styles and folder structure for Google Earth compatibility
      kmlString = injectKmlStyles(
        kmlString,
        olFeatures,
        mapData.folderStructure?.folders
      );

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

  // PDF Export - Client-side with jsPDF
  const handlePdfExportClick = () => {
    if (!mapRef.current) {
      alert("Map not ready for export");
      return;
    }

    // Activate DragBox selection mode
    setIsDragBoxActive(true);
    setSelectedExtent(null);

    // Initialize DragBox interaction if not already created
    if (!dragBoxRef.current) {
      const dragBox = new DragBox();

      dragBox.on("boxend", () => {
        const extent = dragBox.getGeometry().getExtent();
        setSelectedExtent(extent);
        setIsDragBoxActive(false);

        // Remove DragBox interaction
        if (mapRef.current) {
          mapRef.current.removeInteraction(dragBox);
        }
        dragBoxRef.current = null;

        // Open PDF dialog with selected extent
        setPdfDialogOpen(true);
      });

      dragBox.on("boxstart", () => {
        // Clear previous selection when starting new drag
        setSelectedExtent(null);
      });

      dragBoxRef.current = dragBox;
      mapRef.current.addInteraction(dragBox);
    } else {
      // Re-add if already exists
      mapRef.current.addInteraction(dragBoxRef.current);
    }
  };

  const handlePdfExport = async (
    config: PdfExportConfig,
    onProgress: (progress: ExportProgress) => void
  ): Promise<MapImageExportResult> => {
    if (!mapRef.current) {
      throw new Error("Map not ready for export");
    }

    if (!selectedExtent) {
      throw new Error("No area selected for export");
    }

    setIsExportingPdf(true);

    try {
      const imageResult = await exportMapToImage(
        mapRef.current,
        config,
        onProgress,
        selectedExtent
      );
      return imageResult;
    } catch (error) {
      console.error("PDF export failed:", error);
      throw error;
    } finally {
      setIsExportingPdf(false);
      setPdfDialogOpen(false);
      setSelectedExtent(null);
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
        folderStructure: useFolderStore.getState().exportToStorage(),
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
      // Temporarily disable UndoRedo interaction to prevent it from tracking recovery operations
      const wasUndoRedoActive = undoRedoInteractionRef.current !== null;
      if (wasUndoRedoActive) {
        undoRedoInteractionRef.current?.setActive(false);
        console.log(
          "Temporarily disabled UndoRedo interaction during recovery"
        );
      }

      // 1. ALWAYS clear the map first!
      // This ensures old project data is removed even if the new project is empty
      vectorSourceRef.current.clear();
      // Also clear folder structure when switching projects
      useFolderStore.getState().clearAll();

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
      // Restore folder structure if available
      if (mapData?.folderStructure) {
        useFolderStore.getState().loadFromStorage(mapData.folderStructure);
      }
      if (mapData?.mapState && mapRef.current) {
        restoreMapView(mapRef.current, mapData.mapState, handleMapViewChange);
      }
      console.log("Map state loaded");

      // Re-enable UndoRedo interaction after recovery is complete
      if (wasUndoRedoActive) {
        setTimeout(() => {
          undoRedoInteractionRef.current?.setActive(true);
          console.log("Re-enabled UndoRedo interaction after recovery");
        }, 100);
      }
    } catch (error) {
      console.error("Failed to load map state:", error);
      // Ensure UndoRedo is re-enabled even on error
      undoRedoInteractionRef.current?.setActive(true);
    }
  };

  // Initialize project from URL on mount
  useEffect(() => {
    if (urlProjectId && !currentProjectId) {
      console.log('Loading project from URL:', urlProjectId);
      loadProject(urlProjectId).catch(error => {
        console.error('Failed to load project from URL:', error);
        navigate('/'); // Redirect to home if project not found
      });
    }
  }, []); // Run only on mount

  // Keep URL in sync with current project
  useEffect(() => {
    if (currentProjectId && urlProjectId !== currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId);
      if (project) {
        navigate(getMapUrl(currentProjectId, project.name), { replace: true });
      }
    }
  }, [currentProjectId, projects, navigate, urlProjectId]);

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

  // Auto-close Properties Panel when switching tools (except select tool)
  useEffect(() => {
    // Only keep selection when switching TO select tool
    // Clear selection when switching to other tools to auto-close Properties Panel
    if (activeTool !== "select") {
      setSelectedFeature(null);
    }
  }, [activeTool, setSelectedFeature]);

  // Text tool event listener
  useEffect(() => {
    const handleTextToolClick = (event: CustomEvent) => {
      const { coordinate } = event.detail;
      setPendingCoordinate(coordinate);

      // Create temporary text feature for live preview when adding new text
      if (vectorSourceRef.current) {
        const tempFeature = new Feature({
          geometry: new Point(coordinate),
          text: "Text",
          textScale: 1,
          textRotation: 0,
          isText: true,
          _isTemporaryTextPreview: true, // Mark as temporary for cleanup
        });
        vectorSourceRef.current.addFeature(tempFeature);
        setEditingTextFeature(tempFeature);
      }

      setTextDialogOpen(true);
    };

    // Add event listener for text tool clicks
    window.addEventListener(
      "textToolClick",
      handleTextToolClick as EventListener
    );

    return () => {
      // Clean up event listener
      window.removeEventListener(
        "textToolClick",
        handleTextToolClick as EventListener
      );
    };
  }, []);

  // Icon picker event listener with guard
  useEffect(() => {
    const handleIconPickerOpen = () => {
      if (skipNextPickerOpen.current) {
        skipNextPickerOpen.current = false;
        return;
      }
      setIconPickerOpen(true);
    };

    // Add event listener for icon picker open
    window.addEventListener("iconPickerOpen", handleIconPickerOpen);

    return () => {
      // Clean up event listener
      window.removeEventListener("iconPickerOpen", handleIconPickerOpen);
    };
  }, []);

  // Merge request event listener
  useEffect(() => {
    const handleMergeRequest = (event: CustomEvent<MergeRequestDetail>) => {
      setPendingMerge(event.detail);
      setMergeDialogOpen(true);
    };

    window.addEventListener(
      "mergeRequest",
      handleMergeRequest as EventListener
    );

    return () => {
      window.removeEventListener(
        "mergeRequest",
        handleMergeRequest as EventListener
      );
    };
  }, []);

  // Offset request event listener
  useEffect(() => {
    const handleOffsetRequest = (event: CustomEvent<{ feature: Feature<Geometry>; vectorSource: any }>) => {
      setPendingOffsetFeature(event.detail.feature);
      setOffsetDialogOpen(true);
    };

    window.addEventListener(
      "offsetRequest",
      handleOffsetRequest as EventListener
    );

    return () => {
      window.removeEventListener(
        "offsetRequest",
        handleOffsetRequest as EventListener
      );
    };
  }, []);

  // Continuation complete event listener - save to DB after LineString continuation
  useEffect(() => {
    const handleContinuationComplete = () => {
      console.log("Continuation complete, saving to DB");
      saveMapState();
    };

    window.addEventListener(
      "continuationComplete",
      handleContinuationComplete as EventListener
    );

    return () => {
      window.removeEventListener(
        "continuationComplete",
        handleContinuationComplete as EventListener
      );
    };
  }, [saveMapState]);

  // Track previous selected text feature for double-click-to-edit detection
  const previousSelectedTextRef = useRef<Feature<Geometry> | null>(null);

  // Handle text feature selection for editing
  // Only open edit dialog on double-click (clicking same text twice)
  // Single click just selects for dragging
  useEffect(() => {
    // Only handle when select tool is active and a text feature is selected
    if (
      activeTool === "select" &&
      selectedFeature &&
      selectedFeature.get("isText")
    ) {
      // Check if this is a "double-click" (clicking same text that's already selected)
      const isSameTextClicked = previousSelectedTextRef.current === selectedFeature;

      if (isSameTextClicked && !textDialogOpen) {
        // Second click on same text - open edit dialog
        const geometry = selectedFeature.getGeometry();
        if (geometry && geometry.getType() === "Point") {
          const point = geometry as any;
          const coordinate = point.getCoordinates();

          const currentScale = selectedFeature.get("textScale") || 1;
          const currentRotation = selectedFeature.get("textRotation") || 0;

          setEditingTextFeature(selectedFeature);
          setEditingTextScale(currentScale);
          setEditingTextRotation(currentRotation);
          setPendingCoordinate(coordinate);

          // Clear selection styling before opening dialog
          selectInteractionRef.current?.getFeatures().clear();

          setTextDialogOpen(true);
        }
      }

      // Update previous reference for next click detection
      previousSelectedTextRef.current = selectedFeature;
    } else if (
      activeTool !== "select" ||
      !selectedFeature ||
      !selectedFeature.get("isText")
    ) {
      // Clear editing state when not editing a text feature
      setEditingTextFeature(null);
      setEditingTextScale(1);
      setEditingTextRotation(0);
      // Clear previous text reference when deselected or different feature selected
      if (!selectedFeature?.get("isText")) {
        previousSelectedTextRef.current = null;
      }
    }
  }, [activeTool, selectedFeature, textDialogOpen]);

  // Text dialog handlers
  const handleTextSubmit = (
    textContent: string,
    scale?: number,
    rotation?: number,
    opacity?: number,
    fillColor?: string,
    strokeColor?: string
  ) => {
    if (editingTextFeature) {
      // Update existing text feature with all properties
      editingTextFeature.set("text", textContent);
      editingTextFeature.set("textScale", scale || 1);
      editingTextFeature.set("textRotation", rotation || 0);
      editingTextFeature.set("textOpacity", opacity ?? 1);
      editingTextFeature.set("textFillColor", fillColor || "#000000");
      editingTextFeature.set("textStrokeColor", strokeColor || "#ffffff");

      // Remove temporary flag if it was a new text feature
      if (editingTextFeature.get("_isTemporaryTextPreview")) {
        editingTextFeature.unset("_isTemporaryTextPreview");
      }

      // Text styling handled by layer style function
      // Force re-render to update text
      if (mapRef.current) {
        mapRef.current.render();
      }
      // Clear selection after editing
      setSelectedFeature(null);
    } else if (pendingCoordinate && vectorSourceRef.current) {
      // Create new text feature with scale/rotation/opacity/colors
      handleTextClick(
        vectorSourceRef.current,
        pendingCoordinate,
        textContent,
        scale,
        rotation,
        opacity,
        fillColor,
        strokeColor
      );
    }
  };

  const handleTextDialogClose = () => {
    // If we created a temporary feature for adding new text and user cancelled, remove it
    if (editingTextFeature && vectorSourceRef.current) {
      const features = vectorSourceRef.current.getFeatures();
      if (features.includes(editingTextFeature)) {
        // Only remove if it's still marked as temporary (wasn't submitted)
        // If submitted, the flag would have been removed in handleTextSubmit
        if (editingTextFeature.get("_isTemporaryTextPreview")) {
          vectorSourceRef.current.removeFeature(editingTextFeature);
        }
      }
    }

    // Deselect feature (same as PropertiesPanel)
    setSelectedFeature(null);
    selectInteractionRef.current?.getFeatures().clear();

    setTextDialogOpen(false);
    setPendingCoordinate(null);
    setEditingTextFeature(null);
    setEditingTextScale(1);
    setEditingTextRotation(0);
  };

  const handleIconSelect = (iconPath: string) => {
    if (!mapRef.current) return;

    // Set guard to prevent picker from reopening
    skipNextPickerOpen.current = true;

    // Use the hook to set the icon path and activate icons tool
    handleIconSelectFromHook(iconPath);

    // Close the dialog
    setIconPickerOpen(false);

    // Save map state
    saveMapState();
  };

  const handleIconPickerClose = () => {
    setIconPickerOpen(false);
    // Only switch to select tool if no icon is selected
    if (!selectedIconPath) {
      setActiveTool("select");
    }
  };

  // Merge dialog handlers
  const handleMergeConfirm = (selectedProperties: Record<string, any>) => {
    if (!pendingMerge) return;

    const {
      feature1,
      feature2,
      feature1Endpoint,
      feature2Endpoint,
      vectorSource,
    } = pendingMerge;

    // Perform merge with selected properties
    const mergedFeature = performMerge(
      vectorSource,
      feature1,
      feature2,
      feature1Endpoint,
      feature2Endpoint,
      selectedProperties
    );

    if (mergedFeature) {
      // Select the merged feature
      setSelectedFeature(mergedFeature);
      // Save map state
      saveMapState();
    }

    // Close dialog and clear pending merge
    setMergeDialogOpen(false);
    setPendingMerge(null);
  };

  const handleMergeDialogClose = () => {
    setMergeDialogOpen(false);
    setPendingMerge(null);
  };

  // Offset dialog handlers
  const handleOffsetApply = (distance: number, side: OffsetSide) => {
    if (!pendingOffsetFeature) return;

    const newFeature = createOffsetFeature(pendingOffsetFeature, distance, side);
    if (newFeature) {
      vectorSourceRef.current.addFeature(newFeature);
      setSelectedFeature(newFeature);
      saveMapState();
    }

    setOffsetDialogOpen(false);
    setPendingOffsetFeature(null);
  };

  const handleOffsetDialogClose = () => {
    setOffsetDialogOpen(false);
    setPendingOffsetFeature(null);
  };

  const handleRedoOperation = () => {
    if (undoRedoInteractionRef.current?.hasRedo()) {
      undoRedoInteractionRef.current.redo();
    }
  };

  // Global Escape handler - closes all dialogs/panels, deselects features, activates select tool
  const handleEscapePress = useCallback(() => {
    // Close all dialogs
    setTextDialogOpen(false);
    setIconPickerOpen(false);
    setMergeDialogOpen(false);
    setPdfDialogOpen(false);

    // Cancel DragBox selection if active
    if (isDragBoxActive && dragBoxRef.current && mapRef.current) {
      mapRef.current.removeInteraction(dragBoxRef.current);
      dragBoxRef.current = null;
      setIsDragBoxActive(false);
      setSelectedExtent(null);
    }

    // Clear feature selection (closes PropertiesPanel)
    setSelectedFeature(null);

    // Clear select interaction selection
    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }

    // Clear editing states
    setEditingTextFeature(null);
    setPendingMerge(null);
    setPendingCoordinate(null);

    // Activate select tool
    setActiveTool('select');
  }, [isDragBoxActive, setSelectedFeature, setActiveTool]);

  // Subscribe to global escape events
  useEscapeHandler(handleEscapePress);

  // Multi-select handler (memoized to prevent Select interaction recreation)
  const handleMultiSelectChange = useCallback(
    (features: Feature<Geometry>[]) => {
      // Set the first feature as primary selection for properties panel
      setSelectedFeature(features[0] || null);
    },
    [setSelectedFeature]
  );

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
    onClearSelection: handleClearSelection,
    onDeleteOperation: handleDeleteFromKeyboard,
    onOrthoToggle: toggleOrthoMode,
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

      {/* Search Control - integrated with the map */}
      {mapRef.current && (
        <SearchWrapper
          map={mapRef.current}
          onLocationSelected={handleLocationSelected}
          ref={searchWrapperRef}
        />
      )}

      <PropertiesPanel
        map={mapRef.current}
        selectedFeature={selectedFeature}
        onClose={() => {
          setSelectedFeature(null);
          selectInteractionRef.current?.getFeatures().clear();
        }}
        onSave={saveMapState}
        selectInteraction={selectInteractionRef.current}
      />

      <TextDialog
        isOpen={textDialogOpen}
        onClose={handleTextDialogClose}
        onSubmit={handleTextSubmit}
        coordinate={pendingCoordinate || [0, 0]}
        initialText={editingTextFeature?.get("text") || ""}
        initialScale={editingTextScale}
        initialRotation={editingTextRotation}
        initialOpacity={editingTextFeature?.get("textOpacity")}
        initialFillColor={editingTextFeature?.get("textFillColor")}
        initialStrokeColor={editingTextFeature?.get("textStrokeColor")}
        isEditing={!!editingTextFeature}
        editingTextFeature={editingTextFeature}
      />

      <IconPickerDialog
        isOpen={iconPickerOpen}
        onClose={handleIconPickerClose}
        onSelectIcon={handleIconSelect}
      />

      <MergePropertiesDialog
        isOpen={mergeDialogOpen}
        onClose={handleMergeDialogClose}
        onConfirm={handleMergeConfirm}
        feature1={pendingMerge?.feature1 || null}
        feature2={pendingMerge?.feature2 || null}
      />

      <OffsetDialog
        isOpen={offsetDialogOpen}
        onClose={handleOffsetDialogClose}
        onApply={handleOffsetApply}
        feature={pendingOffsetFeature}
      />

      <PdfExportDialog
        isOpen={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        onExport={handlePdfExport}
        isExporting={isExportingPdf}
        jobName={projects.find(p => p.id === currentProjectId)?.name}
      />

      <DragBoxInstruction isActive={isDragBoxActive} />

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
        onMultiSelectChange={handleMultiSelectChange}
      />

      <ToolManager
        map={mapRef.current}
        vectorSource={vectorSourceRef.current}
        activeTool={activeTool}
        selectedLegend={selectedLegend}
        selectedIconPath={selectedIconPath}
        lineColor={lineColor}
        lineWidth={lineWidth}
        onFeatureSelect={setSelectedFeature}
        onToolChange={setActiveTool}
      />

      <Toolbar
        onFileImport={handleImportClick}
        onToolActivate={handleToolActivation}
        activeTool={activeTool}
        selectedLegend={selectedLegend}
        onLegendSelect={handleLegendSelect}
        onExportClick={handleExportClick}
        onPdfExportClick={handlePdfExportClick}
        lineColor={lineColor}
        lineWidth={lineWidth}
        onLineColorChange={setLineColor}
        onLineWidthChange={setLineWidth}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={loadProject}
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

      {/* Shortcuts */}
      <HelpModal />
      <ToolCommand onToolSelect={handleToolActivation} activeTool={activeTool} />

      <MapViewToggle
        currentView={currentMapView}
        onViewChange={handleMapViewChange}
      />

      <SeparateFeatures
        vectorSource={vectorSourceRef.current}
        onSaveMapState={saveMapState}
      />
    </div>
  );
};

export default MapEditor;
