import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TOOLS } from "@/tools/toolConfig";
import { CircleQuestionMark } from "lucide-react";
import { useState } from "react";
import { getIconCategories } from "@/utils/iconUtils";

console.log("getIconCategories", getIconCategories());

const shortcuts = [
  { title: "Copy", value: "ctrl c", symbol: "+" },
  { title: "Cut", value: "ctrl x", symbol: "+" },
  { title: "Paste", value: "ctrl v", symbol: "+" },
  { title: "Undo", value: "ctrl z", symbol: "+" },
  { title: "Redo", value: "ctrl y", symbol: "+" },
  { title: "Ortho Mode", value: "F8", symbol: null },
  { title: "Cancel", value: "Escape", symbol: null },
  { title: "Pan Map", value: "Arrow Keys", symbol: null },
  { title: "Multi-select (drag)", value: "ctrl Right-Click", symbol: "+" },
  { title: "Multi-select (click)", value: "shift Click", symbol: "+" },
  { title: "Delete", value: "backspace delete", symbol: "or" },
];

const toolCategories = [
  { id: "draw", label: "Draw" },
  { id: "symbols", label: "Symbols" },
  { id: "edit", label: "Edit" },
];

export function HelpModal() {
  const [activeTab, setActiveTab] = useState("draw");

  const getToolsByCategory = (category: string) => {
    return TOOLS.filter((tool) => tool.category === category);
  };

  console.log(getToolsByCategory(activeTab));

  return (
    <div className="absolute left-26 bottom-2">
      <Dialog>
        <form>
          <DialogTrigger asChild>
            <Button variant="outline" className="cursor-pointer">
              <CircleQuestionMark />
            </Button>
          </DialogTrigger>
          <DialogContent className="md:max-w-2xl lg:max-w-[900px] h-[91%] md:h-[550px] overflow-auto ">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Keyboard shortcuts and Tools
              </DialogTitle>
              <hr className="border-t border-zinc-200 mt-4" />
            </DialogHeader>
            <div className="w-full">
              <div className="w-full flex flex-col md:flex-row gap-10">
                {/* Tools Section */}
                <div id="tools" className="w-full md:w-1/2">
                  <h3 className="text-lg font-medium mb-3">Tools</h3>

                  {/* Tab Buttons */}
                  <div className="flex gap-2 mb-3">
                    {toolCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveTab(category.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          activeTab === category.id
                            ? "bg-[#e0dfff] text-zinc-900"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>

                  {/* Tools List */}
                  <ul className="border border-zinc-300 rounded-md divide-y divide-zinc-200">
                    {getToolsByCategory(activeTab).map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <li
                          key={tool.id}
                          className="py-2 px-4 flex justify-between items-center text-zinc-800"
                        >
                          {tool.name}
                          <span>
                            <Icon className="w-4 h-4" />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Shortcuts Section */}
                <div id="shortcuts" className="w-full md:w-1/2 ">
                  <h3 className="text-lg font-medium mb-3">Shortcuts</h3>
                  <ul className="border border-zinc-300 rounded-md divide-y divide-zinc-200">
                    {shortcuts.map((shortcut) => (
                      <li
                        key={shortcut.title}
                        className="py-2 px-4 flex justify-between items-center"
                      >
                        <span className="text-zinc-800">{shortcut.title}</span>{" "}
                        <span className="flex gap-2 text-zinc-600">
                          <span className="bg-[#e0dfff] px-2 py-0.5 rounded-sm">
                            {shortcut.value.split(" ")[0]}
                          </span>
                          {shortcut.symbol && <span>{shortcut.symbol}</span>}
                          {shortcut.value.split(" ")[1] && (
                            <span className="bg-[#e0dfff] px-2 py-0.5 rounded-sm">
                              {shortcut.value.split(" ")[1]}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </DialogContent>
        </form>
      </Dialog>
    </div>
  );
}
