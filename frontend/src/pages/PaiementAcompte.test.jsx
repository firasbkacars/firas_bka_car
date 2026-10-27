import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import PaiementAcompte from './PaiementAcompte';

const { authState } = vi.hoisted(() => ({
  authState: { token: 'test-token' },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const NUMERO = 'FBC-261027-00001';

function payload(overrides = {}) {
  return {
    reservation: {
      id: 1,
      numero: NUMERO,
      statut: 'confirmee',
      mode_paiement: 'especes',
      prix_total: 2500,
      acompte: 750,
      acompte_paye: 0,
      acompte_restant: 750,
      solde_restant: 2500,
      reste_apres_acompte: 1750,
      taux_acompte: 30,
      date_debut: '2026-11-10T10:00:00Z',
      date_fin: '2026-11-15T10:00:00Z',
      lieu_prise: 'Tanger',
      vehicule: { marque: 'Dacia', modele: 'Duster', photo: null },
    },
    coordonnees: {
      virement: {
        disponible: false,
        banque: null,
        rib: null,
        beneficiaire: null,
      },
      wafacash: {
        disponible: false,
        beneficiaire: null,
        cin: null,
        telephone: null,
      },
    },
    recu: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/paiement/acompte/${NUMERO}`]}>
      <Routes>
        <Route path="/paiement/acompte/:numero" element={<PaiementAcompte />} />
      </Routes>
    </MemoryRouter>
  );
}

async function renderLoaded() {
  const view = renderPage();
  await screen.findByRole('heading', { name: "Payer l'acompte" });
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.token = 'test-token';
  api.get.mockResolvedValue({ data: payload() });
  api.post.mockReset();
});

describe('PaiementAcompte', () => {
  it('asks the client to log in when there is no session', async () => {
    authState.token = null;
    renderPage();

    expect(await screen.findByRole('heading', { name: "Payer l'acompte" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Se connecter' })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('falls back to the agency contact when bank details are missing', async () => {
    await renderLoaded();

    expect(screen.getByText('Coordonnées à confirmer')).toBeInTheDocument();
    expect(screen.getByText(/ne sont pas encore renseignées/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\+212 774 623 448/ })).toBeInTheDocument();
    expect(screen.queryByText('Copier le RIB')).not.toBeInTheDocument();

    // Montants reels de la reservation, pas ceux du mockup.
    expect(screen.getAllByText(/750/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1\s*750,00\s*DH/)).toBeInTheDocument();
  });

  it('shows configured bank coordinates and the deposit rate', async () => {
    api.get.mockResolvedValue({
      data: payload({
        coordonnees: {
          virement: {
            disponible: true,
            banque: 'Banque Test',
            rib: '011 780 0000000000000000 12',
            beneficiaire: 'FIRAS BKA CAR SARL',
          },
          wafacash: {
            disponible: false,
            beneficiaire: null,
            cin: null,
            telephone: null,
          },
        },
      }),
    });

    await renderLoaded();

    expect(screen.getByText('Coordonnées bancaires de l\'agence')).toBeInTheDocument();
    expect(screen.getByText('011 780 0000000000000000 12')).toBeInTheDocument();
    expect(screen.getByText('FIRAS BKA CAR SARL')).toBeInTheDocument();
    expect(screen.getByText('Banque Test')).toBeInTheDocument();
    expect(screen.getByText(/Acompte à payer \(30 %\)/)).toBeInTheDocument();
  });

  it('uploads a receipt and shows the pending-verification state', async () => {
    api.get.mockResolvedValue({
      data: payload({
        coordonnees: {
          virement: {
            disponible: true,
            banque: 'Banque Test',
            rib: '011 780 0000000000000000 12',
            beneficiaire: 'FIRAS BKA CAR SARL',
          },
          wafacash: {
            disponible: false,
            beneficiaire: null,
            cin: null,
            telephone: null,
          },
        },
      }),
    });

    const recu = {
      paiement_id: 9,
      nom: 'recu-virement.jpg',
      mime: 'image/jpeg',
      taille: 120,
      envoye_le: '2026-10-27T10:00:00Z',
      statut: 'en_attente',
      methode: 'virement',
    };
    api.post.mockResolvedValue({
      data: {
        message: 'Recu envoye.',
        acompte: payload({
          coordonnees: {
            virement: {
              disponible: true,
              banque: 'Banque Test',
              rib: '011 780 0000000000000000 12',
              beneficiaire: 'FIRAS BKA CAR SARL',
            },
            wafacash: {
              disponible: false,
              beneficiaire: null,
              cin: null,
              telephone: null,
            },
          },
          recu,
        }),
      },
    });

    await renderLoaded();

    const fichier = new File(['contenu'], 'recu-virement.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Choisir le reçu de paiement'), {
      target: { files: [fichier] },
    });

    expect(await screen.findByText('recu-virement.jpg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Envoyer le reçu/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toContain(`/client/reservations/${NUMERO}/acompte/recu`);
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('methode')).toBe('virement');
    expect(body.get('recu')).toBe(fichier);
    expect(config.headers['Content-Type']).toBe('multipart/form-data');

    expect(await screen.findByText('Reçu envoyé')).toBeInTheDocument();
    expect(screen.getAllByText('Reçu en vérification').length).toBeGreaterThan(0);
  });

  it('rejects an unsupported file before calling the API', async () => {
    await renderLoaded();

    fireEvent.change(screen.getByLabelText('Choisir le reçu de paiement'), {
      target: { files: [new File(['x'], 'recu.txt', { type: 'text/plain' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Format non accepté');
    expect(screen.getByRole('button', { name: /Envoyer le reçu/ })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('blocks the upload when the reservation is cancelled', async () => {
    const base = payload();
    api.get.mockResolvedValue({
      data: { ...base, reservation: { ...base.reservation, statut: 'annulee' } },
    });

    await renderLoaded();

    expect(screen.getAllByText('Réservation annulée').length).toBeGreaterThan(0);
    expect(screen.getByText(/aucun acompte ne peut être envoyé/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Choisir le reçu de paiement')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Envoyer le reçu/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Virement bancaire/ })).not.toBeInTheDocument();
  });

  it('shows a not-found message for a foreign or unknown reservation', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });

    renderPage();

    expect(await screen.findByText('Paiement indisponible')).toBeInTheDocument();
    expect(screen.getByText(/Réservation introuvable/)).toBeInTheDocument();
  });
});
