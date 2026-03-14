const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

const isDev = !app.isPackaged
const PORT = 3000

let mainWindow = null
let nextServer = null
let serverStarting = false

// ─── Wait for Next.js server to be ready ───────────────────────────────────
function waitForServer(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, () => {
        resolve()
      })
      req.on('error', () => {
        if (++attempts < maxAttempts) {
          setTimeout(check, 500)
        } else {
          reject(new Error(`Next.js server did not start on port ${port}`))
        }
      })
      req.setTimeout(500)
    }
    check()
  })
}

// ─── Start the bundled Next.js standalone server ────────────────────────────
function startNextServer() {
  if (nextServer || serverStarting) return
  serverStarting = true

  // In dev: load from standalone build for testing
  // In production: load from resources/standalone
  const standaloneDir = isDev
    ? path.join(__dirname, '..', '.next', 'standalone')
    : path.join(process.resourcesPath, 'standalone')

  const serverScript = path.join(standaloneDir, 'server.js')
  const fs = require('fs')

  const logPath = path.join(app.getPath('userData'), 'error.log')
  fs.writeFileSync(logPath, `Starting Next.js server from: ${serverScript}\n`, { flag: 'w' })

  console.log('Starting Next.js server from:', serverScript)

  nextServer = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_PATH: path.join(standaloneDir, 'node_modules'),
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    cwd: standaloneDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  nextServer.stdout.on('data', (data) => {
    const msg = data.toString()
    console.log('[Next.js]', msg.trim())
    fs.appendFileSync(logPath, `[OUT] ${msg}\n`)
  })
  
  nextServer.stderr.on('data', (data) => {
    const msg = data.toString()
    console.error('[Next.js error]', msg.trim())
    fs.appendFileSync(logPath, `[ERR] ${msg}\n`)
  })
  
  nextServer.on('error', (err) => {
    console.error('[Next.js spawn error]', err)
    fs.appendFileSync(logPath, `[SPAWN ERROR] ${err.message}\n`)
    serverStarting = false
  })
}

// ─── Create the main application window ────────────────────────────────────
async function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Mobile POS',
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  // Open external links in system browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })
  
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Show a loading page while Next.js boots
  const loadingPath = path.join(__dirname, 'loading.html')
  await mainWindow.loadFile(loadingPath)

  if (isDev) {
    // Dev: Next.js dev server should already be running on 3000
    console.log('Dev mode: loading http://localhost:' + PORT)
    try {
      await waitForServer(PORT, 10) // wait up to 5s in dev
      mainWindow.loadURL(`http://localhost:${PORT}`)
    } catch (e) {
      console.error('Dev server not found. Run `npm run dev` first.')
    }
  } else {
    // Production: start the standalone server and load it
    startNextServer()
    try {
      await waitForServer(PORT, 60) // wait up to 30s in prod
      mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
    } catch (e) {
      console.error('Failed to start Next.js server:', e.message)
      mainWindow.loadFile(path.join(__dirname, 'error.html'))
    }
  }
}

// ─── App lifecycle ──────────────────────────────────────────────────────────
// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(createWindow)

  app.on('window-all-closed', () => {
    killServer()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

function killServer() {
  if (nextServer && !nextServer.killed) {
    console.log('Killing Next.js server...')
    // On Windows, child_process.kill() might not kill all child processes
    // of the server, but for the standalone node process it usually works.
    nextServer.kill('SIGTERM')
    nextServer = null
    serverStarting = false
  }
}
