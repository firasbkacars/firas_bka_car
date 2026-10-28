import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

function Declencheur() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success('Message test', { duration: 0 })}>
      Afficher
    </button>
  );
}

describe('ToastProvider', () => {
  it('affiche une notification et permet de la fermer', async () => {
    render(
      <ToastProvider>
        <Declencheur />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Afficher' }));

    expect(await screen.findByText('Message test')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }));

    await waitFor(() => {
      expect(screen.queryByText('Message test')).not.toBeInTheDocument();
    });
  });
});
