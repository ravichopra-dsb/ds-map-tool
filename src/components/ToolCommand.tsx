import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { TOOLS, type ToolCategory } from "@/tools/toolConfig";

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edit: "Edit",
  draw: "Draw",
  symbols: "Symbols",
};

const CATEGORY_ORDER: ToolCategory[] = ["edit", "draw", "symbols"];

interface ToolCommandProps {
  onToolSelect: (toolId: string) => void;
  activeTool: string;
}

export function ToolCommand({ onToolSelect, activeTool }: ToolCommandProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (toolId: string) => {
    onToolSelect(toolId);
    setOpen(false);
  };

  const getToolsByCategory = (category: ToolCategory) => {
    return TOOLS.filter((tool) => tool.category === category);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Tool Palette"
      description="Search and select a tool"
    >
      <CommandInput placeholder="Search tools..." />
      <CommandList>
        <CommandEmpty>No tools found.</CommandEmpty>
        {CATEGORY_ORDER.map((category) => (
          <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
            {getToolsByCategory(category).map((tool) => {
              const Icon = tool.icon;
              return (
                <CommandItem
                  key={tool.id}
                  value={tool.name}
                  onSelect={() => handleSelect(tool.id)}
                  className={activeTool === tool.id ? "bg-accent" : ""}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{tool.name}</span>
                  {activeTool === tool.id && (
                    <CommandShortcut>Active</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
