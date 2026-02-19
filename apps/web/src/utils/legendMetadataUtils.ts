import type VectorSource from "ol/source/Vector";
import type Feature from "ol/Feature";
import { getLegendById } from "@/tools/legendsConfig";
import { getIconNameFromPath } from "@/utils/iconUtils";

export interface LegendMetadataItem {
  type: "legend" | "icon";
  id: string;
  label: string;
  /** Path to the visual asset – may be .svg or .png */
  imagePath: string;
  strokeColor?: string;
  strokeDash?: number[];
}

export interface LegendMetadata {
  items: LegendMetadataItem[];
}

/**
 * Scans all features on the vector source and returns deduplicated
 * metadata about which legend types and icon types are present.
 */
export function collectLegendMetadata(
  vectorSource: VectorSource,
): LegendMetadata {
  const seen = new Set<string>();
  const items: LegendMetadataItem[] = [];

  vectorSource.getFeatures().forEach((feature: Feature) => {
    // Legend features
    if (feature.get("islegends") && feature.get("legendType")) {
      const legendId = feature.get("legendType") as string;
      const key = `legend:${legendId}`;
      if (seen.has(key)) return;
      seen.add(key);

      const config = getLegendById(legendId);
      items.push({
        type: "legend",
        id: legendId,
        label: config?.name || legendId,
        imagePath: config?.imagePath || `/svgs/${legendId}.svg`,
        strokeColor: config?.style.strokeColor,
        strokeDash: config?.style.strokeDash,
      });
      return;
    }

    // Icon features (from icon picker)
    if (feature.get("isIcon") && feature.get("iconPath")) {
      const iconPath = feature.get("iconPath") as string;
      const iconName = getIconNameFromPath(iconPath);
      const key = `icon:${iconName}`;
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        type: "icon",
        id: iconName,
        label: iconName,
        imagePath: iconPath,
      });
    }
  });

  return { items };
}
