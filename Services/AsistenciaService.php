<?php

namespace Modulos_ERP\AsistenciaKrsft\Services;

use Illuminate\Support\Facades\DB;

class AsistenciaService
{
    /**
     * Obtiene el resumen de asistencia por rango de fechas
     */
    public function getResumenPorFecha(string $fechaInicio, string $fechaFin): array
    {
        $data = DB::table('asistencias')
            ->whereBetween('fecha', [$fechaInicio, $fechaFin])
            ->selectRaw('fecha, COUNT(*) as total, SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) as presentes')
            ->groupBy('fecha')
            ->orderBy('fecha', 'asc')
            ->get();

        return $data->toArray();
    }

    /**
     * Obtiene los trabajadores con mayor ausencia
     */
    public function getTopAusentes(int $limit = 10): array
    {
        $data = DB::table('asistencias')
            ->where('estado', false)
            ->selectRaw('trabajador_nombre, dni, COUNT(*) as total_ausencias')
            ->groupBy('trabajador_nombre', 'dni')
            ->orderBy('total_ausencias', 'desc')
            ->limit($limit)
            ->get();

        return $data->toArray();
    }
}
