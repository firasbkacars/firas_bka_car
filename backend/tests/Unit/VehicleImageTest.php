<?php

namespace Tests\Unit;

use App\Support\VehicleImage;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VehicleImageTest extends TestCase
{
    public function test_variant_path_keeps_the_folder_and_replaces_the_extension(): void
    {
        $this->assertSame(
            'vehicules/dacia-duster-640.webp',
            VehicleImage::variantPath('vehicules/dacia-duster.jpg', 640)
        );

        $this->assertSame(
            'vehicules/photo-1280.webp',
            VehicleImage::variantPath('vehicules/photo.png', 1280)
        );

        $this->assertSame(
            'vehicules/photo-320.webp',
            VehicleImage::variantPath('vehicules/photo.webp', 320)
        );
    }

    public function test_delete_variants_only_removes_generated_widths(): void
    {
        Storage::fake('public');

        $disk = Storage::disk('public');
        $disk->put('vehicules/test.jpg', 'source');
        $disk->put('vehicules/test-320.webp', 'w320');
        $disk->put('vehicules/test-1280.webp', 'w1280');
        $disk->put('vehicules/test-1600.webp', 'not-managed');

        $deleted = VehicleImage::deleteVariants('vehicules/test.jpg');

        sort($deleted);
        $this->assertSame([
            'vehicules/test-1280.webp',
            'vehicules/test-320.webp',
        ], $deleted);

        $disk->assertMissing('vehicules/test-320.webp');
        $disk->assertMissing('vehicules/test-1280.webp');
        $disk->assertExists('vehicules/test-1600.webp');
        $disk->assertExists('vehicules/test.jpg');
    }

    public function test_generate_is_a_no_op_when_the_source_is_missing(): void
    {
        Storage::fake('public');

        $this->assertSame([], VehicleImage::generate('vehicules/absent.jpg'));
    }

    public function test_generated_widths_cover_mobile_card_and_retina_detail(): void
    {
        $this->assertSame([320, 640, 960, 1280], VehicleImage::WIDTHS);
    }
}
