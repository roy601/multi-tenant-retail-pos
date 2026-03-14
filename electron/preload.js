// Preload script — runs in a sandboxed context before the renderer
// contextIsolation is enabled so we don't expose any Node.js APIs to the web page.
// This is intentionally empty; the app only needs Supabase (via HTTPS) and no native APIs.
window.addEventListener('DOMContentLoaded', () => {
  // Nothing to expose — the Next.js app handles everything via Supabase client
})
