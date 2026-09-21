import * as path from 'path';

/**
 * Single source of truth for the projects root directory.
 * This file compiles to dist/paths.js (one level below dist/), so the
 * fallback resolves relative to web-app/server -> repo root -> projects/.
 * In production AVAFLOW_PROJECTS_PATH is always set explicitly.
 */
export function resolveProjectsRoot(): string {
  return (
    process.env.AVAFLOW_PROJECTS_PATH ||
    path.resolve(__dirname, '..', '..', '..', 'projects')
  );
}
