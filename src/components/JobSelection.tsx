import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatingJob } from "./CreatingJob";
import type { PGlite } from "@electric-sql/pglite";
import type { Project } from "@/hooks/useMapProjects";
import { useState } from "react";
import { Edit2, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { useMapProjects } from "@/hooks/useMapProjects";
import { LoadingOverlay } from "./LoadingOverlay";

interface JobSelectionProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => Promise<PGlite | null>;
}

export function JobSelection({
  projects,
  currentProjectId,
  onSelectProject,
}: JobSelectionProps) {
  const [editingProject, setEditingProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [deletingProject, setDeletingProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isSwitching, setIsSwitching] = useState(false);

  const { updateProject, deleteProject } = useMapProjects();

  const handleJobSelect = async (projectId: string) => {
    setIsSwitching(true);
    try {
      await onSelectProject(projectId);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleEditProject = (projectId: string, currentName: string) => {
    setEditingProject({ id: projectId, name: currentName });
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setDeletingProject({ id: projectId, name: projectName });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {isSwitching && (
        <div className="fixed inset-0 ">
          <LoadingOverlay isVisible={true} message="Switching job..." />
        </div>
      )}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={isSwitching}
              className="border-none shadow-none p-2 rounded-sm text-xs"
            >
              {currentProjectId
                ? projects.find((p) => p.id === currentProjectId)?.name ||
                  "Select Job"
                : "Select Job"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60 mr-2">
            <div className="flex justify-between items-center">
              <DropdownMenuLabel>Create Job</DropdownMenuLabel>
              <CreatingJob onJobCreated={onSelectProject} />
            </div>
            <DropdownMenuSeparator />
            {projects.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500">
                No projects yet!
              </div>
            ) : (
              <DropdownMenuRadioGroup
                value={currentProjectId || ""}
                onValueChange={handleJobSelect}
              >
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group flex items-center justify-between"
                  >
                    <DropdownMenuRadioItem
                      value={project.id}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(project.updated_at)}
                        </span>
                      </div>
                    </DropdownMenuRadioItem>

                    {/* Three-dots action menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          onClick={() =>
                            handleEditProject(project.id, project.name)
                          }
                          className="cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Name
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleDeleteProject(project.id, project.name)
                          }
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </DropdownMenuRadioGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Project Dialog */}
        <Dialog
          open={!!editingProject}
          onOpenChange={() => setEditingProject(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Job Name</DialogTitle>
            </DialogHeader>
            {editingProject && (
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="edit-project-input">Job Name</Label>
                  <Input
                    id="edit-project-input"
                    defaultValue={editingProject.name}
                    ref={(input) => input?.focus()}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        const success = await updateProject(
                          editingProject.id,
                          e.currentTarget.value.trim()
                        );
                        if (success) {
                          setEditingProject(null);
                        } else {
                          alert("Failed to update project name");
                        }
                      }
                    }}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                onClick={async () => {
                  if (editingProject) {
                    const input = document.getElementById(
                      "edit-project-input"
                    ) as HTMLInputElement;
                    const success = await updateProject(
                      editingProject.id,
                      input.value.trim()
                    );
                    if (success) {
                      setEditingProject(null);
                    } else {
                      alert("Failed to update project name");
                    }
                  }
                }}
              >
                Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Project Confirmation Dialog */}
        <Dialog
          open={!!deletingProject}
          onOpenChange={() => setDeletingProject(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Delete Job Permanently
              </DialogTitle>
            </DialogHeader>
            {deletingProject && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete "
                  <strong>{deletingProject.name}</strong>" permanently?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This action cannot be undone. The
                    project and all its map data will be permanently deleted
                    from your browser's local database.
                  </p>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (deletingProject) {
                    const success = await deleteProject(deletingProject.id);
                    if (success) {
                      setDeletingProject(null);
                      // Handle current project cleanup if needed
                      if (currentProjectId === deletingProject.id) {
                        await onSelectProject("");
                      }
                    } else {
                      alert("Failed to delete project permanently");
                    }
                  }
                }}
              >
                Delete Permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
