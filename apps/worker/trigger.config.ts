import { defineConfig } from '@trigger.dev/sdk/v3';

/**
 * Regenerate this with `npx trigger.dev@latest init` once a real Trigger.dev
 * project exists — `project` below is a placeholder, not a working ref.
 */
export default defineConfig({
  project: 'proj_trackzone_placeholder',
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 600,
  dirs: ['./src/trigger'],
});
