/**
 * build-prep.js
 * Run after `next build` and before `electron-builder`.
 * Copies the static assets into the standalone folder so it's self-contained.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const standaloneDir = path.join(root, '.next', 'standalone')
const staticSrc = path.join(root, '.next', 'static')
const staticDest = path.join(standaloneDir, '.next', 'static')
const publicSrc = path.join(root, 'public')
const publicDest = path.join(standaloneDir, 'public')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source not found, skipping: ${src}`)
    return
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log('📦 Preparing standalone build...')
console.log('  Copying .next/static → standalone/.next/static')
copyDir(staticSrc, staticDest)

console.log('  Copying public → standalone/public')
copyDir(publicSrc, publicDest)

console.log('  Patching server.js for Electron...')
const serverJsPath = path.join(standaloneDir, 'server.js')
if (fs.existsSync(serverJsPath)) {
  let content = fs.readFileSync(serverJsPath, 'utf8')
  // We need to ensure Next.js uses the exact directory of server.js as the runtime root 
  // when packaged inside Electron's `app.asar.unpacked` or `resources` directory.
  // Next 16's standalone server relies on `process.cwd()` which might be the Electron executable dir.
  content = content.replace("const dir = path.join(__dirname)", `
const dir = path.join(__dirname);
// Force CWD to the standalone directory so static assets and chunks resolve correctly
process.chdir(dir);
  `)
  fs.writeFileSync(serverJsPath, content)
}

console.log('✅ Build prep complete!')
