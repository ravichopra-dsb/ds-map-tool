import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useMapProjects } from "@/hooks/useMapProjects";

interface CreatingJobProps {
  onJobCreated?: (projectId: string) => void;
}

export function CreatingJob({ onJobCreated }: CreatingJobProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the hook directly!
  const { createProject } = useMapProjects();

  const handleNewJob = async () => {
    const jobName = inputRef.current?.value.trim();
    console.log("jobName", jobName);

    if (!jobName) {
      alert("Please enter a job title");
      return;
    }

    setIsLoading(true);
    try {
      // Create new project in database
      console.log("yo");
      const newProjectId = await createProject(jobName);
      console.log("newProjectId", newProjectId);

      if (newProjectId) {
        // Switch to the newly created project
        // setCurrentProjectId(newProjectId);

        // ✅ Dispatch storage change event to notify listeners
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "mapProjects",
            newValue: localStorage.getItem("mapProjects"),
          })
        );

        // Notify parent if needed
        await onJobCreated?.(newProjectId);

        console.log("New Project Created:", newProjectId);

        // Close dialog and clear input
        setIsOpen(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-none shadow-none hover:bg-transparent cursor-pointer"
        >
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm font-medium">Creating job...</span>
            </div>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Enter Job Title</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="job-input">Job Name</Label>
            <Input
              id="job-input"
              ref={inputRef}
              placeholder="e.g., District Mapping Job"
              disabled={isLoading}
              onKeyDown={(e) => {
                // Allow Enter key to submit
                if (e.key === "Enter" && !isLoading) {
                  handleNewJob();
                }
              }}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>
              Close
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleNewJob} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Job"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
