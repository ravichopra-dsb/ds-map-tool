import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TOOLS } from "../tools/toolConfig";
import { useHiddenFeatures } from "@/hooks/useToggleObjects";

export function TogglingObject() {
  const { hiddenTypes, toggleFeature } = useHiddenFeatures();
  console.log(hiddenTypes);

  return (
    <Sheet>
      <SheetTrigger asChild className="absolute left-2 bottom-2">
        <Button variant="outline">Layer</Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60">
        <SheetHeader>
          <SheetTitle>Layers</SheetTitle>
        </SheetHeader>
        <div className="px-4 divide-transparent divide-y-12">
          {TOOLS.slice(6).map((tool) => {
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
