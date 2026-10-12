import { beforeEach, describe, expect, it } from 'vitest';
import api from './api';

let captured;

beforeEach(() => {
  localStorage.clear();
  captured = null;

  api.defaults.adapter = async (config) => {
    captured = config;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
});

function authHeader(config) {
  const headers = config?.headers;
  if (typeof headers?.get === 'function') {
    const value = headers.get('Authorization') ?? headers.get('authorization');
    if (value) return value;
  }
  return headers?.Authorization ?? headers?.authorization ?? null;
}

async function capture(url, method = 'get') {
  await api.request({ url, method });
  return captured;
}

describe('api request interceptor', () => {
  it('uses the admin token on admin routes', async () => {
    localStorage.setItem('admin_token', 'admin-token');
    localStorage.setItem('client_token', 'client-token');

    const config = await capture('/dashboard/stats');

    expect(authHeader(config)).toBe('Bearer admin-token');
  });

  it('uses the client token on client routes', async () => {
    localStorage.setItem('admin_token', 'admin-token');
    localStorage.setItem('client_token', 'client-token');

    const config = await capture('/client/profil');

    expect(authHeader(config)).toBe('Bearer client-token');
  });

  it('falls back to the admin token on client routes', async () => {
    localStorage.setItem('admin_token', 'admin-token');

    const config = await capture('/client/profil');

    expect(authHeader(config)).toBe('Bearer admin-token');
  });

  it('prefers the client token for shared reads', async () => {
    localStorage.setItem('admin_token', 'admin-token');
    localStorage.setItem('client_token', 'client-token');

    const config = await capture('/reservations/RES-0001');

    expect(authHeader(config)).toBe('Bearer client-token');
  });

  it('sends no Authorization header without a token', async () => {
    const config = await capture('/vehicules');

    expect(authHeader(config)).toBeNull();
  });

  it('keeps an Authorization header explicitly provided by the caller', async () => {
    await api.request({
      url: '/vehicules',
      method: 'get',
      headers: { Authorization: 'Bearer explicite' },
    });

    expect(authHeader(captured)).toBe('Bearer explicite');
  });
});
