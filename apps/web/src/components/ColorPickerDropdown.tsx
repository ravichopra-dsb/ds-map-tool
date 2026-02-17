import React, { useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Preset colors matching the user's reference image
export const PRESET_COLORS = [
  { name: "Green", color: "#00ff00" },
  { name: "Red", color: "#ff0000" },
  { name: "Yellow", color: "#ffff00" },
  { name: "Cyan", color: "#00ffff" },
  { name: "Blue", color: "#0000ff" },
  { name: "Magenta", color: "#ff00ff" },
  { name: "White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
] as const;

// Preset widths
export const PRESET_WIDTHS = [2, 3, 4, 5, 6, 8, 10] as const;

interface ColorPickerDropdownProps {
  selectedColor: string;
  selectedWidth: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
}

export const ColorPickerDropdown: React.FC<ColorPickerDropdownProps> = ({
  selectedColor,
  selectedWidth,
  onColorChange,
  onWidthChange,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(e.target.value);
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer min-w-[80px]"
          title="Line Style"
        >
          {/* Color swatch */}
          <div
            className="w-5 h-5 rounded border border-gray-400"
            style={{ backgroundColor: selectedColor }}
          />
          {/* Width indicator */}
          <div className="flex items-center gap-1">
            <div
              className="rounded-full bg-gray-700"
              style={{
                width: `${Math.min(selectedWidth * 2, 16)}px`,
                height: `${Math.min(selectedWidth * 2, 16)}px`,
              }}
            />
            <span className="text-xs text-gray-600">{selectedWidth}px</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="start">
        {/* Color Selection */}
        <DropdownMenuLabel className="text-xs text-gray-500">Color</DropdownMenuLabel>
        <DropdownMenuGroup className="px-2 py-1">
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => onColorChange(preset.color)}
                className={`w-8 h-8 rounded border-2 cursor-pointer transition-all hover:scale-110 ${
                  selectedColor.toLowerCase() === preset.color.toLowerCase()
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-300"
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              />
            ))}
          </div>
          {/* Custom color option */}
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={colorInputRef}
              type="color"
              value={selectedColor}
              onChange={handleCustomColorChange}
              className="w-8 h-8 rounded cursor-pointer border border-gray-300"
              title="Custom Color"
            />
            <span className="text-xs text-gray-600">Custom</span>
            <span className="text-xs text-gray-400 ml-auto uppercase">
              {selectedColor}
            </span>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Width Selection */}
        <DropdownMenuLabel className="text-xs text-gray-500">Width</DropdownMenuLabel>
        <DropdownMenuGroup className="px-2 py-1">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_WIDTHS.map((width) => (
              <button
                key={width}
                onClick={() => onWidthChange(width)}
                className={`flex items-center justify-center w-9 h-8 rounded border cursor-pointer transition-all hover:bg-gray-100 ${
                  selectedWidth === width
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
                title={`${width}px`}
              >
                <div
                  className="rounded-full bg-gray-700"
                  style={{
                    width: `${Math.min(width * 1.5, 12)}px`,
                    height: `${Math.min(width * 1.5, 12)}px`,
                  }}
                />
              </button>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ColorPickerDropdown;
