import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LangueSwitcher from './LangueSwitcher';
import i18n from '../i18n';

afterEach(async () => {
  await i18n.changeLanguage('fr');
});

describe('LangueSwitcher', () => {
  it('change la langue, le sens de lecture et le libelle du bouton', async () => {
    render(<LangueSwitcher />);

    const bouton = screen.getByRole('button', { name: 'Langue' });
    fireEvent.click(bouton);

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'العربية' }));

    await waitFor(() => expect(i18n.language).toBe('ar'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(screen.getByRole('button', { name: 'اللغة' })).toHaveTextContent('AR');
  });

  it('revient en francais et en LTR', async () => {
    render(<LangueSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'Langue' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    await waitFor(() => expect(i18n.language).toBe('en'));

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Français' }));

    await waitFor(() => expect(i18n.language).toBe('fr'));
    expect(document.documentElement.dir).toBe('ltr');
  });
});
