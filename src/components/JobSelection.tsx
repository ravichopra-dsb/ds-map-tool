import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatingJob } from "./CreatingJob";

export function JobSelection() {
  const [position, setPosition] = useState("bottom");

  return (
    <div className="absolute top-2 right-4 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Select Job</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40 mr-2">
          <div className="flex justify-between items-center">
            <DropdownMenuLabel>Create Job</DropdownMenuLabel>
            <CreatingJob />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
            <DropdownMenuRadioItem value="top">Job Name</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
