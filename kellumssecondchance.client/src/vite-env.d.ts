/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * When "true", failed content reads fall back to the bundled sample content.
   * Defaults to on in development and off in production builds.
   */
  readonly VITE_CONTENT_FALLBACK?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
