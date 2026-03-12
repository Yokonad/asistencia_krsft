<?php

namespace Modulos_ERP\AsistenciaKrsft\Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AsistenciaBaseSeeder extends Seeder
{
    public function run(): void
    {
        $registros = [
            [
                'trabajador_nombre' => 'Trabajador Demo',
                'dni' => '12345678',
                'area' => 'Administración',
                'fecha' => '2026-03-11',
                'hora_entrada' => '08:00',
                'hora_salida' => '17:00',
                'estado' => true,
                'observaciones' => 'Registro de prueba',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($registros as $registro) {
            DB::table('asistencias')->insertOrIgnore($registro);
        }
    }
}
