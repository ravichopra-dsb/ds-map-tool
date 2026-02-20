import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Trash2, GripVertical, Pencil } from "lucide-react";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUp,
  Slash,
  Type,
  Minus,
  MapPin,
  Circle,
  Square,
  Spline,
  Cloud,
  RulerDimensionLine,
  MoveVertical,
  Ruler,
} from "lucide-react";

interface DraggableFeatureItemProps {
  feature: Feature<Geometry>;
  featureId: string;
  isHidden: boolean;
  depth: number;
  onToggleVisibility: (feature: Feature<Geometry>) => void;
  onDelete: (feature: Feature<Geometry>) => void;
  onDoubleClick?: (feature: Feature<Geometry>) => void;
}

// Icon color configuration based on feature type
function getFeatureIconColor(feature: Feature<Geometry>): string {
  if (feature.get("isArrow")) return "text-blue-500";
  if (feature.get("isDimension")) return "text-blue-500";
  if (feature.get("isAlignedDimension")) return "text-blue-500";
  if (feature.get("isMeasure")) return "text-gray-600";
  if (feature.get("isBox")) return "text-blue-500";
  if (feature.get("isCircle")) return "text-blue-500";
  if (feature.get("isArc")) return "text-blue-500";
  if (feature.get("isRevisionCloud")) return "text-orange-500";
  if (feature.get("isText")) return "text-gray-700";
  if (feature.get("islegends")) return "text-gray-700";
  return "text-muted-foreground";
}

// Get appropriate icon based on feature type
function getFeatureIcon(feature: Feature<Geometry>): LucideIcon {
  // Drawing tools
  if (feature.get("isArrow")) return ArrowUp;
  if (feature.get("isDimension")) return MoveVertical;
  if (feature.get("isAlignedDimension")) return Ruler;
  if (feature.get("isPolyline")) return Slash;
  if (feature.get("isFreehand")) return Pencil;
  if (feature.get("isText")) return Type;
  if (feature.get("isMeasure")) return RulerDimensionLine;
  if (feature.get("islegends")) return Minus;

  // Shape tools
  if (feature.get("isBox")) return Square;
  if (feature.get("isCircle")) return Circle;
  if (feature.get("isArc")) return Spline;
  if (feature.get("isRevisionCloud")) return Cloud;

  // Point/Icon features
  if (feature.get("isIcon")) return MapPin;
  if (feature.get("isPoint")) return MapPin;

  // Default based on geometry type
  const geomType = feature.getGeometry()?.getType();
  if (geomType === "Point") return MapPin;
  if (geomType === "LineString" || geomType === "MultiLineString") return Slash;
  if (geomType === "Polygon" || geomType === "MultiPolygon") return Square;
  return Circle;
}

// Get feature type name for display
function getFeatureTypeName(feature: Feature<Geometry>): string {
  if (feature.get("isArrow")) return "Arrow";
  if (feature.get("isDimension")) return "Dimension";
  if (feature.get("isAlignedDimension")) return "Aligned Dim";
  if (feature.get("isPolyline")) return "Polyline";
  if (feature.get("isFreehand")) return "Freehand";
  if (feature.get("isText")) return "Text";
  if (feature.get("isMeasure")) return "Measure";
  if (feature.get("islegends")) return "Legend";
  if (feature.get("isIcon")) return "Icon";
  if (feature.get("isBox")) return "Box";
  if (feature.get("isCircle")) return "Circle";
  if (feature.get("isArc")) return "Arc";
  if (feature.get("isRevisionCloud")) return "RevCloud";
  if (feature.get("isPoint")) return "Point";

  // Default based on geometry type
  const geomType = feature.getGeometry()?.getType();
  if (geomType === "Point") return "Point";
  if (geomType === "LineString") return "Line";
  if (geomType === "Polygon") return "Polygon";
  return "Feature";
}

// Get display name for feature
function getFeatureName(feature: Feature<Geometry>): string {
  // Text features show the actual text content
  if (feature.get("isText")) {
    const textContent = feature.get("text");
    return textContent.length > 30 ? textContent.substring(0, 30) + "..." : textContent;
  }

  const name = feature.get("name");
  if (name) return name;

  // Generate default name based on type and ID
  const typeName = getFeatureTypeName(feature);
  const uid = (feature as any).ol_uid;
  return `${typeName} ${uid}`;
}

export function DraggableFeatureItem({
  feature,
  featureId,
  isHidden,
  depth,
  onToggleVisibility,
  onDelete,
  onDoubleClick,
}: DraggableFeatureItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: featureId,
    data: {
      type: "feature",
      feature,
      featureId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getFeatureIcon(feature);
  const iconColor = getFeatureIconColor(feature);
  const name = getFeatureName(feature);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent group ${
        isHidden ? "opacity-50" : ""
      }`}
      onDoubleClick={() => onDoubleClick?.(feature)}
      {...attributes}
    >
      {/* Indent based on depth */}
      <div style={{ width: `${depth * 16}px` }} className="shrink-0" />

      {/* Drag handle */}
      <div
        {...listeners}
        className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="size-4 text-muted-foreground" />
      </div>

      {/* Feature icon with color */}
      <Icon className={`size-4 shrink-0 ${iconColor}`} />

      {/* Feature name */}
      <span className="flex-1 text-sm truncate" title={name}>
        {name}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(feature);
          }}
          title={isHidden ? "Show feature" : "Hide feature"}
        >
          {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(feature);
          }}
          title="Delete feature"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
