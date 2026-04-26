<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modulos_ERP\AsistenciaKrsft\Models\WorkerScheduleType;

class WorkerScheduleTypeController extends Controller
{
    /**
     * GET /api/asistenciakrsft/workers/schedule-types
     * List all workers with their current schedule type assignment
     */
    public function index()
    {
        $today = now()->toDateString();

        $workers = DB::connection('attendance')
            ->table('trabajadores as t')
            ->leftJoin('worker_schedule_types as wst', function ($join) use ($today) {
                $join->on('wst.worker_id', '=', 't.id')
                    ->where('wst.effective_from', '<=', $today);
            })
            ->leftJoin('schedule_types as st', function ($join) {
                $join->on('st.id', '=', 'wst.schedule_type_id')
                    ->where('st.is_active', true);
            })
            ->select([
                't.id as worker_id',
                't.dni',
                't.nombre_completo',
                't.cargo',
                't.estado',
                'wst.id as assignment_id',
                'wst.effective_from',
                'st.id as schedule_type_id',
                'st.name as schedule_type_name',
                'st.expected_start_time',
                'st.expected_end_time',
                'st.tolerance_minutes',
                'st.auto_fill_salida',
            ])
            ->where('t.estado', 'Activo')
            ->orderBy('t.nombre_completo')
            ->get()
            ->map(function ($row) {
                // For each worker, get the latest effective_from <= today
                $latestAssignment = DB::connection('attendance')
                    ->table('worker_schedule_types')
                    ->where('worker_id', $row->worker_id)
                    ->where('effective_from', '<=', $today)
                    ->orderByDesc('effective_from')
                    ->first();

                $row->effective_from = $latestAssignment ? $latestAssignment->effective_from : null;
                return $row;
            });

        return response()->json([
            'success' => true,
            'data' => $workers,
            'total' => $workers->count(),
        ]);
    }

    /**
     * GET /api/asistenciakrsft/workers/{workerId}/schedule-type
     * Get the current schedule type for a specific worker
     */
    public function show($workerId)
    {
        $today = now()->toDateString();

        $assignment = WorkerScheduleType::resolveForWorker($workerId, $today);

        if (!$assignment) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Trabajador no tiene tipo de jornada asignado',
            ]);
        }

        $scheduleType = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $assignment->schedule_type_id)
            ->where('is_active', true)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'assignment' => $assignment,
                'schedule_type' => $scheduleType,
            ],
        ]);
    }

    /**
     * PUT /api/asistenciakrsft/workers/{workerId}/schedule-type
     * Assign or update schedule type for a worker
     */
    public function update(Request $request, $workerId)
    {
        $validated = $request->validate([
            'schedule_type_id' => ['required', 'integer'],
            'effective_from' => ['required', 'date'],
        ]);

        // Verify worker exists
        $worker = DB::table('trabajadores')
            ->where('id', $workerId)
            ->first();

        if (!$worker) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        // Verify schedule type exists and is active
        $scheduleType = DB::connection('attendance')
            ->table('schedule_types')
            ->where('id', $validated['schedule_type_id'])
            ->where('is_active', true)
            ->first();

        if (!$scheduleType) {
            return response()->json([
                'success' => false,
                'message' => 'Tipo de jornada no encontrado o inactivo',
            ], 404);
        }

        // Check if an assignment for the same schedule type and effective_from already exists
        $existingAssignment = DB::connection('attendance')
            ->table('worker_schedule_types')
            ->where('worker_id', $workerId)
            ->where('schedule_type_id', $validated['schedule_type_id'])
            ->where('effective_from', $validated['effective_from'])
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'success' => true,
                'message' => 'El trabajador ya tiene asignada esta jornada desde la fecha indicada',
                'data' => $existingAssignment,
            ]);
        }

        // Create new assignment
        $assignmentId = DB::connection('attendance')
            ->table('worker_schedule_types')
            ->insertGetId([
                'worker_id' => $workerId,
                'schedule_type_id' => $validated['schedule_type_id'],
                'effective_from' => $validated['effective_from'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        $assignment = DB::connection('attendance')
            ->table('worker_schedule_types')
            ->where('id', $assignmentId)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Tipo de jornada asignado exitosamente',
            'data' => [
                'assignment' => $assignment,
                'schedule_type' => $scheduleType,
            ],
        ]);
    }
}
