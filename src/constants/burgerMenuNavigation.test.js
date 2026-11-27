import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  burgerMenuIdsThatMustNotUseOops,
  resolveBurgerMenuAction,
} from './burgerMenuNavigation';

const burgerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../components/BurgerMenu/BurgerMenu.jsx'),
  'utf8',
);

describe('burgerMenuNavigation', () => {
  it('maps favorites to saved posts', () => {
    expect(resolveBurgerMenuAction('favorites')).toEqual({
      kind: 'route',
      path: '/saved',
    });
  });

  it('maps support to technical feedback compose', () => {
    expect(resolveBurgerMenuAction('support')).toEqual({
      kind: 'feedback',
      view: 'compose',
      composeIntent: 'support',
    });
  });

  it('maps report to violation feedback compose', () => {
    expect(resolveBurgerMenuAction('report')).toMatchObject({
      kind: 'feedback',
      view: 'compose',
      composeIntent: 'report',
    });
  });

  it('maps about to public about page', () => {
    expect(resolveBurgerMenuAction('about')).toMatchObject({
      kind: 'route',
      path: '/about',
    });
  });

  it('does not route main menu items through /oops', () => {
    for (const id of burgerMenuIdsThatMustNotUseOops()) {
      const action = resolveBurgerMenuAction(id);
      expect(action?.path).not.toBe('/oops');
    }
    expect(burgerSource.includes("navigate('/oops')")).toBe(false);
  });
});