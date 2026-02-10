import { Minus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAvailableLegends, type LegendType } from "@/tools/legendsConfig";

interface LegendDropdownProps {
  selectedLegend?: LegendType;
  activeTool?: string;
  onLegendSelect: (legend: LegendType) => void;
}

export function LegendDropdown({
  selectedLegend,
  activeTool,
  onLegendSelect,
}: LegendDropdownProps) {
  const legends = getAvailableLegends().filter(legend => legend.id !== 'measure');
  console.log("legends", legends);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          // className={`p-2 rounded-md transition-colors ${
          //   selectedLegend
          //     ? "focus:bg-zinc-200/60 hover:bg-[#e0dfff]"
          //     : "hover:bg-[#e0dfff]"
          // }`}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all cursor-pointer ${
                    activeTool === "legends"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
          title="Select Legend Type"
        >
          <Minus className="w-4 h-4" />
          <span className="text-xs font-medium">Line Types</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="p-1">
          {legends.map((legend) => (
            <DropdownMenuItem
              key={legend.id}
              onClick={() => onLegendSelect(legend)}
              className={`flex items-center gap-3 p-1 cursor-pointer ${
                selectedLegend?.id === legend.id
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50"
              }`}
            >
              <img
                src={legend.imagePath}
                alt={legend.name}
                title={legend.name}
                className="w-full h-8 object-cover rounded border border-gray-200"
                onError={(e) => {
                  // Fallback for broken images
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
