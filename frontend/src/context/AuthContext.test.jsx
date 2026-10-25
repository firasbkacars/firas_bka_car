import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import api, { CLIENT_SESSION_EXPIRED_EVENT } from '../services/api';

function Probe() {
  const { token, client, loading } = useAuth();
  return (
    <div data-testid="auth-state">
      {token ?? 'no-token'}|{client ? 'client' : 'no-client'}|{loading ? 'loading' : 'ready'}
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  api.defaults.adapter = async (config) => ({
    data: { id: 1 },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
});

describe('AuthProvider', () => {
  it('clears the client state when the session expires', async () => {
    localStorage.setItem('client_token', 'client-token');

    render(
      <MemoryRouter initialEntries={['/vehicules']}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('client-token|client|ready');
    });

    act(() => {
      localStorage.removeItem('client_token');
      window.dispatchEvent(new Event(CLIENT_SESSION_EXPIRED_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('no-token|no-client|ready');
    });
  });
});
