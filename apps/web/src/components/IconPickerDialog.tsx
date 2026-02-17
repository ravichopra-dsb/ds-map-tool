import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIconCategories, getIconFullPath } from "@/utils/iconUtils";
import { Search } from "lucide-react";

interface IconPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconPath: string) => void;
}

export function IconPickerDialog({ isOpen, onClose, onSelectIcon }: IconPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory] = useState<string | null>(null);
  const categories = getIconCategories();

  const handleIconClick = (categoryPath: string, iconName: string) => {
    const fullPath = getIconFullPath(categoryPath, iconName);
    onSelectIcon(fullPath);
    onClose();
  };

  const filteredCategories = categories.map(category => {
    if (!searchTerm && !selectedCategory) return category;

    if (selectedCategory && category.name !== selectedCategory) {
      return { ...category, icons: [] };
    }

    if (searchTerm) {
      const filtered = category.icons.filter(icon =>
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...category, icons: filtered };
    }

    return category;
  }).filter(category => category.icons.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select an Icon</DialogTitle>
          <DialogDescription>
            Choose an icon from Google Earth icon collection to place on your map
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        {/* <div className="flex gap-2 pb-4 border-b ">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category.name}
              variant={selectedCategory === category.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </Button>
          ))}
        </div> */}

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              No icons found matching your search
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.name} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                  {category.name}
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-8 gap-2">
                  {category.icons.map((icon) => {
                    const iconPath = getIconFullPath(category.path, icon);
                    return (
                      <button
                        key={icon}
                        onClick={() => handleIconClick(category.path, icon)}
                        className="group relative aspect-square border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 p-2 flex items-center justify-center"
                        title={icon.replace('.png', '')}
                      >
                        <img
                          src={iconPath}
                          alt={icon}
                          className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
