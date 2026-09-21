<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Parametre extends Model
{
    protected $fillable = ['cle', 'valeur', 'description'];

    public static function get(string $cle, mixed $defaut = null): mixed
    {
        return Cache::remember("parametre_{$cle}", 3600, function () use ($cle, $defaut) {
            $param = static::where('cle', $cle)->first();
            return $param ? $param->valeur : $defaut;
        });
    }

    public static function set(string $cle, mixed $valeur, ?string $description = null): static
    {
        $param = static::updateOrCreate(['cle' => $cle], [
            'valeur' => $valeur,
            'description' => $description,
        ]);
        Cache::forget("parametre_{$cle}");
        return $param;
    }

    public static function getNumeric(string $cle, float $defaut = 0): float
    {
        return (float) static::get($cle, $defaut);
    }
}
