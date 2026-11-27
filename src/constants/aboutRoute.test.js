import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../constants/publicRoutes';

const root = dirname(fileURLToPath(import.meta.url));
const routerSource = readFileSync(join(root, '../router/AppRouter.jsx'), 'utf8');
const publicSource = readFileSync(join(root, 'publicRoutes.js'), 'utf8');

describe('about route', () => {
  it('registers lazy /about and public access', () => {
    expect(routerSource).toMatch(/path="\/about"/);
    expect(routerSource).toMatch(/AboutPage/);
    expect(isPublicPath('/about')).toBe(true);
    expect(publicSource).toMatch(/\/about/);
  });
});