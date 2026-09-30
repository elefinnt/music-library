import { app, BrowserWindow, net, protocol, shell } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'
import { registerIpc } from './ipc'
import { schemaStatus } from './library/db'
import { requeueRunning } from './library/jobs'
import { pump } from './queue/runner'
import { getSettings } from './settings'

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#1a1612',
    autoHideMenuBar: true,
    title: 'Music Library',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  win.on('ready-to-show', () => {
    win.show()
    console.log('Music Library window ready')
  })
  win.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const filePath = new URL(request.url).searchParams.get('path')
    if (!filePath) return new Response('Missing file', { status: 400 })
    const root = path.resolve(getSettings().musicRoot)
    const target = path.resolve(filePath)
    const relative = path.relative(root, target)
    if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(target).href)
  })
  registerIpc()
  if (schemaStatus().ready) {
    requeueRunning()
    pump()
  }
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
