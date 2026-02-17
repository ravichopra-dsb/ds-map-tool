import { useState, useRef, useEffect, useMemo } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
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

interface CommandBarProps {
  onToolSelect: (toolId: string) => void;
  onIconSelect: (iconPath: string) => void;
  activeTool: string;
}

export function CommandBar({ onToolSelect, onIconSelect, activeTool }: CommandBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter tools based on input
  const filteredTools = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase().trim();
    return TOOLS.filter((tool) =>
      tool.name.toLowerCase().includes(query) ||
      tool.id.toLowerCase().includes(query)
    );
  }, [inputValue]);

  // Group filtered tools by category
  const groupedTools = useMemo(() => {
    const groups: Record<ToolCategory, typeof TOOLS> = {
      edit: [],
      draw: [],
      symbols: [],
    };
    filteredTools.forEach((tool) => {
      groups[tool.category].push(tool);
    });
    return groups;
  }, [filteredTools]);

  // Filter icons based on input
  const filteredIcons = useMemo((): IconResult[] => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase().trim();
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
  }, [inputValue]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (toolId: string) => {
    onToolSelect(toolId);
    setInputValue("");
    setIsOpen(false);
  };

  const handleIconSelect = (iconPath: string) => {
    onIconSelect(iconPath);
    setInputValue("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === "Enter") {
      if (filteredTools.length > 0) {
        handleSelect(filteredTools[0].id);
      } else if (filteredIcons.length > 0) {
        handleIconSelect(filteredIcons[0].path);
      }
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setIsOpen(value.trim().length > 0);
  };

  const handleFocus = () => {
    if (inputValue.trim().length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-20 w-80"
    >
      <CommandPrimitive
        shouldFilter={false}
        className="relative"
      >
        {/* Dropdown (positioned above input) */}
        {isOpen && (filteredTools.length > 0 || filteredIcons.length > 0) && (
          <div className="absolute bottom-full mb-1 w-full bg-popover text-popover-foreground border rounded-md shadow-lg overflow-hidden">
            <CommandPrimitive.List className="max-h-[300px] overflow-y-auto p-1">
              {CATEGORY_ORDER.map((category) => {
                const tools = groupedTools[category];
                if (tools.length === 0) return null;
                return (
                  <CommandPrimitive.Group
                    key={category}
                    heading={CATEGORY_LABELS[category]}
                    className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                  >
                    {tools.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = activeTool === tool.id;
                      return (
                        <CommandPrimitive.Item
                          key={tool.id}
                          value={tool.name}
                          onSelect={() => handleSelect(tool.id)}
                          className={cn(
                            "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
                            "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-accent/50"
                          )}
                        >
                          {Icon ? (
                            <Icon className="h-4 w-4" />
                          ) : tool.iconPath ? (
                            <img src={tool.iconPath} alt={tool.name} className="h-4 w-4 object-contain" />
                          ) : null}
                          <span>{tool.name}</span>
                          {isActive && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              Active
                            </span>
                          )}
                        </CommandPrimitive.Item>
                      );
                    })}
                  </CommandPrimitive.Group>
                );
              })}
              {/* Icons section */}
              {filteredIcons.length > 0 && (
                <CommandPrimitive.Group
                  heading="Icons"
                  className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
                >
                  {filteredIcons.map((icon) => (
                    <CommandPrimitive.Item
                      key={icon.path}
                      value={icon.name}
                      onSelect={() => handleIconSelect(icon.path)}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none",
                        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <img
                        src={icon.path}
                        alt={icon.name}
                        className="h-4 w-4 object-contain"
                      />
                      <span>{icon.name}</span>
                    </CommandPrimitive.Item>
                  ))}
                </CommandPrimitive.Group>
              )}
            </CommandPrimitive.List>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center bg-white/95 backdrop-blur-sm border rounded-md shadow-md">
          {/* <span className="pl-3 pr-1 text-sm text-muted-foreground select-none">
            Command:
          </span> */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Type tool name..."
            className="flex-1 h-9 bg-transparent py-2 px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </CommandPrimitive>
    </div>
  );
}
