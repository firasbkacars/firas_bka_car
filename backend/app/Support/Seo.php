<?php

namespace App\Support;

use App\Models\Agence;
use App\Models\Vehicule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Métadonnées SEO injectées dans le HTML initial.
 *
 * Le site est une SPA : sans cette couche, toutes les URLs renvoient le même
 * document vide et les crawlers qui n'exécutent pas JavaScript ne voient ni
 * titre, ni description, ni canonical. Les valeurs restent factuelles : elles
 * proviennent des routes statiques ci-dessous ou de la base pour les véhicules.
 */
class Seo
{
    public const SITE_NAME = 'FIRAS BKA CAR';

    public const DEFAULT_IMAGE = '/images/og-default.jpg';

    public const PUBLIC_PHONE = '+212603477786';

    /** Libellés du fil d'Ariane pour les pages statiques. */
    private const BREADCRUMB_LABELS = [
        '/vehicules' => 'Véhicules',
        '/services' => 'Services',
        '/a-propos' => 'À propos',
        '/contact' => 'Contact',
    ];

    /**
     * Véhicules supprimés dont l'URL est connue. Un 410 indique aux moteurs
     * que la page ne reviendra pas, contrairement à un 404 temporaire.
     */
    public const GONE_VEHICLE_IDS = [14];

    public static function baseUrl(): string
    {
        return rtrim((string) config('app.url', 'https://firasbkacar.com'), '/');
    }

    public static function normalizePath(string $path): string
    {
        $path = parse_url($path, PHP_URL_PATH) ?: '/';
        $path = '/'.ltrim($path, '/');

        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        return $path === '' ? '/' : $path;
    }

    public static function isPrivatePath(string $path): bool
    {
        $path = self::normalizePath($path);

        return $path === '/confirmation'
            || $path === '/admin'
            || str_starts_with($path, '/admin/')
            || $path === '/client'
            || str_starts_with($path, '/client/')
            || str_starts_with($path, '/reservation/')
            || str_starts_with($path, '/paiement/');
    }

