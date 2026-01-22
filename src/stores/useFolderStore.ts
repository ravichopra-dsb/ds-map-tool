import { create } from "zustand";
import type { Folder, FolderStructure } from "@/types/folders";

interface FolderState {
  // State
  folders: Record<string, Folder>;

  // Actions
  createFolder: (name: string, parentId?: string | null) => string;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  moveFolder: (folderId: string, newParentId: string | null) => void;
  toggleFolderExpanded: (folderId: string) => void;
  setFolderExpanded: (folderId: string, expanded: boolean) => void;

  // Hierarchy helpers
  getChildFolders: (parentId: string | null) => Folder[];
  getAllDescendantFolderIds: (folderId: string) => string[];
  isDescendantOf: (folderId: string, ancestorId: string) => boolean;
  getRootFolders: () => Folder[];

  // Persistence
  loadFromStorage: (data: FolderStructure) => void;
  exportToStorage: () => FolderStructure;
  clearAll: () => void;
}

// Generate a unique ID
const generateId = (): string => {
  return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: {},

  createFolder: (name, parentId = null) => {
    const id = generateId();
    const existingFolders = Object.values(get().folders).filter(
      (f) => f.parentId === parentId
    );
    const order = existingFolders.length;

    const newFolder: Folder = {
      id,
      name,
      parentId,
      isExpanded: true,
      order,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      folders: { ...state.folders, [id]: newFolder },
    }));

    return id;
  },

  deleteFolder: (folderId) => {
    // Get all descendant folder IDs to delete
    const descendantIds = get().getAllDescendantFolderIds(folderId);
    const allIdsToDelete = [folderId, ...descendantIds];

    set((state) => {
      const newFolders = { ...state.folders };
      allIdsToDelete.forEach((id) => {
        delete newFolders[id];
      });
      return { folders: newFolders };
    });
  },

  renameFolder: (folderId, newName) => {
    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;
      return {
        folders: {
          ...state.folders,
          [folderId]: { ...folder, name: newName },
        },
      };
    });
  },

  moveFolder: (folderId, newParentId) => {
    // Prevent moving to itself or its descendants
    if (newParentId && get().isDescendantOf(newParentId, folderId)) {
      return;
    }
    if (folderId === newParentId) {
      return;
    }

    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;

      // Update order for the new parent's children
      const newSiblings = Object.values(state.folders).filter(
        (f) => f.parentId === newParentId && f.id !== folderId
      );
      const newOrder = newSiblings.length;

      return {
        folders: {
          ...state.folders,
          [folderId]: { ...folder, parentId: newParentId, order: newOrder },
        },
      };
    });
  },

  toggleFolderExpanded: (folderId) => {
    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;
      return {
        folders: {
          ...state.folders,
          [folderId]: { ...folder, isExpanded: !folder.isExpanded },
        },
      };
    });
  },

  setFolderExpanded: (folderId, expanded) => {
    set((state) => {
      const folder = state.folders[folderId];
      if (!folder) return state;
      return {
        folders: {
          ...state.folders,
          [folderId]: { ...folder, isExpanded: expanded },
        },
      };
    });
  },

  getChildFolders: (parentId) => {
    return Object.values(get().folders)
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  },

  getAllDescendantFolderIds: (folderId) => {
    const descendants: string[] = [];
    const children = get().getChildFolders(folderId);

    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...get().getAllDescendantFolderIds(child.id));
    }

    return descendants;
  },

  isDescendantOf: (folderId, ancestorId) => {
    const folder = get().folders[folderId];
    if (!folder) return false;
    if (folder.parentId === ancestorId) return true;
    if (folder.parentId === null) return false;
    return get().isDescendantOf(folder.parentId, ancestorId);
  },

  getRootFolders: () => {
    return Object.values(get().folders)
      .filter((f) => f.parentId === null)
      .sort((a, b) => a.order - b.order);
  },

  loadFromStorage: (data) => {
    set({ folders: data.folders || {} });
  },

  exportToStorage: () => {
    return { folders: get().folders };
  },

  clearAll: () => {
    set({ folders: {} });
  },
}));
