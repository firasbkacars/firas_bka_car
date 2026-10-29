<?php

namespace Tests\Feature;

use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
