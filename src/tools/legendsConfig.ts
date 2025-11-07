export interface LegendType {
  id: string;
  name: string;
  imagePath: string;
  style: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeDash?: number[];
    fillColor?: string;
    opacity?: number;
  };
}

// Available legend types with their specific styling
export const LEGEND_TYPES: LegendType[] = [
  {
    id: "legend1",
    name: "Legend 1",
    imagePath: "/Legends/legend1.png",
    style: {
      strokeColor: "#FF00FF",
      strokeWidth: 4,
      strokeDash: [16, 12]
    }
  },
  {
    id: "legend2",
    name: "Legend 2",
    imagePath: "/Legends/legend2.png",
    style: {
      strokeColor: "#ff0e0e",
      strokeWidth: 4,
      strokeDash: [16, 12],
    }
  },
  {
    id: "legend11",
    name: "Legend 11",
    imagePath: "/Legends/legend11.png",
    style: {
      strokeColor: "#00FF00",
      strokeWidth: 4,
      strokeDash: [16, 12],
    }
  },
  {
    id: "legend12",
    name: "Legend 12",
    imagePath: "/Legends/legend12.png",
    style: {
      strokeColor: "#0066CC",
      strokeWidth: 4,
      strokeDash: [12, 8],
      opacity: 1.0
    }
  },
  {
    id: "legend13",
    name: "Legend 13",
    imagePath: "/Legends/legend13.png",
    style: {
      strokeColor: "#FF6600",
      strokeWidth: 2,
      strokeDash: [6, 6],
      opacity: 0.7
    }
  }
];

// Function to get all available legends
export function getAvailableLegends(): LegendType[] {
  return LEGEND_TYPES;
}

// Function to get legend by ID
export function getLegendById(id: string): LegendType | undefined {
  return LEGEND_TYPES.find(legend => legend.id === id);
}

