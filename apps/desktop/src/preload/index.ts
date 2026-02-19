import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer — file association support
const api = {
  /** Signal that renderer is ready to receive file-open events */
  signalReady: (): void => ipcRenderer.send('renderer:ready'),

  /** Listen for file-open events from main process. Returns cleanup function. */
  onFileOpen: (callback: (filePath: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void =>
      callback(filePath)
    ipcRenderer.on('file:open', handler)
    return () => ipcRenderer.removeListener('file:open', handler)
  },

  /** Read file contents via main process (renderer is sandboxed from fs). */
  readFile: (filePath: string): Promise<{ data: string | number[]; name: string } | null> => {
    return ipcRenderer.invoke('file:read', filePath)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
