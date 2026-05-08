import { middleware } from '../middleware';
import { NextRequest, NextResponse } from 'next/server';

function createRequest(pathname: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3102${pathname}`);
  const req = new NextRequest(url);
  if (token) {
    Object.defineProperty(req, 'cookies', {
      value: { get: (name: string) => name === 'access_token' ? { value: token } : undefined },
    });
  } else {
    Object.defineProperty(req, 'cookies', {
      value: { get: () => undefined },
    });
  }
  Object.defineProperty(req, 'headers', {
    value: { get: () => null },
  });
  return req;
}

describe('Student Portal Middleware', () => {
  it('allows access to /login without token', () => {
    const req = createRequest('/login');
    const res = middleware(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows access to /forgot-password without token', () => {
    const req = createRequest('/forgot-password');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows access to /verify-2fa without token', () => {
    const req = createRequest('/verify-2fa');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated user from /dashboard to /login', () => {
    const req = createRequest('/dashboard');
    const res = middleware(req);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
  });

  it('redirects unauthenticated user from / to /login', () => {
    const req = createRequest('/');
    const res = middleware(req);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('allows authenticated user through to /dashboard', () => {
    const req = createRequest('/dashboard', 'valid-token-123');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('preserves the original path in the redirect query param', () => {
    const req = createRequest('/grades');
    const res = middleware(req);
    const location = res.headers.get('location') || '';
    expect(location).toContain('from=%2Fgrades');
  });
});
