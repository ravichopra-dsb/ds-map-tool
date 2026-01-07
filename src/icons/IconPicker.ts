import { Feature } from "ol";
import { Point } from "ol/geom";
import { Icon, Style } from "ol/style";
import { Vector as VectorSource } from "ol/source";
import type { Geometry } from "ol/geom";
import { getIconNameFromPath } from "@/utils/iconUtils";

/**
 * Create and add a custom icon feature to the map
 * @param vectorSource - The vector source to add the feature to
 * @param coordinate - The coordinate where to place the icon
 * @param iconPath - The path to the icon image (relative to public folder)
 */
export function handleIconClick(
  vectorSource: VectorSource<Feature<Geometry>>,
  coordinate: number[],
  iconPath: string
): void {
  // Create a new point feature at the clicked coordinate
  const iconFeature = new Feature({
    geometry: new Point(coordinate),
  });

  // Set feature properties
  iconFeature.set("isIcon", true);
  iconFeature.set("iconPath", iconPath);
  iconFeature.set("name", getIconNameFromPath(iconPath));

  // Create and set the icon style
  const iconStyle = new Style({
    image: new Icon({
      src: iconPath,
      scale: 0.5, // Adjust scale as needed
      anchor: [0.5, 0.5],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
    }),
  });

  iconFeature.setStyle(iconStyle);

  // Add the feature to the vector source
  vectorSource.addFeature(iconFeature);
}
