import { useState, useRef, useMemo } from "react";
import {
  Plus,
  Loader2,
  FolderOpen,
  Sparkles,
  Clock,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMapProjects, type Project } from "@/hooks/useMapProjects";
import { getMapUrl } from "@/utils/routeUtils";

export default function JobWelcome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { projects, createProject, updateProject, deleteProject, loadProject } =
    useMapProjects();

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [projects, searchQuery]);

  const handleCreateJob = async () => {
    const jobName = inputRef.current?.value.trim();
    if (!jobName) return;

    setIsCreatingProject(true);
    try {
      const newProjectId = await createProject(jobName);
      if (newProjectId) {
        setIsCreating(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setLoadingProjectId(projectId);
    try {
      const db = await loadProject(projectId);

      if (!db) {
        console.error("Failed to load project database");
        return;
      }

      const project = projects.find(p => p.id === projectId);
      if (project) {
        navigate(getMapUrl(projectId, project.name));
      } else {
        navigate('/map'); // Fallback
      }
    } catch (error) {
      console.error("Failed to select project:", error);
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editingName.trim()) return;

    try {
      await updateProject(editingProject.id, editingName.trim());
      setEditingProject(null);
      setEditingName("");
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 font-sans text-gray-900">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#2b7fff]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl shadow-[#2b7fff]/25 mb-6 transform hover:scale-105 transition-transform duration-300">
            {/* <Map className="w-10 h-10 text-white" /> */}
            <div>
              <img src="DSLogo.png" alt="" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
            Welcome to DS Map Tool
          </h1>
          <p className="text-gray-500 text-lg">
            Streamline your mapping projects with precision.
          </p>
        </div>

        {/* Main Interface */}
        <Card className="shadow-2xl shadow-[#2b7fff]/5 border-gray-100/50 backdrop-blur-md bg-white/90">
          <div className="p-6">
            {/* Action Bar: Title + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#2b7fff]" />
                  {projects.length === 0 ? "Get Started" : "Your Projects"}
                </h2>
                <p className="text-sm text-gray-500">
                  {projects.length} total projects
                </p>
              </div>

              {projects.length > 0 && (
                <div className="relative group flex-1 max-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#2b7fff] transition-colors" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-9 h-9 border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="space-y-4">
              {/* Create New Trigger */}
              {!isCreating ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-blue-100 hover:border-[#2b7fff]/40 bg-blue-50/30 hover:bg-blue-50/60 transition-all group flex items-center gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#2b7fff] flex items-center justify-center shadow-lg shadow-[#2b7fff]/20 group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Create New Job</p>
                    <p className="text-sm text-gray-500">
                      Initialize a fresh survey or layout project
                    </p>
                  </div>
                </button>
              ) : (
                <div className="p-4 rounded-xl border-2 border-[#2b7fff]/30 bg-blue-50/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">
                      New Project Name
                    </Label>
                    <Input
                      ref={inputRef}
                      placeholder="e.g., Downtown Redevelopment"
                      autoFocus
                      disabled={isCreatingProject}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateJob()}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreating(false)}
                        disabled={isCreatingProject}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateJob}
                        disabled={isCreatingProject}
                      >
                        {isCreatingProject ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Create Project
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects List */}
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <div key={project.id} className="group relative">
                      <button
                        onClick={() => handleSelectProject(project.id)}
                        disabled={loadingProjectId === project.id}
                        className="w-full p-4 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-lg hover:shadow-[#2b7fff]/5 transition-all text-left flex items-center gap-4 disabled:opacity-50"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:border-[#2b7fff]/30 group-hover:text-[#2b7fff] transition-colors">
                          {loadingProjectId === project.id ? (
                            <Loader2 className="w-6 h-6 animate-spin text-[#2b7fff]" />
                          ) : (
                            <FolderOpen className="w-6 h-6 text-gray-400 group-hover:text-[#2b7fff]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate group-hover:text-[#2b7fff] transition-colors">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Modified {formatDate(project.updated_at)}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Action Buttons */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-full"
                          onClick={() => {
                            setEditingProject(project);
                            setEditingName(project.name);
                          }}
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-full hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeletingProject(project)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : searchQuery ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                    <div className="inline-flex p-3 bg-gray-50 rounded-full mb-3">
                      <Search className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      No projects found matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[#2b7fff] text-sm font-semibold mt-2 hover:underline"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Footer Indicator */}
              <div className="pt-4 border-t border-gray-50 flex items-center justify-center">
                <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">
                  LocalStorage Persistent Storage Active
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Floating Help Tip */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Tip: Use{" "}
          <kbd className="px-2 py-1 bg-white border border-gray-200 rounded text-xs">
            Esc
          </kbd>{" "}
          to cancel creation
        </p>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="edit-name">Project Name</Label>
            <Input
              id="edit-name"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateProject()}
            />
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateProject}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingProject}
        onOpenChange={(open) => !open && setDeletingProject(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-900">
                "{deletingProject?.name}"
              </span>
              ? All associated map data, layers, and coordinates will be lost
              forever.
            </p>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Keep Project</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteProject}>
                Delete Permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
