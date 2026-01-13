// Utility functions for managing Google Earth icons

export interface IconCategory {
  name: string;
  path: string;
  icons: string[];
}

// Function to get all icon paths organized by category
export function getIconCategories(): IconCategory[] {
  // These paths are relative to the public folder
  const categories: IconCategory[] = [
    {
      name: "Landmarks",
      path: "google_earth_icons/landmark-symbols",
      icons: ["AIRPORT.png",
        "Bank.png",
        "BRIDGE.png",
        "BT.png",
        "Bus Stop.png",
        "CC.png",
        "chamber.png",
        "CHECK POST.png",
        "COLLAGE.png",
        "EP POLE.png",
        "EXISTING CHAMBER.png",
        "Farm.png",
        "FIRE STATION.png",
        "Forest.png",
        "GL.png",
        "GP.png",
        "GURUDWARA.png",
        "Hospital.png",
        "Hotel.png",
        "INDUSTERY.png",
        "Mall.png",
        "MileStone.png",
        "OFFICE.png",
        "Own Pole.png",
        "PETROL PUMP.png",
        "POLICE STATION.png",
        "Post Office.png",
        "PROPSED CHAMBER.png",
        "Railway.png",
        "School.png",
        "Street Lite.png",
        "Temple.png",
        "TILE.png",
        "TOWER.png",
        "Transfarm.png",
        "Tree.png",
        "WATER TANK.png",
        "WBM.png"]
    }
  ];

  return categories;
}

// Get full path for an icon
export function getIconFullPath(categoryPath: string, iconName: string): string {
  return `/${categoryPath}/${iconName}`;
}

/**
 * Extract icon name from icon path for feature naming
 * @param iconPath - Full icon path (e.g., "/google_earth_icons/shapes/airports.png")
 * @returns Clean icon name (e.g., "airports")
 */
export function getIconNameFromPath(iconPath: string): string {
  return iconPath.split('/').pop()?.replace('.png', '') || "Icon";
}
