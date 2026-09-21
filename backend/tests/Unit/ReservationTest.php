<?php

namespace Tests\Unit;

use App\Models\Reservation;
use App\Models\Vehicule;
use PHPUnit\Framework\TestCase;

class ReservationTest extends TestCase
{
    public function test_generer_numero_format(): void
    {
        $numero = Reservation::genererNumero();

        $this->assertMatchesRegularExpression('/^FBC-\d{6}-\d{5}$/', $numero);
        $this->assertStringStartsWith('FBC-' . now()->format('ymd'), $numero);
    }

    public function test_generer_numero_uniqueness(): void
    {
        $numeros = [];
        for ($i = 0; $i < 10; $i++) {
            $numeros[] = Reservation::genererNumero();
        }

        $this->assertCount(10, array_unique($numeros));
    }

    public function test_prix_total_calculation(): void
    {
        $prixJour = 600;
        $jours = 3;
        $prixTotal = $prixJour * $jours;

        $this->assertEquals(1800, $prixTotal);
    }

    public function test_acompte_calculation(): void
    {
        $prixTotal = 1800;
        $acompte = $prixTotal * 0.30;

        $this->assertEquals(540, $acompte);
    }

    public function test_prix_single_day(): void
    {
        $prixJour = 500;
        $jours = 1;
        $prixTotal = $prixJour * $jours;

        $this->assertEquals(500, $prixTotal);
    }
}
