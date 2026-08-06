/* The self-test sandbox — a second dev server on its own port, and therefore its
 * own browser origin.
 *
 *   npm run dev          → 3000, the app you click around in
 *   npm run dev:test     → 3001, where ?selftest=1 runs
 *
 * Straight from TravelHub's tools/serve.js, whose comment earns repeating:
 *
 *   "They are separate ORIGINS, so the browser gives each its own localStorage.
 *    That is the whole point. [...] which cost a real debugging session in
 *    v1.11.0, when four failures turned out to be a QA agent clicking on the
 *    same port."
 *
 * For Aviente the shared state is worse than localStorage keys. Supabase keeps the
 * auth session in localStorage, so a suite running on the app's own origin can log
 * you out mid-edit, or inherit your session and act as you. On :3001 the browser
 * treats it as a different site: separate session, separate splash flag, separate
 * theme. Nothing the suite does can reach the tab you are working in.
 *
 * It also loads `.env.test` when present, falling back to `.env.local`. That is the
 * hook for pointing the sandbox at a different Supabase project later, if a
 * throwaway database is ever wanted back — no Docker required.
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT ?? '3001';

function readEnv(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const testEnv = readEnv('.env.test');
const baseEnv = readEnv('.env.local') ?? {};
const env = { ...process.env, ...baseEnv, ...(testEnv ?? {}) };

// The sandbox always has the flag on: it is what attaches window.Aviente so the
// suite exercises the real parser rather than a copy of it.
env.NEXT_PUBLIC_E2E = '1';

console.log(`
  sandbox → http://localhost:${PORT}/?selftest=1
  config  → ${testEnv ? '.env.test (overriding .env.local)' : '.env.local'}
  database→ ${env.NEXT_PUBLIC_SUPABASE_URL || '(none set — DOM and parser checks only)'}
${testEnv ? '' : `
  Note: this shares a database with the app on :3000. The origin is separate, so
  your session and local state are safe, but the suite must stay read-only. To
  isolate the data too, create .env.test pointing at another Supabase project.
`}`);

/* Why a production build rather than a second `next dev`: Next 16 refuses to run
 * two dev servers from one directory, so the sandbox builds and serves instead.
 * That turns out to be the better shape anyway -- it mirrors TravelHub's split of
 * a deployed copy on one port against the working copy on the other, and it means
 * the suite asserts against the bundle that actually ships, where a font or CSS
 * problem can differ from dev. */
const run = (cmd, args) => new Promise((ok, no) => {
  spawn(cmd, args, { cwd: root, env, stdio: 'inherit' })
    .on('exit', (code) => (code ? no(new Error(`${cmd} exited ${code}`)) : ok()));
});

try {
  if (!process.argv.includes('--no-build')) {
    console.log('  building…\n');
    await run('npx', ['next', 'build']);
  }
  await run('npx', ['next', 'start', '--port', String(PORT)]);
} catch (err) {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
}
