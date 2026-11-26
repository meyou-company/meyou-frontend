import { lazy } from 'react';

const CHUNK_RELOAD_PREFIX = 'lunmeyo-chunk-reload:';

/**
 * @param {() => Promise<{ default: React.ComponentType }>} factory
 * @param {{ moduleId?: string }} [options]
 */
export function lazyPage(factory, options = {}) {
  const { moduleId } = options;
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkLoad =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        (error instanceof Error && error.name === 'ChunkLoadError');
      if (
        isChunkLoad &&
        moduleId &&
        typeof sessionStorage !== 'undefined' &&
        typeof window !== 'undefined'
      ) {
        const key = `${CHUNK_RELOAD_PREFIX}${moduleId}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}