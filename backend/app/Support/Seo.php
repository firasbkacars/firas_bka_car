<?php

namespace App\Support;

use App\Models\Agence;
use App\Models\Vehicule;
use Illuminate\Support\Carbon;

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

                return ['status' => 200, 'meta' => $meta];
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
            'type' => 'website',
            'noindex' => false,
        ];
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
     * Injecte les balises dans le HTML initial (avant </head>).
     *
     * @param  array<string, mixed>  $meta
     */
    public static function injectIntoHtml(string $html, array $meta): string
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

        return preg_replace('/<\/head>/i', "    ".$tags."\n  </head>", $html, 1) ?? $html;
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
            $tags[] = '<link rel="preload" as="image" href="'.self::escape($meta['preloadImage']).'" fetchpriority="high" data-seo-preload>';
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
