import { create } from 'zustand';

interface PendingFile {
  name: string;
  data: string | ArrayBuffer;
}

interface PendingFileStore {
  pendingFile: PendingFile | null;
  setPendingFile: (file: PendingFile) => void;
  clearPendingFile: () => void;
}

export const usePendingFileStore = create<PendingFileStore>((set) => ({
  pendingFile: null,
  setPendingFile: (file) => set({ pendingFile: file }),
  clearPendingFile: () => set({ pendingFile: null }),
}));
