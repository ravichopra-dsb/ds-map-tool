/// <reference types="vite/client" />

export {};

interface FileOpenApi {
  signalReady: () => void;
  onFileOpen: (callback: (filePath: string) => void) => () => void;
  readFile: (filePath: string) => Promise<{ data: string | number[]; name: string } | null>;
}

declare global {
  interface Window {
    api: FileOpenApi;
  }
}
