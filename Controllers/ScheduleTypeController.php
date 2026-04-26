<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modulos_ERP\AsistenciaKrsft\Controllers\Requests\StoreScheduleTypeRequest;
use Modulos_ERP\AsistenciaKrsft\Controllers\Requests\UpdateScheduleTypeRequest;
use Modulos_ERP\AsistenciaKrsft\Models\ScheduleType;

class ScheduleTypeController extends Controller
{
    /**
     * GET /api/asistenciakrsft/schedule-types
     * List all active schedule types
     */
    public function index()
    {
        $scheduleTypes = ScheduleType::active()
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $scheduleTypes,
            'total' => $scheduleTypes->count(),
        ]);
    }

    /**
     * POST /api/asistenciakrsft/schedule-types
     * Create a new schedule type
     */
    public function store(StoreScheduleTypeRequest $request)
    {
        $validated = $request->validated();

        $scheduleTypeId = DB::connection('attendance')
            ->table('schedule_types')
            ->insertGetId([
                'name' => $validated['name'],
                'expected_start_time' => $validated['expected_start_time'],
                'expected_end_time' => $validated['expected_end_time'],
                'tolerance_minutes' => $validated['tolerance_minutes'] ?? 5,
                'auto_fill_salida' => $validated['auto_fill_salida'] ?? false,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        $scheduleType = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $scheduleTypeId)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Tipo de jornada creado exitosamente',
            'data' => $scheduleType,
        ], 201);
    }

    /**
     * PUT /api/asistenciakrsft/schedule-types/{id}
     * Update an existing schedule type
     */
    public function update(UpdateScheduleTypeRequest $request, $id)
    {
        $scheduleType = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $id)
            ->first();

        if (!$scheduleType) {
            return response()->json([
                'success' => false,
                'message' => 'Tipo de jornada no encontrado',
            ], 404);
        }

        $validated = $request->validated();

        $updateData = [];
        if (array_key_exists('name', $validated)) {
            $updateData['name'] = $validated['name'];
        }
        if (array_key_exists('expected_start_time', $validated)) {
            $updateData['expected_start_time'] = $validated['expected_start_time'];
        }
        if (array_key_exists('expected_end_time', $validated)) {
            $updateData['expected_end_time'] = $validated['expected_end_time'];
        }
        if (array_key_exists('tolerance_minutes', $validated)) {
            $updateData['tolerance_minutes'] = $validated['tolerance_minutes'];
        }
        if (array_key_exists('auto_fill_salida', $validated)) {
            $updateData['auto_fill_salida'] = $validated['auto_fill_salida'];
        }
        if (array_key_exists('is_active', $validated)) {
            $updateData['is_active'] = $validated['is_active'];
        }

        if (!empty($updateData)) {
            $updateData['updated_at'] = now();
            DB::connection('attendance')
                ->table('schedule_types')
                ->where('id', $id)
                ->update($updateData);
        }

        $updated = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $id)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Tipo de jornada actualizado exitosamente',
            'data' => $updated,
        ]);
    }

    /**
     * DELETE /api/asistenciakrsft/schedule-types/{id}
     * Soft delete a schedule type (sets is_active = false)
     */
    public function destroy($id)
    {
        $scheduleType = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $id)
            ->first();

        if (!$scheduleType) {
            return response()->json([
                'success' => false,
                'message' => 'Tipo de jornada no encontrado',
            ], 404);
        }

        // Count workers currently assigned to this schedule type
        $workerCount = DB::connection('attendance')
            ->table('worker_schedule_types as wst')
            ->join('schedule_types as st', 'st.id', '=', 'wst.schedule_type_id')
            ->where('wst.schedule_type_id', $id)
            ->where('st.is_active', true)
            ->count();

        // Soft delete: set is_active = false
        DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $id)
            ->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

        $message = $workerCount > 0
            ? "Tipo de jornada desactivado. Afecta a {$workerCount} trabajador(es) asignado(s)."
            : 'Tipo de jornada desactivado exitosamente';

        return response()->json([
            'success' => true,
            'message' => $message,
            'affected_workers' => $workerCount,
        ]);
    }
}
