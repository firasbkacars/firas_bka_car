<?php

namespace Tests\Feature;

use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'https://firasbkacar.com',
            'app.canonical_host' => 'firasbkacar.com',
        ]);
    }

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'Dacia',
            'modele' => 'Duster',
            'categorie' => 'SUV',
            'annee' => 2023,
            'transmission' => 'manuelle',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 400,
            'montant_caution' => 1500,
            'statut' => 'disponible',
            'photos' => ['vehicules/test.jpg'],
        ], $overrides));
    }

    public function test_home_injects_title_description_canonical_and_social_tags(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertSee('<title>Location de voiture à Tanger — FIRAS BKA CAR</title>', false);
        $response->assertSee('rel="canonical" href="https://firasbkacar.com/"', false);
        $response->assertSee('property="og:title"', false);
        $response->assertSee('name="twitter:card" content="summary_large_image"', false);
        $response->assertSee(
            'rel="preload" as="image" href="https://firasbkacar.com/images/hero-bg.webp"',
            false
        );

        $html = $response->getContent();
        $this->assertSame(1, substr_count($html, '<meta name="description"'));
        $this->assertSame(1, substr_count($html, 'rel="canonical"'));
    }

    public function test_static_pages_have_unique_titles(): void
    {
        $titles = [];

        foreach (['/', '/vehicules', '/services', '/a-propos', '/contact'] as $path) {
            $html = $this->get($path)->assertOk()->getContent();
            preg_match('/<title>(.*?)<\/title>/is', $html, $matches);
            $titles[] = $matches[1] ?? '';
        }

        $this->assertCount(5, array_unique($titles));
    }

    public function test_vehicle_page_injects_factual_metadata(): void
    {
        $vehicule = $this->createVehicule();

        $response = $this->get('/vehicules/'.$vehicule->id);

        $response->assertOk();
        $response->assertSee(
            '<title>Location Dacia Duster à Tanger — 400 MAD/jour</title>',
            false
        );
        $response->assertSee(
            'Dacia Duster 2023 à louer à Tanger : diesel, boîte manuelle, 5 places. 400 MAD/jour. Caution 1 500 MAD.',
            false
        );
        $response->assertSee(
            'rel="canonical" href="https://firasbkacar.com/vehicules/'.$vehicule->id.'"',
            false
        );
        $response->assertSee(
            'property="og:image" content="https://firasbkacar.com/storage/vehicules/test.jpg"',
            false
        );
        $response->assertSee(
            'rel="preload" as="image" href="https://firasbkacar.com/storage/vehicules/test.jpg"',
            false
        );
    }

    public function test_vehicle_canonical_uses_integer_id(): void
    {
        $vehicule = $this->createVehicule();

        $this->get('/vehicules/0'.$vehicule->id)
            ->assertOk()
            ->assertSee('rel="canonical" href="https://firasbkacar.com/vehicules/'.$vehicule->id.'"', false);
    }

    public function test_unknown_route_returns_real_404_and_noindex(): void
    {
        $response = $this->get('/route-qui-nexiste-pas');

        $response->assertNotFound();
        $response->assertHeader('X-Robots-Tag', 'noindex, nofollow');
        $response->assertSee('name="robots" content="noindex, nofollow"', false);
    }

    public function test_deleted_vehicle_returns_410(): void
    {
        $response = $this->get('/vehicules/14');

        $response->assertStatus(410);
        $response->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_private_routes_are_noindex_and_have_no_canonical(): void
    {
        foreach ([
            '/admin/login',
            '/admin/parametres',
            '/client/login',
            '/client/profil',
            '/reservation/9',
            '/confirmation',
            '/paiement/acompte/1',
            '/paiement/retour',
        ] as $path) {
            $response = $this->get($path);

            $response->assertOk();
            $response->assertHeader('X-Robots-Tag', 'noindex, nofollow');
            $response->assertDontSee('rel="canonical"', false);
        }
    }

    public function test_compare_is_noindex_and_excluded_from_sitemap(): void
    {
        $this->get('/vehicules/compare')
            ->assertOk()
            ->assertHeader('X-Robots-Tag', 'noindex, follow');

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertDontSee('/vehicules/compare', false);
    }

    public function test_sitemap_lists_canonical_urls_and_vehicle_lastmod(): void
    {
        $vehicule = $this->createVehicule();

        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
        $response->assertSee('<loc>https://firasbkacar.com/</loc>', false);
        $response->assertSee('<loc>https://firasbkacar.com/vehicules</loc>', false);
        $response->assertSee('<loc>https://firasbkacar.com/vehicules/'.$vehicule->id.'</loc>', false);
        $response->assertSee('<lastmod>', false);
        $response->assertDontSee('/admin', false);
        $response->assertDontSee('/client', false);
    }

    public function test_robots_txt_declares_sitemap(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Sitemap: https://firasbkacar.com/sitemap.xml', $robots);
        $this->assertStringNotContainsString('Disallow: /admin', $robots);
    }

    public function test_fly_dev_and_www_redirect_to_canonical_host(): void
    {
        $this->get('https://firasbkacar.fly.dev/vehicules?categorie=suv')
            ->assertStatus(301)
            ->assertRedirect('https://firasbkacar.com/vehicules?categorie=suv');

        $this->get('https://www.firasbkacar.com/contact')
            ->assertStatus(301)
            ->assertRedirect('https://firasbkacar.com/contact');
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonLdFrom(string $html): array
    {
        preg_match('/<script type="application\/ld\+json" id="seo-jsonld">(.*?)<\/script>/is', $html, $matches);

        $this->assertNotEmpty($matches[1] ?? null, 'Bloc JSON-LD absent.');

        $decoded = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);

        return $decoded;
    }

    /**
     * @param  array<string, mixed>  $graph
     * @return array<string, mixed>
     */
    private function schemaOfType(array $graph, string $type): array
    {
        foreach ($graph['@graph'] as $node) {
            if (($node['@type'] ?? null) === $type) {
                return $node;
            }
        }

        $this->fail('Type JSON-LD absent : '.$type);
    }

    public function test_home_exposes_organization_website_and_webpage_json_ld(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertSame(1, substr_count($html, 'id="seo-jsonld"'));

        $graph = $this->jsonLdFrom($html);

        $this->assertSame('https://schema.org', $graph['@context']);

        $organization = $this->schemaOfType($graph, 'AutoRental');
        $this->assertSame('FIRAS BKA CAR', $organization['name']);
        $this->assertSame('+212603477786', $organization['telephone']);
        $this->assertSame('Tanger', $organization['address']['addressLocality']);
        $this->assertSame('MA', $organization['address']['addressCountry']);
        $this->assertSame('MAD', $organization['currenciesAccepted']);

        $website = $this->schemaOfType($graph, 'WebSite');
        $this->assertSame('https://firasbkacar.com/#website', $website['@id']);
        $this->assertSame(['fr-MA', 'ar-MA', 'en'], $website['inLanguage']);

        $webpage = $this->schemaOfType($graph, 'WebPage');
        $this->assertSame('https://firasbkacar.com/#webpage', $webpage['@id']);
        $this->assertSame('fr-MA', $webpage['inLanguage']);

        foreach ($graph['@graph'] as $node) {
            $this->assertNotSame('BreadcrumbList', $node['@type']);
        }
    }

    public function test_vehicle_page_exposes_vehicle_offer_and_breadcrumb_json_ld(): void
    {
        $vehicule = $this->createVehicule([
            'kilometrage' => 45000,
            'photos' => ['vehicules/test.jpg', 'vehicules/test-2.jpg'],
        ]);

        $html = $this->get('/vehicules/'.$vehicule->id)->assertOk()->getContent();
        $graph = $this->jsonLdFrom($html);

        $vehicle = $this->schemaOfType($graph, 'Vehicle');
        $this->assertSame('Dacia Duster', $vehicle['name']);
        $this->assertSame('Dacia', $vehicle['brand']['name']);
        $this->assertSame('Duster', $vehicle['model']);
        $this->assertSame('2023', $vehicle['vehicleModelDate']);
        $this->assertSame('Manual', $vehicle['vehicleTransmission']);
        $this->assertSame('Diesel', $vehicle['fuelType']);
        $this->assertSame(5, $vehicle['seatingCapacity']);
        $this->assertSame(45000, $vehicle['mileageFromOdometer']['value']);
        $this->assertSame('KMT', $vehicle['mileageFromOdometer']['unitCode']);
        $this->assertSame('https://firasbkacar.com/storage/vehicules/test.jpg', $vehicle['image'][0]);

        $offer = $vehicle['offers'];
        $this->assertSame('Offer', $offer['@type']);
        $this->assertEquals(400, $offer['price']);
        $this->assertSame('MAD', $offer['priceCurrency']);
        $this->assertSame('https://schema.org/InStock', $offer['availability']);
        $this->assertSame('https://schema.org/LeaseOut', $offer['businessFunction']);
        $this->assertSame('DAY', $offer['priceSpecification']['unitCode']);
        $this->assertSame('https://firasbkacar.com/#organization', $offer['offeredBy']['@id']);

        $breadcrumb = $this->schemaOfType($graph, 'BreadcrumbList');
        $this->assertCount(3, $breadcrumb['itemListElement']);
        $this->assertSame('Accueil', $breadcrumb['itemListElement'][0]['name']);
        $this->assertSame('Véhicules', $breadcrumb['itemListElement'][1]['name']);
        $this->assertSame('Dacia Duster', $breadcrumb['itemListElement'][2]['name']);
        $this->assertSame(
            'https://firasbkacar.com/vehicules/'.$vehicule->id,
            $breadcrumb['itemListElement'][2]['item']
        );

        $webpage = $this->schemaOfType($graph, 'WebPage');
        $this->assertSame(
            'https://firasbkacar.com/vehicules/'.$vehicule->id.'#vehicle',
            $webpage['mainEntity']['@id']
        );
    }

    public function test_static_pages_expose_a_two_level_breadcrumb(): void
    {
        $html = $this->get('/services')->assertOk()->getContent();
        $graph = $this->jsonLdFrom($html);

        $breadcrumb = $this->schemaOfType($graph, 'BreadcrumbList');
        $this->assertCount(2, $breadcrumb['itemListElement']);
        $this->assertSame('Services', $breadcrumb['itemListElement'][1]['name']);
        $this->assertSame('https://firasbkacar.com/services', $breadcrumb['itemListElement'][1]['item']);
    }

    public function test_vehicle_preload_exposes_webp_srcset_when_variants_exist(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('vehicules/test-640.webp', 'variant');
        Storage::disk('public')->put('vehicules/test-1280.webp', 'variant');

        $vehicule = $this->createVehicule(['photos' => ['vehicules/test.jpg']]);

        $response = $this->get('/vehicules/'.$vehicule->id)->assertOk();

        $response->assertSee(
            'imagesrcset="https://firasbkacar.com/storage/vehicules/test-640.webp 640w, https://firasbkacar.com/storage/vehicules/test-1280.webp 1280w"',
            false
        );
        $response->assertSee('type="image/webp"', false);
    }

    public function test_private_and_error_pages_have_no_json_ld(): void
    {
        foreach (['/admin/login', '/client/profil', '/route-inconnue', '/vehicules/14', '/vehicules/compare'] as $path) {
            $html = $this->get($path)->getContent();

            $this->assertStringNotContainsString('application/ld+json', $html, $path);
        }
    }
}
