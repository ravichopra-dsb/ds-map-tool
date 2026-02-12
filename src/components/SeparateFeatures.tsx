import { useState, useEffect, useCallback } from "react";
import { createEmpty, extend, isEmpty } from "ol/extent";
import type { Map } from "ol";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHiddenFeaturesStore } from "@/stores/useHiddenFeaturesStore";
import { useFolderStore } from "@/stores/useFolderStore";
import { usePanelStore } from "@/stores/usePanelStore";
import { Vector as VectorSource } from "ol/source";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import { Plus, Folder, Home, Settings2 } from "lucide-react";
import { FolderItem } from "./FolderItem";
import { DraggableFeatureItem } from "./DraggableFeatureItem";
import { Input } from "./ui/input";

interface SeparateFeaturesProps {
  vectorSource: VectorSource<Feature<Geometry>>;
  onSaveMapState: () => void;
  map: Map | null;
}

// Get unique ID for feature
function getFeatureId(feature: Feature<Geometry>): string {
  return String((feature as any).ol_uid);
}

// Root drop zone component
function RootDropZone({
  isActive,
  isOver,
}: {
  isActive: boolean;
  isOver: boolean;
}) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: "root-drop-zone",
    data: { type: "root" },
  });

  const showZone = isActive;
  const highlighted = isOver || isDroppableOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
        showZone
          ? highlighted
            ? "bg-primary/20 border-2 border-dashed border-primary"
            : "bg-muted/50 border-2 border-dashed border-muted-foreground/30"
          : "h-0 overflow-hidden opacity-0"
      }`}
    >
      {showZone && (
        <>
          <Home className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drop here to move to root level
          </span>
        </>
      )}
    </div>
  );
}

export function SeparateFeatures({
  vectorSource,
  onSaveMapState,
  map,
}: SeparateFeaturesProps) {
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  const [isOverRoot, setIsOverRoot] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { hiddenFeatureIds, toggleFeature, removeFeatureId } =
    useHiddenFeaturesStore();
  const {
    folders,
    createFolder,
    deleteFolder,
    getRootFolders,
    getChildFolders,
    isDescendantOf,
    activeFolderId,
    setActiveFolder,
    getAllDescendantFolderIds,
  } = useFolderStore();

  const { activePanel, openFeatures, closePanel, toggleToLayers } =
    usePanelStore();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Update features list from vector source
  const updateFeatures = useCallback(() => {
    const allFeatures = vectorSource.getFeatures();
    setFeatures([...allFeatures]);
  }, [vectorSource]);

  // Listen to vector source changes
  useEffect(() => {
    updateFeatures();

    const onAddFeature = () => updateFeatures();
    const onRemoveFeature = () => updateFeatures();
    const onClear = () => {
      setFeatures([]);
    };

    vectorSource.on("addfeature", onAddFeature);
    vectorSource.on("removefeature", onRemoveFeature);
    vectorSource.on("clear", onClear);

    return () => {
      vectorSource.un("addfeature", onAddFeature);
      vectorSource.un("removefeature", onRemoveFeature);
      vectorSource.un("clear", onClear);
    };
  }, [vectorSource, updateFeatures]);

  // Handle visibility toggle
  const handleToggleVisibility = (feature: Feature<Geometry>) => {
    const featureId = getFeatureId(feature);
    toggleFeature(featureId);
  };

  // Handle feature delete
  const handleDelete = (feature: Feature<Geometry>) => {
    const featureId = getFeatureId(feature);
    removeFeatureId(featureId);
    vectorSource.removeFeature(feature);
    onSaveMapState();
  };

  // Handle folder delete with all features inside
  const handleDeleteFolder = (folderId: string, featureIds: string[]) => {
    // Delete all features in this folder and its descendants
    featureIds.forEach((featureId) => {
      removeFeatureId(featureId);
      const feature = features.find((f) => getFeatureId(f) === featureId);
      if (feature) {
        vectorSource.removeFeature(feature);
      }
    });

    // Delete the folder and its descendants
    deleteFolder(folderId);

    onSaveMapState();
  };

  // Create new folder
  // Replace the handleCreateFolder function:
  const handleCreateFolder = () => {
    setIsCreatingFolder(true);
  };

  // Add new handler for input:
  const handleFolderInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      onSaveMapState();
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleFolderInputCancel = () => {
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  // Get features by folder ID
  const getFeaturesByFolder = (folderId: string | null) => {
    return features.filter((f) => {
      const featureFolderId = f.get("folderId");
      if (folderId === null) {
        return !featureFolderId;
      }
      return featureFolderId === folderId;
    });
  };

  // Zoom to a single feature
  const handleZoomToFeature = useCallback(
    (feature: Feature<Geometry>) => {
      if (!map) return;
      const geometry = feature.getGeometry();
      if (!geometry) return;

      const extent = geometry.getExtent();
      map.getView().fit(extent, {
        duration: 1000,
        padding: [50, 50, 50, 50],
        maxZoom: 18,
      });
    },
    [map],
  );

  // Zoom to all features in a folder (including descendants)
  const handleZoomToFolder = useCallback(
    (folderId: string) => {
      if (!map) return;

      // Get all features in this folder and its descendants
      const descendantFolderIds = getAllDescendantFolderIds(folderId);
      const allFolderIds = [folderId, ...descendantFolderIds];

      const folderFeatures = features.filter((f) => {
        const featureFolderId = f.get("folderId");
        return featureFolderId && allFolderIds.includes(featureFolderId);
      });

      if (folderFeatures.length === 0) return;

      // Calculate combined extent
      const extent = createEmpty();
      folderFeatures.forEach((f) => {
        const geom = f.getGeometry();
        if (geom) extend(extent, geom.getExtent());
      });

      if (!isEmpty(extent)) {
        map.getView().fit(extent, {
          duration: 1000,
          padding: [50, 50, 50, 50],
          maxZoom: 18,
        });
      }
    },
    [map, features, getAllDescendantFolderIds],
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overData = over.data.current;
      if (over.id === "root-drop-zone" || overData?.type === "root") {
        setOverFolderId(null);
        setIsOverRoot(true);
      } else if (overData?.type === "folder") {
        setOverFolderId(over.id as string);
        setIsOverRoot(false);
      } else {
        setOverFolderId(null);
        setIsOverRoot(false);
      }
    } else {
      setOverFolderId(null);
      setIsOverRoot(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverFolderId(null);
    setIsOverRoot(false);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Determine target folder
    let targetFolderId: string | null = null;

    if (over.id === "root-drop-zone" || overData?.type === "root") {
      targetFolderId = null;
    } else if (overData?.type === "folder") {
      targetFolderId = over.id as string;
    } else if (overData?.type === "feature") {
      // Dropped on a feature - use its folder
      targetFolderId = overData.feature?.get("folderId") || null;
    }

    if (activeData?.type === "folder") {
      // Moving a folder
      const activeFolderId = active.id as string;

      // Prevent moving folder into itself or its descendants
      if (targetFolderId && isDescendantOf(targetFolderId, activeFolderId)) {
        return;
      }
      if (activeFolderId === targetFolderId) {
        return;
      }

      useFolderStore.getState().moveFolder(activeFolderId, targetFolderId);
      onSaveMapState();
    } else if (activeData?.type === "feature") {
      // Moving a feature
      const feature = activeData.feature as Feature<Geometry>;
      const currentFolderId = feature.get("folderId") || null;

      if (currentFolderId !== targetFolderId) {
        if (targetFolderId) {
          feature.set("folderId", targetFolderId);
        } else {
          feature.unset("folderId");
        }
        updateFeatures();
        onSaveMapState();
      }
    }
  };

  // Render folder tree recursively
  const renderFolderTree = (parentId: string | null, depth: number) => {
    const childFolders = getChildFolders(parentId);
    const folderFeatures = parentId ? getFeaturesByFolder(parentId) : [];

    return (
      <>
        {/* Render features in this folder */}
        {folderFeatures.map((feature) => {
          const featureId = getFeatureId(feature);
          const isHidden = hiddenFeatureIds.has(featureId);

          return (
            <DraggableFeatureItem
              key={featureId}
              feature={feature}
              featureId={featureId}
              isHidden={isHidden}
              depth={depth + 1}
              onToggleVisibility={handleToggleVisibility}
              onDelete={handleDelete}
              onDoubleClick={handleZoomToFeature}
            />
          );
        })}

        {/* Render child folders */}
        {childFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            features={getFeaturesByFolder(folder.id)}
            allFeatures={features}
            depth={depth}
            isOverTarget={overFolderId === folder.id}
            isActive={activeFolderId === folder.id}
            map={map}
            onDeleteFolder={handleDeleteFolder}
            onSaveMapState={onSaveMapState}
            onSelect={setActiveFolder}
            onDoubleClick={handleZoomToFolder}
          >
            {renderFolderTree(folder.id, depth + 1)}
          </FolderItem>
        ))}
      </>
    );
  };

  // Get all sortable IDs for DnD
  const getAllSortableIds = () => {
    const ids: string[] = ["root-drop-zone"];

    // Add folder IDs
    Object.keys(folders).forEach((folderId) => ids.push(folderId));

    // Add feature IDs
    features.forEach((f) => ids.push(getFeatureId(f)));

    return ids;
  };

  const rootFolders = getRootFolders();
  const rootFeatures = getFeaturesByFolder(null);

  // Get the active item for drag overlay
  const getActiveItem = () => {
    if (!activeId) return null;

    // Check if it's a folder
    if (folders[activeId]) {
      return { type: "folder", data: folders[activeId] };
    }

    // Check if it's a feature
    const feature = features.find((f) => getFeatureId(f) === activeId);
    if (feature) {
      return { type: "feature", data: feature };
    }

    return null;
  };

  const activeItem = getActiveItem();

  return (
    <Sheet
      open={activePanel === "features"}
      onOpenChange={(open) => (open ? openFeatures() : closePanel())}
    >
      <SheetTrigger asChild className="absolute left-2 bottom-2">
        <Button variant="outline" className="gap-2">
          Features
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 gap-0">
        <SheetHeader>
          <div className="flex items-center justify-between -mt-2.5">
            <SheetTitle className="flex items-center gap-2">
              Features ({features.length})
            </SheetTitle>
            <div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateFolder}
                title="Create new folder"
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Switch to Layers"
                className="mr-5"
                onClick={toggleToLayers}
              >
                <Settings2 className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {isCreatingFolder && (
          <div className="p-4 pt-0 border-b">
            <form onSubmit={handleFolderInputSubmit} className="space-y-2">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                autoFocus
                className="w-full"
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={!newFolderName.trim()}
                >
                  Create
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFolderInputCancel}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={getAllSortableIds()}
            strategy={verticalListSortingStrategy}
          >
            <div
              className="space-y-1 h-screen overflow-y-auto p-2 pt-0 pb-10"
              onClick={(e) => {
                // Clear active folder when clicking empty space
                if (e.target === e.currentTarget) {
                  setActiveFolder(null);
                }
              }}
            >
              {features.length === 0 && Object.keys(folders).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No features yet. Draw or import features to see them here.
                </div>
              ) : (
                <>
                  {/* Root drop zone - always visible when dragging */}
                  <RootDropZone isActive={!!activeId} isOver={isOverRoot} />

                  {/* Root level folders */}
                  {rootFolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      features={getFeaturesByFolder(folder.id)}
                      allFeatures={features}
                      depth={0}
                      isOverTarget={overFolderId === folder.id}
                      isActive={activeFolderId === folder.id}
                      map={map}
                      onDeleteFolder={handleDeleteFolder}
                      onSaveMapState={onSaveMapState}
                      onSelect={setActiveFolder}
                      onDoubleClick={handleZoomToFolder}
                    >
                      {renderFolderTree(folder.id, 1)}
                    </FolderItem>
                  ))}

                  {/* Root level features (not in any folder) */}
                  {rootFeatures.map((feature) => {
                    const featureId = getFeatureId(feature);
                    const isHidden = hiddenFeatureIds.has(featureId);

                    return (
                      <DraggableFeatureItem
                        key={featureId}
                        feature={feature}
                        featureId={featureId}
                        isHidden={isHidden}
                        depth={0}
                        onToggleVisibility={handleToggleVisibility}
                        onDelete={handleDelete}
                        onDoubleClick={handleZoomToFeature}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem && (
              <div className="bg-background border rounded-md px-3 py-2 shadow-lg opacity-90">
                {activeItem.type === "folder" ? (
                  <div className="flex items-center gap-2">
                    <Folder className="size-4 text-amber-500" />
                    <span className="text-sm">
                      {(activeItem.data as { name: string }).name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {(activeItem.data as Feature<Geometry>).get("name") ||
                        "Feature"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </SheetContent>
    </Sheet>
  );
}
