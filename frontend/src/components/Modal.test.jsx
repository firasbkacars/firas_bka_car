import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Modifier">
        <p>Contenu</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes an accessible dialog labelled by its title', () => {
    render(
      <Modal open onClose={() => {}} title="Modifier le véhicule">
        <p>Contenu</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Modifier le véhicule' })).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Fermer">
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from the header close button', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Fermer">
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Fermer">
        <p>Contenu</p>
      </Modal>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open when backdrop dismissal is disabled', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Fermer" dismissOnBackdrop={false}>
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.click(document.querySelector('[aria-hidden="true"]'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
