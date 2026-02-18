import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, extname, basename } from 'path'
import { existsSync, promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.ico?asset'

// --- File association constants & state ---
const SUPPORTED_EXTENSIONS = ['.kml', '.kmz', '.geojson', '.json', '.ds']
let mainWindow: BrowserWindow | null = null
let pendingFilePaths: string[] = []
let rendererReady = false

function getFilePathsFromArgs(argv: string[]): string[] {
  return argv
    .slice(1)
    .filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'))
    .filter((arg) => {
      const ext = extname(arg).toLowerCase()
      return SUPPORTED_EXTENSIONS.includes(ext)
    })
    .filter((arg) => existsSync(arg))
}

function sendFileToRenderer(filePaths: string[]): void {
  if (rendererReady && mainWindow && !mainWindow.isDestroyed()) {
    for (const filePath of filePaths) {
      mainWindow.webContents.send('file:open', filePath)
    }
  } else {
    pendingFilePaths.push(...filePaths)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.openDevTools()

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// --- macOS open-file event (can fire before app.ready) ---
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  const ext = extname(filePath).toLowerCase()
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    sendFileToRenderer([filePath])
  }
})

// --- Single-instance lock ---
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const filePaths = getFilePathsFromArgs(argv)
    if (filePaths.length > 0) {
      sendFileToRenderer(filePaths)
    }
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.ds-map-tool.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // --- IPC handlers ---
    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.on('renderer:ready', () => {
      rendererReady = true
      if (pendingFilePaths.length > 0) {
        sendFileToRenderer([...pendingFilePaths])
        pendingFilePaths = []
      }
    })

    ipcMain.handle(
      'file:read',
      async (_event, filePath: string): Promise<{ data: string | number[]; name: string } | null> => {
        try {
          const ext = extname(filePath).toLowerCase()
          const name = basename(filePath)

          if (ext === '.kmz') {
            // Binary read for KMZ — send as number array (serializable over IPC)
            const buffer = await fs.readFile(filePath)
            return { data: Array.from(buffer), name }
          } else {
            // Text read for KML/GeoJSON
            const text = await fs.readFile(filePath, 'utf-8')
            return { data: text, name }
          }
        } catch (err) {
          console.error('Failed to read file:', err)
          return null
        }
      }
    )

    createWindow()

    // Cold-start: check process.argv for file paths
    const filePaths = getFilePathsFromArgs(process.argv)
    if (filePaths.length > 0) {
      sendFileToRenderer(filePaths)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
