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
  linePattern?: "zigzag";
  zigzagConfig?: {
    amplitude: number;  // Peak height in pixels
    wavelength: number; // Full cycle length in pixels
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
    id: "Drain",
    name: "Drain",
    imagePath: "/Legends/Drain.png",
    style: {
      strokeColor: "#2626ff",
      strokeWidth: 1,
      strokeDash: [0, 0]
    }
  },
  {
    id: "Road",
    name: "Road",
    imagePath: "/Legends/Road.png",
    style: {
      strokeColor: "#262626",
      strokeWidth: 1,
      strokeDash: [0, 0]
    }
  },
  {
    id: "centerOfRoad",
    name: "Center of Road",
    imagePath: "/Legends/CenterOfRoad.png",
    style: {
      strokeColor: "#262626",
      strokeWidth: 1,
      strokeDash: [20, 5, 5, 5]
    }
  },
  {
    id: "otherExistOfcRoute",
    name: "Other Existing OFC Route",
    imagePath: "/Legends/OtherExistOfcRoute.png",
    style: {
      strokeColor: "#00ff00",
      strokeWidth: 4,
      strokeDash: [16, 5, 1, 5]
    }
  },
  {
    id: "airtelExistOfcRoute(Tx)",
    name: "Airtel Existing OFC Route (Tx)",
    imagePath: "/Legends/AirtelExistOfcRoute(Tx).png",
    style: {
      strokeColor: "#0000ff",
      strokeWidth: 4,
      strokeDash: [16, 5, 1, 5]
    }
  },
  {
    id: "sewerageLine",
    name: "Sewerage Line",
    imagePath: "/Legends/SewerageLine.png",
    text: "⬤",
    textStyle: {
      font: "12px Arial",
      fill: "#ffffff",
      stroke: "#0000ff",
      strokeWidth: 3,
      repeat: 30,
      offsetX: 0,
      offsetY: 0,
      scale: 0.45,
      maxAngle: Math.PI / 6
    },
    style: {
      strokeColor: "#0000ff",
      strokeWidth: 4,
    }
  },
  {
    id: "railwayMetroCrossing",
    name: "Railway Metro Crossing",
    imagePath: "/Legends/RailwayMetroCrossing.png",
    text: "|",
    textStyle: {
      font: "12px Arial",
      fill: "#ff0c0c",
      stroke: "#ff0c0c00",
      strokeWidth: 1,
      repeat: 20,
      offsetX: 0,
      offsetY: 0,
      scale: 2,
      maxAngle: Math.PI / 6
    },
    style: {
      strokeColor: "#ff0c0c",
      strokeWidth: 1,
    }
  },
  {
    id: "powerCabel",
    name: "Power Cabel",
    imagePath: "/Legends/PowerCabel.png",
    text: "|",
    textStyle: {
      font: "14px Arial",
      fill: "#ff0000",
      stroke: "#f0000000",
      strokeWidth: 0,
      repeat: 45,
      offsetX: 0,
      offsetY: 0,
      scale: 1.9,
      maxAngle: Math.PI / 6
    },
    linePattern: "zigzag",
    zigzagConfig: {
      amplitude: 8,
      wavelength: 24,
    },
    style: {
      strokeColor: "#ff0000",
      strokeWidth: 2,
    }
  },
  {
    id: "proposedOfcRoute",
    name: "Proposed OFC Route",
    imagePath: "/Legends/ProposedOfcRoute.png",
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
    id: "indianOilPipeLine",
    name: "Indian Oil Pipe Line",
    imagePath: "/Legends/IndianOilPipeLine.png",
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
    id: "waterPipeLine",
    name: "Water Pipe Line",
    imagePath: "/Legends/WaterPipeLine.png",
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
    id: "gasPipeLine",
    name: "Gas Pipe Line",
    imagePath: "/Legends/GasPipeLine.png",
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
      strokeColor: "#00ffff",
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

