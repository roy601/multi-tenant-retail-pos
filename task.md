# Electron Wrapper — Task Checklist

## Setup
- [ ] Create `electron/main.js`
- [ ] Create `electron/preload.js`
- [ ] Create `electron/build-prep.js` (copies static files after next build)
- [ ] Update `next.config.mjs` — add `output: 'standalone'`
- [ ] Update `package.json` — add scripts + electron-builder config + main field

## Install
- [ ] Install `electron`, `electron-builder`, `wait-on`, `concurrently`

## Verify
- [ ] `npm run electron:dev` opens a native window
- [ ] `npm run electron:build` creates `dist/Mobile POS Setup 1.0.0.exe`
