<?php

namespace Database\Factories;

use App\Models\Agence;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Agence>
 */
class AgenceFactory extends Factory
{
    protected $model = Agence::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nom' => fake()->company().' Location',
            'adresse' => fake()->streetAddress(),
            'ville' => fake()->randomElement(['Tanger', 'Casablanca', 'Rabat', 'Marrakech']),
            'telephone' => fake()->numerify('06########'),
            'email' => fake()->unique()->safeEmail(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'active' => false,
        ]);
    }
}
