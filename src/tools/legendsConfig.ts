export interface LegendType {
  id: string;
  name: string;
  imagePath: string;
  text?: string;
  textStyle?: {
    font?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    repeat?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
    maxAngle?: number;
  };
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
    id: "measure",
    name: "Measure",
    imagePath: "/Legends/legend1.png",
    style: {
      strokeColor: "#3b4352",
      strokeWidth: 2,
      strokeDash: [12, 8]
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
    text: "OIL",
    textStyle: {
      font: "bold 10px Arial",
      fill: "#000000",
      stroke: "#ffffff",
      strokeWidth: 4,
      repeat: 84, // Dash cycle length (16+20) for optimal alignment
      offsetX: 0,
      offsetY: 0,
      scale: 1.1,
      maxAngle: Math.PI / 6
    },
    style: {
      strokeColor: "#ff0e0e",
      strokeWidth: 4,
      strokeDash: [16, 12],
    }
  },
  {
    id: "legend12",
    name: "Legend 12",
    imagePath: "/Legends/legend12.png",
    text: "HW",
    textStyle: {
      font: "bold 8.5px Arial",
      fill: "#000000",
      stroke: "#ffffff",
      strokeWidth: 4,
      repeat: 84,
      offsetX: 14,
      offsetY: 0,
      scale: 1.1,
      maxAngle: Math.PI / 6
    },
    style: {
      strokeColor: "#ffbf00",
      strokeWidth: 4,
      strokeDash: [16, 12],
    }
  },
  {
    id: "legend13",
    name: "Legend 13",
    imagePath: "/Legends/legend13.png",
    text: "GAS",
    textStyle: {
      font: "bold 8.5px Arial",
      fill: "#000000",
      stroke: "#ffffff",
      strokeWidth: 4,
      repeat: 84,
      offsetX: 14,
      offsetY: 0,
      scale: 1.1,
      maxAngle: Math.PI / 6
    },
    style: {
      strokeColor: "#0ff",
      strokeWidth: 4,
      strokeDash: [16, 12],
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

