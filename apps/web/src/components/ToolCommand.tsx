import { useEffect, useState, useMemo } from "react";
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
import { getIconCategories, getIconFullPath } from "@/utils/iconUtils";

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edit: "Edit",
  draw: "Draw",
  symbols: "Symbols",
};

const CATEGORY_ORDER: ToolCategory[] = ["edit", "draw", "symbols"];

interface IconResult {
  name: string;
  path: string;
  category: string;
}

interface ToolCommandProps {
  onToolSelect: (toolId: string) => void;
  onIconSelect: (iconPath: string) => void;
  activeTool: string;
}

export function ToolCommand({ onToolSelect, onIconSelect, activeTool }: ToolCommandProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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

  // Filter icons based on search
  const filteredIcons = useMemo((): IconResult[] => {
    if (!searchValue.trim()) return [];
    const query = searchValue.toLowerCase().trim();
    const categories = getIconCategories();

    const results: IconResult[] = [];
    categories.forEach(category => {
      category.icons.forEach(icon => {
        const iconName = icon.replace('.png', '');
        if (iconName.toLowerCase().includes(query)) {
          results.push({
            name: iconName,
            path: getIconFullPath(category.path, icon),
            category: category.name,
          });
        }
      });
    });
    return results;
  }, [searchValue]);

  const handleSelect = (toolId: string) => {
    onToolSelect(toolId);
    setOpen(false);
    setSearchValue("");
  };

  const handleIconSelect = (iconPath: string) => {
    onIconSelect(iconPath);
    setOpen(false);
    setSearchValue("");
  };

  const getToolsByCategory = (category: ToolCategory) => {
    return TOOLS.filter((tool) => tool.category === category);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchValue("");
      }}
      title="Tool Palette"
      description="Search and select a tool or icon"
    >
      <CommandInput
        placeholder="Search tools or icons..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>No tools or icons found.</CommandEmpty>
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
                  {Icon ? (
                    <Icon className="mr-2 h-4 w-4" />
                  ) : tool.iconPath ? (
                    <img src={tool.iconPath} alt={tool.name} className="mr-2 h-4 w-4 object-contain" />
                  ) : null}
                  <span>{tool.name}</span>
                  {activeTool === tool.id && (
                    <CommandShortcut>Active</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        {/* Icons section */}
        {filteredIcons.length > 0 && (
          <CommandGroup heading="Icons">
            {filteredIcons.map((icon) => (
              <CommandItem
                key={icon.path}
                value={`icon-${icon.name}`}
                onSelect={() => handleIconSelect(icon.path)}
              >
                <img
                  src={icon.path}
                  alt={icon.name}
                  className="mr-2 h-4 w-4 object-contain"
                />
                <span>{icon.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