    /**
     * Résout une URL SPA : statut HTTP réel + métadonnées à injecter.
     *
     * @return array{status:int, meta:array<string, mixed>}
     */
    public static function resolve(string $path): array
    {
        $path = self::normalizePath($path);

        if (preg_match('#^/vehicules/(\d+)$#', $path, $matches)) {
            $id = (int) $matches[1];
            $vehicule = Vehicule::query()->find($id);

            if ($vehicule) {
                $meta = self::forVehicule($vehicule);
                $meta['jsonld'] = self::vehicleGraph($meta, $vehicule);

                $vehicule->load(['reservations' => function ($query) {
                    $query->where('statut', '!=', 'annulee')
                        ->select('id', 'vehicule_id', 'date_debut', 'date_fin', 'statut');
                }]);

                return [
                    'status' => 200,
                    'meta' => $meta,
                    'content' => self::vehicleShell($vehicule),
                    'data' => ['vehicule' => $vehicule->toArray()],
                ];
            }

            if (in_array($id, self::GONE_VEHICLE_IDS, true)) {
                return ['status' => 410, 'meta' => self::goneMeta()];
            }

            return ['status' => 404, 'meta' => self::notFoundMeta()];
        }

        if (self::isPrivatePath($path)) {
            return ['status' => 200, 'meta' => self::privateMeta()];
        }

        $static = self::staticMeta();

        if (isset($static[$path])) {
            $meta = self::publicMeta($path, $static[$path]);

            if (! $meta['noindex']) {
                $meta['jsonld'] = self::pageGraph($meta, $path);
            }

            return ['status' => 200, 'meta' => $meta];
        }

        return ['status' => 404, 'meta' => self::notFoundMeta()];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function staticMeta(): array
    {
        return [
            '/' => [
                'title' => 'Location de voiture à Tanger — '.self::SITE_NAME,
                'description' => 'Louez une voiture à Tanger dès 280 MAD/jour. 8 véhicules récents, prix transparents. Réservez en ligne.',
                'changefreq' => 'daily',
                'priority' => '1.0',
                'sitemap' => true,
            ],
            '/vehicules' => [
                'title' => 'Nos véhicules de location à Tanger — '.self::SITE_NAME,
                'description' => 'Découvrez notre flotte de voitures de location à Tanger : citadines, SUV et berlines. Prix, caution et disponibilité en ligne.',
                'changefreq' => 'daily',
                'priority' => '0.9',
                'sitemap' => true,
            ],
            '/services' => [
                'title' => 'Services de location de voiture à Tanger — '.self::SITE_NAME,
                'description' => 'Location courte et longue durée, transfert aéroport, véhicule de remplacement, sièges bébé et réservation en ligne à Tanger.',
                'changefreq' => 'monthly',
                'priority' => '0.7',
                'sitemap' => true,
            ],
            '/a-propos' => [
                'title' => 'À propos de '.self::SITE_NAME.' — Agence de location à Tanger',
                'description' => 'Agence de location de voitures à Branes 1, Tanger. Notre histoire, nos engagements et les réponses aux questions fréquentes.',
                'changefreq' => 'monthly',
                'priority' => '0.6',
                'sitemap' => true,
            ],
            '/contact' => [
                'title' => 'Contact — '.self::SITE_NAME.' Tanger',
                'description' => "Téléphone, WhatsApp, adresse et formulaire de contact. L'équipe ".self::SITE_NAME.' vous répond sous 24 heures.',
                'changefreq' => 'monthly',
                'priority' => '0.6',
                'sitemap' => true,
            ],
            '/vehicules/compare' => [
                'title' => 'Comparateur de véhicules — '.self::SITE_NAME,
                'description' => 'Comparez les véhicules de location à Tanger : prix, caution, transmission, carburant et équipements.',
                'changefreq' => 'monthly',
                'priority' => '0.3',
                'sitemap' => false,
                'robots' => 'noindex, follow',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $definition
     * @return array<string, mixed>
     */
    private static function publicMeta(string $path, array $definition): array
    {
        return [
            'title' => $definition['title'],
            'description' => $definition['description'],
            'canonical' => self::baseUrl().($path === '/' ? '/' : $path),
            'robots' => $definition['robots'] ?? 'index, follow',
            'image' => self::baseUrl().self::DEFAULT_IMAGE,
            'preloadImage' => $path === '/' ? self::baseUrl().'/images/hero-bg.webp' : null,
            'type' => 'website',
            'noindex' => str_contains((string) ($definition['robots'] ?? ''), 'noindex'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function forVehicule(Vehicule $vehicule): array
    {
        $prix = self::number($vehicule->prix_jour);
        $caution = (float) $vehicule->montant_caution;
        $nom = trim($vehicule->marque.' '.$vehicule->modele);
        $transmission = $vehicule->transmission === 'automatique' ? 'boîte automatique' : 'boîte manuelle';
        $carburant = match (strtolower((string) $vehicule->carburant)) {
            'essence' => 'essence',
            'diesel' => 'diesel',
            'hybride' => 'hybride',
            default => (string) $vehicule->carburant,
        };

        $description = sprintf(
            '%s %s à louer à Tanger : %s, %s, %d places. %s MAD/jour.',
            $nom,
            $vehicule->annee,
            $carburant,
            $transmission,
            (int) $vehicule->places,
            $prix
        );

        if ($caution > 0) {
            $description .= ' Caution '.self::number($caution).' MAD.';
        }

        $photo = self::vehiclePhoto($vehicule);

        return [
            'title' => sprintf('Location %s à Tanger — %s MAD/jour', $nom, $prix),
            'description' => $description,
            'canonical' => self::baseUrl().'/vehicules/'.$vehicule->id,
            'robots' => 'index, follow',
            'image' => $photo ?? self::baseUrl().self::DEFAULT_IMAGE,
            'preloadImage' => $photo,
            'preloadSrcset' => self::photoSrcset($vehicule),
            'type' => 'website',
            'noindex' => false,
        ];
    }

    /**
     * Variantes WebP réellement présentes sur le disque, pour le préchargement
     * responsive. Retourne null si aucune variante n'a encore été générée.
     */
    private static function photoSrcset(Vehicule $vehicule): ?string
    {
        $photo = $vehicule->photos[0] ?? null;

        if (! is_string($photo) || $photo === '') {
            return null;
        }

        if (str_starts_with($photo, 'http://') || str_starts_with($photo, 'https://')) {
            return null;
        }

        $extension = pathinfo($photo, PATHINFO_EXTENSION);
        $base = $extension === '' ? $photo : substr($photo, 0, -strlen($extension) - 1);
        $entries = [];

        foreach ([320, 640, 960, 1280] as $width) {
            $variant = $base.'-'.$width.'.webp';

            if (Storage::disk('public')->exists($variant)) {
                $entries[] = self::photoUrl($variant).' '.$width.'w';
            }
        }

        return $entries === [] ? null : implode(', ', $entries);
    }

    private static function vehiclePhoto(Vehicule $vehicule): ?string
    {
        return self::photoUrl($vehicule->photos[0] ?? null);
    }

    private static function photoUrl(mixed $photo): ?string
    {
        if (! is_string($photo) || $photo === '') {
            return null;
        }

        if (str_starts_with($photo, 'http://') || str_starts_with($photo, 'https://')) {
            return $photo;
        }

        return self::baseUrl().'/storage/'.ltrim($photo, '/');
    }

    /**
     * Contenu de secours rendu côté serveur pour la fiche véhicule.
     *
     * Il est inséré dans `#root` : le navigateur peut peindre le H1, la photo
     * et le prix avant l'exécution de React, et les crawlers qui n'exécutent
     * pas JavaScript voient les faits réels du véhicule. React remplace ensuite
     * ce bloc par son propre rendu, identique en dimensions.
     */
    private static function vehicleShell(Vehicule $vehicule): string
    {
        $nom = self::escape(trim($vehicule->marque.' '.$vehicule->modele));
        $prix = self::number($vehicule->prix_jour);
        $caution = (float) $vehicule->montant_caution;
        $photo = self::vehiclePhoto($vehicule);
        $srcset = self::photoSrcset($vehicule);
        $description = trim((string) $vehicule->description);
        $transmission = $vehicule->transmission === 'automatique' ? 'Boîte automatique' : 'Boîte manuelle';
        $carburant = match (strtolower((string) $vehicule->carburant)) {
            'essence' => 'Essence',
            'diesel' => 'Diesel',
            'hybride' => 'Hybride',
            default => ucfirst((string) $vehicule->carburant),
        };

        $image = '';

        if ($photo) {
            $source = $srcset
                ? '<source type="image/webp" srcset="'.self::escape($srcset).'" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 640px">'
                : '';

            $image = '<div class="relative mb-4 overflow-hidden rounded-2xl border border-line bg-surface">'
                .'<picture>'.$source
                .'<img src="'.self::escape($photo).'" alt="'.self::escape($nom).'" width="1280" height="853"'
                .' fetchpriority="high" decoding="async"'
                .' class="h-[280px] w-full object-cover sm:h-[400px] lg:h-[460px]">'
                .'</picture></div>';
        }

        $cautionHtml = $caution > 0
            ? '<p class="mt-1 text-xs text-warning">Caution '.self::number($caution).' DH</p>'
            : '';

        $descriptionHtml = $description !== ''
            ? '<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted">'.self::escape($description).'</p>'
            : '';

        return '<div class="min-h-dvh pb-16 pt-24"><div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">'
            .'<nav class="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted" aria-label="Fil d\'Ariane">'
            .'<a href="/" class="transition-colors hover:text-white">Accueil</a>'
            .'<span aria-hidden="true">›</span>'
            .'<a href="/vehicules" class="transition-colors hover:text-white">Véhicules</a>'
            .'<span aria-hidden="true">›</span>'
            .'<span class="text-white" aria-current="page">'.$nom.'</span>'
            .'</nav>'
            .'<div class="flex flex-col gap-8 lg:flex-row">'
            .'<div class="min-w-0 flex-1">'
            .$image
            .'<div class="mb-6 mt-6">'
            .'<h1 class="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">'.$nom.'</h1>'
            .'<div class="mb-3 flex flex-wrap gap-2">'
            .'<span class="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">'.$transmission.'</span>'
            .'<span class="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">'.$carburant.'</span>'
            .'<span class="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted">'.(int) $vehicule->places.' places</span>'
            .'</div>'
            .'<div class="flex items-baseline gap-2">'
            .'<span class="text-3xl font-bold tabular-nums text-primary-light">'.$prix.' DH</span>'
            .'<span class="text-sm font-normal text-muted">/ jour</span>'
            .'</div>'
            .$cautionHtml
            .$descriptionHtml
            .'</div>'
            .'<div class="mb-6 rounded-2xl border border-line bg-surface p-5">'
            .'<h2 class="mb-4 font-semibold text-white">Spécifications</h2>'
            .'<dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">'
            .'<div><dt class="text-xs text-muted">Année</dt><dd class="text-sm text-white">'.(int) $vehicule->annee.'</dd></div>'
            .'<div><dt class="text-xs text-muted">Kilométrage</dt><dd class="text-sm text-white">'.self::number($vehicule->kilometrage).' km</dd></div>'
            .'<div><dt class="text-xs text-muted">Transmission</dt><dd class="text-sm text-white">'.$transmission.'</dd></div>'
            .'<div><dt class="text-xs text-muted">Carburant</dt><dd class="text-sm text-white">'.$carburant.'</dd></div>'
            .'<div><dt class="text-xs text-muted">Puissance</dt><dd class="text-sm text-white">'.self::escape($vehicule->puissance ?: '—').'</dd></div>'
            .'<div><dt class="text-xs text-muted">Places</dt><dd class="text-sm text-white">'.(int) $vehicule->places.'</dd></div>'
            .'</dl></div>'
            .'</div>'
            .'<aside class="lg:w-80 lg:shrink-0">'
            .'<div class="rounded-2xl border border-line bg-surface p-5">'
            .'<p class="text-xs uppercase tracking-wider text-muted">À partir de</p>'
            .'<p class="mt-2 text-3xl font-bold text-white">'.$prix.' DH <span class="text-sm font-normal text-muted">/ jour</span></p>'
            .'<a href="/reservation/'.(int) $vehicule->id.'" class="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white">Réserver ce véhicule</a>'
            .'<a href="https://wa.me/212603477786" class="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-success/30 bg-success/10 px-5 text-sm font-semibold text-success">Contacter via WhatsApp</a>'
            .'</div></aside>'
            .'</div></div></div>';
    }

    /**
     * Graphe JSON-LD d'une page publique statique.
     *
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private static function pageGraph(array $meta, string $path): array
    {
        $graph = self::globalGraph();
        $graph[] = self::webPageSchema($meta);

        if ($breadcrumb = self::breadcrumbSchema($path, $meta)) {
            $graph[] = $breadcrumb;
        }

        return [
            '@context' => 'https://schema.org',
            '@graph' => $graph,
        ];
    }

    /**
     * Graphe JSON-LD d'une fiche véhicule : page, fil d'Ariane, véhicule et offre.
     *
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private static function vehicleGraph(array $meta, Vehicule $vehicule): array
    {
        $graph = self::globalGraph();

        $webpage = self::webPageSchema($meta);
        $webpage['mainEntity'] = ['@id' => $meta['canonical'].'#vehicle'];
        $graph[] = $webpage;

        $nom = trim($vehicule->marque.' '.$vehicule->modele);

        if ($breadcrumb = self::breadcrumbSchema('/vehicules/'.$vehicule->id, $meta, $nom)) {
            $graph[] = $breadcrumb;
        }

        $graph[] = self::vehicleSchema($vehicule, $meta, $nom);

        return [
            '@context' => 'https://schema.org',
            '@graph' => $graph,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private static function globalGraph(): array
    {
        return [
            self::organizationSchema(),
            self::websiteSchema(),
        ];
    }

    /**
     * AutoRental (sous-type LocalBusiness) : uniquement des données réelles
     * issues de l'agence en base. Aucun avis, aucune note, aucun horaire non
     * validé et aucun profil social inventé.
     *
     * @return array<string, mixed>
     */
    private static function organizationSchema(): array
    {
        // Les métadonnées ne doivent jamais faire échouer la page : si la base
        // n'est pas disponible, on retombe sur les coordonnées publiques connues.
        try {
            $agence = Agence::query()->orderBy('id')->first();
        } catch (\Throwable) {
            $agence = null;
        }

        $telephone = preg_replace('/[^\d+]/', '', (string) ($agence?->telephone ?? ''));
        $telephone = is_string($telephone) && $telephone !== '' ? $telephone : self::PUBLIC_PHONE;

        $street = trim((string) ($agence?->adresse ?? ''));
        $city = trim((string) ($agence?->ville ?? ''));

        $schema = [
            '@type' => 'AutoRental',
            '@id' => self::baseUrl().'/#organization',
            'name' => self::SITE_NAME,
            'url' => self::baseUrl().'/',
            'description' => 'Agence de location de voitures à Tanger : citadines, SUV et berlines, courte et longue durée.',
            'logo' => [
                '@type' => 'ImageObject',
                'url' => self::baseUrl().'/images/logo.png',
                'width' => 264,
                'height' => 88,
            ],
            'image' => self::baseUrl().self::DEFAULT_IMAGE,
            'telephone' => $telephone,
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => $street !== '' ? $street : 'Lot 583N, Rue 50, Branes 1',
                'addressLocality' => $city !== '' ? $city : 'Tanger',
                'postalCode' => '90060',
                'addressCountry' => 'MA',
            ],
            'areaServed' => [
                '@type' => 'City',
                'name' => 'Tanger',
            ],
            'currenciesAccepted' => 'MAD',
        ];

        try {
            $prices = Vehicule::query()
                ->contratsValides()
                ->selectRaw('MIN(prix_jour) as min_prix, MAX(prix_jour) as max_prix')
                ->first();
        } catch (\Throwable) {
            $prices = null;
        }

        if ($prices?->min_prix !== null && $prices?->max_prix !== null) {
            $min = (float) $prices->min_prix;
            $max = (float) $prices->max_prix;

            $schema['priceRange'] = $min === $max
                ? self::number($min).' MAD'
                : self::number($min).'–'.self::number($max).' MAD';
        }

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    private static function websiteSchema(): array
    {
        return [
            '@type' => 'WebSite',
            '@id' => self::baseUrl().'/#website',
            'url' => self::baseUrl().'/',
            'name' => self::SITE_NAME,
            'description' => 'Location de voitures à Tanger — réservation en ligne.',
            'publisher' => ['@id' => self::baseUrl().'/#organization'],
            'inLanguage' => ['fr-MA', 'ar-MA', 'en'],
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private static function webPageSchema(array $meta): array
    {
        $page = [
            '@type' => 'WebPage',
            '@id' => $meta['canonical'].'#webpage',
            'url' => $meta['canonical'],
            'name' => $meta['title'],
            'description' => $meta['description'],
            'isPartOf' => ['@id' => self::baseUrl().'/#website'],
            'about' => ['@id' => self::baseUrl().'/#organization'],
            'inLanguage' => 'fr-MA',
        ];

        if (! empty($meta['image'])) {
            $page['primaryImageOfPage'] = [
                '@type' => 'ImageObject',
                'url' => $meta['image'],
            ];
        }

        return $page;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>|null
     */
    private static function breadcrumbSchema(string $path, array $meta, ?string $vehicleName = null): ?array
    {
        $items = [[
            '@type' => 'ListItem',
            'position' => 1,
            'name' => 'Accueil',
            'item' => self::baseUrl().'/',
        ]];

        if ($vehicleName !== null) {
            $items[] = [
                '@type' => 'ListItem',
                'position' => 2,
                'name' => 'Véhicules',
                'item' => self::baseUrl().'/vehicules',
            ];
            $items[] = [
                '@type' => 'ListItem',
                'position' => 3,
                'name' => $vehicleName,
                'item' => $meta['canonical'],
            ];
        } elseif (isset(self::BREADCRUMB_LABELS[$path])) {
            $items[] = [
                '@type' => 'ListItem',
                'position' => 2,
                'name' => self::BREADCRUMB_LABELS[$path],
                'item' => $meta['canonical'],
            ];
        }

        if (count($items) < 2) {
            return null;
        }

        return [
            '@type' => 'BreadcrumbList',
            '@id' => $meta['canonical'].'#breadcrumb',
            'itemListElement' => $items,
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private static function vehicleSchema(Vehicule $vehicule, array $meta, string $nom): array
    {
        $images = [];

        foreach ((array) $vehicule->photos as $photo) {
            if ($url = self::photoUrl($photo)) {
                $images[] = $url;
            }
        }

        $carburant = match (strtolower((string) $vehicule->carburant)) {
            'essence' => 'Gasoline',
            'diesel' => 'Diesel',
            'hybride' => 'Hybrid',
            default => (string) $vehicule->carburant,
        };

        $schema = [
            '@type' => 'Vehicle',
            '@id' => $meta['canonical'].'#vehicle',
            'name' => $nom,
            'url' => $meta['canonical'],
            'description' => $meta['description'],
            'brand' => [
                '@type' => 'Brand',
                'name' => $vehicule->marque,
            ],
            'model' => $vehicule->modele,
            'vehicleModelDate' => (string) $vehicule->annee,
            'vehicleTransmission' => $vehicule->transmission === 'automatique' ? 'Automatic' : 'Manual',
            'fuelType' => $carburant,
            'seatingCapacity' => (int) $vehicule->places,
            'offers' => [
                '@type' => 'Offer',
                '@id' => $meta['canonical'].'#offer',
                'url' => $meta['canonical'],
                'price' => (float) $vehicule->prix_jour,
                'priceCurrency' => 'MAD',
                'availability' => $vehicule->statut === 'disponible'
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/LimitedAvailability',
                'businessFunction' => 'https://schema.org/LeaseOut',
                'priceSpecification' => [
                    '@type' => 'UnitPriceSpecification',
                    'price' => (float) $vehicule->prix_jour,
                    'priceCurrency' => 'MAD',
                    'unitCode' => 'DAY',
                    'unitText' => 'jour',
                ],
                'offeredBy' => ['@id' => self::baseUrl().'/#organization'],
            ],
        ];

        if ($images !== []) {
            $schema['image'] = $images;
        }

        if ($vehicule->kilometrage !== null && (int) $vehicule->kilometrage > 0) {
            $schema['mileageFromOdometer'] = [
                '@type' => 'QuantitativeValue',
                'value' => (int) $vehicule->kilometrage,
                'unitCode' => 'KMT',
            ];
        }

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    private static function privateMeta(): array
    {
        return [
            'title' => 'Espace privé — '.self::SITE_NAME,
            'description' => 'Espace réservé aux clients et à l’administration.',
            'canonical' => null,
            'robots' => 'noindex, nofollow',
            'image' => null,
            'type' => 'website',
            'noindex' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function notFoundMeta(): array
    {
        return [
            'title' => 'Page introuvable — '.self::SITE_NAME,
            'description' => 'La page que vous recherchez n’existe pas ou a été déplacée.',
            'canonical' => null,
            'robots' => 'noindex, nofollow',
            'image' => null,
            'type' => 'website',
            'noindex' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function goneMeta(): array
    {
        return [
            'title' => 'Véhicule indisponible — '.self::SITE_NAME,
            'description' => 'Ce véhicule n’est plus proposé à la location.',
            'canonical' => null,
            'robots' => 'noindex, nofollow',
            'image' => null,
            'type' => 'website',
            'noindex' => true,
        ];
    }

    /**
     * URLs canoniques du sitemap. Les routes privées et le comparateur
     * (contenu mince) en sont volontairement exclus.
     *
     * @return array<int, array{loc:string, lastmod:?string, changefreq:string, priority:string}>
     */
    public static function sitemapUrls(): array
    {
        $vehicules = Vehicule::query()
            ->contratsValides()
            ->orderBy('id')
            ->get(['id', 'updated_at']);

        $lastFleetUpdate = $vehicules->max('updated_at');
        $lastFleetUpdate = $lastFleetUpdate ? Carbon::parse($lastFleetUpdate)->toAtomString() : null;

        $urls = [];

        foreach (self::staticMeta() as $path => $definition) {
            if (! ($definition['sitemap'] ?? false)) {
                continue;
            }

            $urls[] = [
                'loc' => self::baseUrl().($path === '/' ? '/' : $path),
                'lastmod' => in_array($path, ['/', '/vehicules'], true) ? $lastFleetUpdate : null,
                'changefreq' => $definition['changefreq'],
                'priority' => $definition['priority'],
            ];
        }

        foreach ($vehicules as $vehicule) {
            $urls[] = [
                'loc' => self::baseUrl().'/vehicules/'.$vehicule->id,
                'lastmod' => $vehicule->updated_at?->toAtomString(),
                'changefreq' => 'weekly',
                'priority' => '0.8',
            ];
        }

        return $urls;
    }

    /**
     * Injecte les balises dans le HTML initial (avant </head>), le contenu de
     * secours dans `#root` et les données initiales pour React.
     *
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>|null  $data
     */
    public static function injectIntoHtml(string $html, array $meta, ?string $content = null, ?array $data = null): string
    {
        $title = '<title>'.self::escape($meta['title']).'</title>';
        $description = '<meta name="description" content="'.self::escape($meta['description']).'">';

        if (preg_match('/<title>.*?<\/title>/is', $html)) {
            $html = preg_replace_callback('/<title>.*?<\/title>/is', fn () => $title, $html, 1) ?? $html;
        } else {
            $html = preg_replace('/<\/head>/i', $title."\n</head>", $html, 1) ?? $html;
        }

        if (preg_match('/<meta\s+name=["\']description["\'][^>]*>/i', $html)) {
            $html = preg_replace_callback(
                '/<meta\s+name=["\']description["\'][^>]*>/i',
                fn () => $description,
                $html,
                1
            ) ?? $html;
        } else {
            $html = preg_replace('/<\/head>/i', $description."\n</head>", $html, 1) ?? $html;
        }

        // Retire les balises gérées pour éviter les doublons après injection.
        $html = preg_replace('/\s*<link\s+rel=["\']canonical["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/\s*<meta\s+(?:property|name)=["\'](?:og:|twitter:)[^"\']*["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/\s*<meta\s+name=["\']robots["\'][^>]*>/i', '', $html) ?? $html;
        $html = preg_replace('/\s*<script[^>]*id=["\']seo-jsonld["\'][^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $html = preg_replace('/\s*<link[^>]*data-seo-preload[^>]*>/i', '', $html) ?? $html;

        $tags = implode("\n    ", self::headTags($meta));

        $html = preg_replace('/<\/head>/i', "    ".$tags."\n  </head>", $html, 1) ?? $html;

        if ($content !== null) {
            $html = preg_replace(
                '/<div\s+id=["\']root["\'][^>]*>\s*<\/div>/i',
                '<div id="root">'.$content.'</div>',
                $html,
                1
            ) ?? $html;
        }

        $html = preg_replace('/\s*<script[^>]*id=["\']seo-initial-data["\'][^>]*>.*?<\/script>/is', '', $html) ?? $html;

        if ($data !== null) {
            $json = json_encode(
                $data,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );

            if ($json !== false) {
                $html = preg_replace(
                    '/<\/body>/i',
                    '<script id="seo-initial-data" type="application/json">'.$json."</script>\n</body>",
                    $html,
                    1
                ) ?? $html;
            }
        }

        return $html;
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<int, string>
     */
    private static function headTags(array $meta): array
    {
        $tags = [
            '<meta name="robots" content="'.self::escape($meta['robots']).'">',
        ];

        if (! empty($meta['canonical'])) {
            $tags[] = '<link rel="canonical" href="'.self::escape($meta['canonical']).'">';
            $tags[] = '<meta property="og:url" content="'.self::escape($meta['canonical']).'">';
        }

        if (! empty($meta['preloadImage'])) {
            $preload = '<link rel="preload" as="image" href="'.self::escape($meta['preloadImage']).'"';

            if (! empty($meta['preloadSrcset'])) {
                $preload .= ' imagesrcset="'.self::escape($meta['preloadSrcset']).'"'
                    .' imagesizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 640px"'
                    .' type="image/webp"';
            }

            $tags[] = $preload.' fetchpriority="high" data-seo-preload>';
        }

        $tags[] = '<meta property="og:site_name" content="'.self::SITE_NAME.'">';
        $tags[] = '<meta property="og:locale" content="fr_MA">';
        $tags[] = '<meta property="og:type" content="'.self::escape($meta['type']).'">';
        $tags[] = '<meta property="og:title" content="'.self::escape($meta['title']).'">';
        $tags[] = '<meta property="og:description" content="'.self::escape($meta['description']).'">';

        if (! empty($meta['image'])) {
            $tags[] = '<meta property="og:image" content="'.self::escape($meta['image']).'">';
            $tags[] = '<meta property="og:image:alt" content="'.self::escape($meta['title']).'">';
        }

        $tags[] = '<meta name="twitter:card" content="summary_large_image">';
        $tags[] = '<meta name="twitter:title" content="'.self::escape($meta['title']).'">';
        $tags[] = '<meta name="twitter:description" content="'.self::escape($meta['description']).'">';

        if (! empty($meta['image'])) {
            $tags[] = '<meta name="twitter:image" content="'.self::escape($meta['image']).'">';
        }

        if (! empty($meta['jsonld'])) {
            $tags[] = '<script type="application/ld+json" id="seo-jsonld">'.self::jsonLd($meta['jsonld']).'</script>';
        }

        return $tags;
    }

    /**
     * Encode le JSON-LD sans casser le contexte HTML (JSON_HEX_TAG protège
     * contre une séquence </script> présente dans une valeur).
     *
     * @param  array<string, mixed>  $data
     */
    private static function jsonLd(array $data): string
    {
        $json = json_encode(
            $data,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP
        );

        return $json === false ? '{}' : $json;
    }

    private static function escape(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private static function number(float|int|string|null $value): string
    {
        return number_format((float) $value, 0, ',', ' ');
    }
}
