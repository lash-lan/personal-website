// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),

  // Old flat URLs, kept alive after the 2026 restructure.
  redirects: {
    '/serpent-wars': '/library/foundation-age/the-serpent-wars',
    '/icetear': '/library/age-of-kingdoms/the-icetear-legacy',
  },
});
