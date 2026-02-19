import { ElectronAPI } from '@electron-toolkit/preload'

interface FileOpenApi {
  signalReady: () => void
  onFileOpen: (callback: (filePath: string) => void) => () => void
  readFile: (filePath: string) => Promise<{ data: string | number[]; name: string } | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FileOpenApi
  }
}
