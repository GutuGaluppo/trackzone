import { defineConfig } from '@trigger.dev/sdk';

/**
 * Task project reference. Keep worker secrets in the matching Trigger.dev
 * environment; web dispatch uses that environment's TRIGGER_SECRET_KEY.
 */
export default defineConfig({
  project: 'proj_ixvviriefpcxkyohqepf',
  runtime: 'node',
  logLevel: 'log',
  maxDuration: 600,
  dirs: ['./src/trigger'],
});
