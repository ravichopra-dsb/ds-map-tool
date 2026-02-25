import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TOOLS } from "../tools/toolConfig";
import { useHiddenFeatures } from "@/hooks/useToggleObjects";
import { usePanelStore } from "@/stores/usePanelStore";
import { Settings2 } from "lucide-react";

export function TogglingObject() {
  const { hiddenTypes, toggleFeature } = useHiddenFeatures();
  const { activePanel, openLayers, closePanel, toggleToFeatures } =
    usePanelStore();
  console.log(hiddenTypes);

  return (
    <Sheet
      open={activePanel === "layers"}
      onOpenChange={(open) => (open ? openLayers() : closePanel())}
    >
      {/* <SheetTrigger asChild className="absolute left-2 bottom-2">
        <Button variant="outline">Layer</Button>
      </SheetTrigger> */}
      <SheetContent side="left" className="w-80">
        <div className="flex items-center justify-between -mt-1">
          <SheetHeader>
            <SheetTitle>Layers</SheetTitle>
          </SheetHeader>
          <Button
            variant="ghost"
            size="icon"
            title="Switch to Features"
            className="mr-8"
            onClick={toggleToFeatures}
          >
            <Settings2 className="size-4" />
          </Button>
        </div>
        <div className="px-4 divide-transparent divide-y-12">
          {TOOLS.filter((tool) => tool.category !== "edit" && tool.category !== "symbols").map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.id} className="flex items-center gap-4 ">
                <Checkbox
                  id={tool.id}
                  checked={!hiddenTypes[tool.id]}
                  onClick={() => toggleFeature(tool.id)}
                />
                <Icon className="size-4 -mr-2" />
                <Label htmlFor={tool.id}>{tool.name}</Label>
              </div>
            );
          })}
        </div>
        <SheetFooter></SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
