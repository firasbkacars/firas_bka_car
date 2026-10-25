import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { CLIENT_SESSION_EXPIRED_EVENT } from './api';

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

function rejectWithStatus(status) {
  api.defaults.adapter = async (config) => {
    const error = new Error('Request failed');
    error.config = config;
    error.response = { status, data: {}, statusText: '', headers: {}, config };
    throw error;
  };
}

async function expectRejected(url, status) {
  rejectWithStatus(status);
  await expect(api.get(url)).rejects.toBeTruthy();
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

  it('never sends the admin token on client routes', async () => {
    localStorage.setItem('admin_token', 'admin-token');

    const config = await capture('/client/profil');

    expect(authHeader(config)).toBeNull();
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

describe('api response interceptor', () => {
  function watchSessionExpired() {
    const listener = vi.fn();
    window.addEventListener(CLIENT_SESSION_EXPIRED_EVENT, listener);
    return {
      listener,
      stop: () => window.removeEventListener(CLIENT_SESSION_EXPIRED_EVENT, listener),
    };
  }

  it('clears an invalid client session and emits an event on 401', async () => {
    localStorage.setItem('client_token', 'client-token');
    localStorage.setItem('admin_token', 'admin-token');
    const { listener, stop } = watchSessionExpired();

    try {
      await expectRejected('/client/notifications', 401);

      expect(localStorage.getItem('client_token')).toBeNull();
      expect(localStorage.getItem('admin_token')).toBe('admin-token');
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
  });

  it('clears the client session on a 401 from a shared route', async () => {
    localStorage.setItem('client_token', 'client-token');
    const { listener, stop } = watchSessionExpired();

    try {
      await expectRejected('/reservations/RES-0001', 401);

      expect(localStorage.getItem('client_token')).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
  });

  it('does not log out on a 403 from an authenticated client', async () => {
    localStorage.setItem('client_token', 'client-token');
    const { listener, stop } = watchSessionExpired();

    try {
      await expectRejected('/client/reservations/42/facture', 403);

      expect(localStorage.getItem('client_token')).toBe('client-token');
      expect(listener).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it('clears stale React state when a client route fails without a client token', async () => {
    localStorage.setItem('admin_token', 'admin-token');
    const { listener, stop } = watchSessionExpired();

    try {
      await expectRejected('/client/notifications', 403);

      expect(localStorage.getItem('admin_token')).toBe('admin-token');
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      stop();
    }
  });
});
