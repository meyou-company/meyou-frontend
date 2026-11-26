import { describe, expect, it } from 'vitest';
import { resolveProfileGuardState, isEmailVerifiedUser } from './profileGuardState';

describe('resolveProfileGuardState', () => {
  it('blocks children while auth is loading', () => {
    const result = resolveProfileGuardState({
      pathname: '/profile',
      isAuthLoading: true,
      isAuthed: false,
      user: null,
    });
    expect(result.renderChildren).toBe(false);
    expect(result.phase).toBe('loading');
  });

  it('blocks protected routes for guests and redirects to login with deep link', () => {
    const result = resolveProfileGuardState({
      pathname: '/messages',
      isAuthLoading: false,
      isAuthed: false,
      user: null,
    });
    expect(result.renderChildren).toBe(false);
    expect(result.redirect?.to).toBe('/auth/login');
    expect(result.redirect?.state?.redirectTo).toBe('/messages');
  });

  it('allows public routes for guests without redirect', () => {
    const result = resolveProfileGuardState({
      pathname: '/auth/login',
      isAuthLoading: false,
      isAuthed: false,
      user: null,
    });
    expect(result.renderChildren).toBe(true);
    expect(result.redirect).toBeNull();
  });

  it('allows verified users on protected routes', () => {
    const result = resolveProfileGuardState({
      pathname: '/first-page',
      isAuthLoading: false,
      isAuthed: true,
      user: {
        id: '1',
        isVerified: true,
        profileCompleted: true,
        acceptedTerms: true,
      },
    });
    expect(result.renderChildren).toBe(true);
    expect(result.phase).toBe('ready');
  });

  it('blocks children until email verification completes', () => {
    const result = resolveProfileGuardState({
      pathname: '/profile',
      isAuthLoading: false,
      isAuthed: true,
      user: {
        id: '1',
        isVerified: false,
        profileCompleted: true,
        acceptedTerms: true,
      },
    });
    expect(result.renderChildren).toBe(false);
    expect(result.redirect?.to).toBe('/auth/verify-email');
  });

  it('redirects authed users away from login to avoid login flash', () => {
    const result = resolveProfileGuardState({
      pathname: '/auth/login',
      isAuthLoading: false,
      isAuthed: true,
      user: {
        id: '1',
        isVerified: true,
        profileCompleted: true,
        acceptedTerms: true,
      },
    });
    expect(result.renderChildren).toBe(false);
    expect(result.redirect?.to).toBe('/profile');
  });

  it('keeps admin paths on profile checks without blocking', () => {
    const result = resolveProfileGuardState({
      pathname: '/admin/users',
      isAuthLoading: false,
      isAuthed: true,
      user: {
        id: '1',
        role: 'ADMIN',
        isVerified: false,
        profileCompleted: false,
      },
    });
    expect(result.renderChildren).toBe(true);
    expect(result.phase).toBe('admin');
  });
});

describe('isEmailVerifiedUser', () => {
  it('reads verification flags', () => {
    expect(isEmailVerifiedUser({ isVerified: true })).toBe(true);
    expect(isEmailVerifiedUser({ emailVerifiedAt: '2026-01-01' })).toBe(true);
    expect(isEmailVerifiedUser({})).toBe(false);
  });
});