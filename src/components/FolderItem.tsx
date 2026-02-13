import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  EllipsisVertical,
  Pencil,
  NotepadText,
} from "lucide-react";
import type { Folder as FolderType } from "@/types/folders";
import { useFolderStore } from "@/stores/useFolderStore";
import { useHiddenFeaturesStore } from "@/stores/useHiddenFeaturesStore";
import { FolderPropertiesDialog } from "./FolderPropertiesDialog";
import type Map from "ol/Map";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

interface FolderItemProps {
  folder: FolderType;
  features: Feature<Geometry>[];
  allFeatures: Feature<Geometry>[];
  depth: number;
  isOverTarget?: boolean;
  isActive?: boolean;
  map: Map | null;
  onDeleteFolder: (folderId: string, featureIds: string[]) => void;
  onSaveMapState?: () => void;
  onSelect?: (folderId: string | null) => void;
  onDoubleClick?: (folderId: string) => void;
  children?: React.ReactNode;
}

// Get unique ID for feature
function getFeatureId(feature: Feature<Geometry>): string {
  return String((feature as any).ol_uid);
}

export function FolderItem({
  folder,
  features,
  allFeatures,
  depth,
  isOverTarget,
  isActive,
  map,
  onDeleteFolder,
  onSaveMapState,
  onSelect,
  onDoubleClick,
  children,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [isFolderPropertiesOpen, setIsFolderPropertiesOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toggleFolderExpanded, getAllDescendantFolderIds, renameFolder } =
    useFolderStore();
  const { hiddenFeatureIds, hideFeature, showFeature } =
    useHiddenFeaturesStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: {
      type: "folder",
      folder,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Get all feature IDs in this folder and its descendants
  const getAllFeatureIdsInFolder = (): string[] => {
    const featureIds: string[] = [];

    // Features directly in this folder
    features.forEach((f) => featureIds.push(getFeatureId(f)));

    // Features in descendant folders
    const descendantFolderIds = getAllDescendantFolderIds(folder.id);
    allFeatures.forEach((f) => {
      const fFolderId = f.get("folderId");
      if (fFolderId && descendantFolderIds.includes(fFolderId)) {
        featureIds.push(getFeatureId(f));
      }
    });

    return featureIds;
  };

  // Get all actual Feature objects in this folder and its descendants
  const getAllFeaturesInFolder = (): Feature<Geometry>[] => {
    const descendantFolderIds = getAllDescendantFolderIds(folder.id);
    const folderIds = new Set([folder.id, ...descendantFolderIds]);
    return allFeatures.filter((f) => {
      const fFolderId = f.get("folderId");
      return fFolderId && folderIds.has(fFolderId);
    });
  };

  // Check if all features in folder are hidden
  const allFeatureIds = getAllFeatureIdsInFolder();
  const allHidden =
    allFeatureIds.length > 0 &&
    allFeatureIds.every((id) => hiddenFeatureIds.has(id));
  const someHidden = allFeatureIds.some((id) => hiddenFeatureIds.has(id));

  // Toggle visibility of all features in folder
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const featureIds = getAllFeatureIdsInFolder();

    if (allHidden) {
      // Show all
      featureIds.forEach((id) => showFeature(id));
    } else {
      // Hide all
      featureIds.forEach((id) => hideFeature(id));
    }
  };

  // Delete folder and all features inside
  const handleDelete = () => {
    const featureIds = getAllFeatureIdsInFolder();
    onDeleteFolder(folder.id, featureIds);
  };

  // Start editing folder name
  const handleStartRename = () => {
    setEditName(folder.name);
    setIsEditing(true);
  };

  // Save folder name
  const handleSaveRename = () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      renameFolder(folder.id, editName.trim());
      onSaveMapState?.();
    }
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancelRename = () => {
    setEditName(folder.name);
    setIsEditing(false);
  };

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  // Count total features including nested folders
  const totalFeatureCount = allFeatureIds.length;

  // Handle folder selection (click on row, not chevron)
  const handleSelectFolder = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    // Read fresh state from store to avoid stale prop issues during rapid clicks
    const currentActiveFolderId = useFolderStore.getState().activeFolderId;
    const isFolderActive = currentActiveFolderId === folder.id;
    // Toggle selection - if already active, deselect
    onSelect?.(isFolderActive ? null : folder.id);
  };

  // Handle chevron click for expand/collapse
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderExpanded(folder.id);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-accent group cursor-pointer transition-all duration-200 ${
          someHidden && !allHidden
            ? "opacity-75"
            : allHidden
              ? "opacity-50"
              : ""
        } ${isOverTarget ? "bg-primary/20 ring-2 ring-primary ring-inset" : ""} ${
          isActive ? "bg-primary/10 border-l-3 border-l-primary" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelectFolder}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick?.(folder.id);
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </div>

        {/* Expand/collapse chevron */}
        <div
          className="shrink-0 hover:bg-accent rounded p-0.5 -m-0.5"
          onClick={handleChevronClick}
        >
          {folder.isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>

        {/* Folder icon */}
        {folder.isExpanded ? (
          <FolderOpen className="size-4 shrink-0 text-amber-500" />
        ) : (
          <Folder className="size-4 shrink-0 text-amber-500" />
        )}

        {/* Folder name - editable or display */}
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveRename}
            onClick={(e) => e.stopPropagation()}
            className="h-6 py-0 px-1 text-sm flex-1"
          />
        ) : (
          <>
            <span className="flex-1 text-sm truncate" title={folder.name}>
              {folder.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({totalFeatureCount})
            </span>
          </>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleToggleVisibility}
              title={allHidden ? "Show all features" : "Hide all features"}
            >
              {allHidden ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>

            {/* More options dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename();
                  }}
                >
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFolderPropertiesOpen(true);
                  }}
                >
                  <NotepadText className="size-4" />
                  Properties
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Render children (nested folders and features) when expanded */}
      {folder.isExpanded && children}

      {/* Folder properties dialog */}
      <FolderPropertiesDialog
        isOpen={isFolderPropertiesOpen}
        onClose={() => setIsFolderPropertiesOpen(false)}
        folderName={folder.name}
        features={getAllFeaturesInFolder()}
        map={map}
        onSaveMapState={onSaveMapState}
      />
    </div>
  );
}
