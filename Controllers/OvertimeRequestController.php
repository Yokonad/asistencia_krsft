<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modulos_ERP\AsistenciaKrsft\Controllers\Requests\StoreOvertimeRequest;
use Modulos_ERP\AsistenciaKrsft\Controllers\Requests\RejectOvertimeRequest;
use Modulos_ERP\AsistenciaKrsft\Models\OvertimeRequest;

class OvertimeRequestController extends Controller
{
    /**
     * Conexión a la BD de asistencia
     */
    private function attendanceDB(string $table = 'attendance_records')
    {
        return DB::connection('attendance')->table($table);
    }

    /**
     * POST /api/asistenciakrsft/overtime-requests
     * Crear una solicitud de horas extra
     */
    public function store(StoreOvertimeRequest $request)
    {
        $validated = $request->validated();
        $userId = auth()->id();

        // Verificar que el registro de asistencia existe
        $attendanceRecord = $this->attendanceDB()
            ->where('id', $validated['attendance_record_id'])
            ->first();

        if (!$attendanceRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de asistencia no encontrado',
            ], 404);
        }

        // Verificar que no exista una solicitud pendiente para este registro
        $existingPending = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('attendance_record_id', $validated['attendance_record_id'])
            ->where('status', 'pending')
            ->exists();

        if ($existingPending) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una solicitud pendiente para este registro',
            ], 422);
        }

        // Crear la solicitud
        $overtimeRequestId = DB::connection('attendance')
            ->table('overtime_requests')
            ->insertGetId([
                'attendance_record_id' => $validated['attendance_record_id'],
                'requested_by_user_id' => $userId,
                'extra_hours' => $validated['extra_hours'],
                'justification' => $validated['justification'],
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        $overtimeRequest = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $overtimeRequestId)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Solicitud de horas extra creada exitosamente',
            'data' => $overtimeRequest,
        ], 201);
    }

    /**
     * GET /api/asistenciakrsft/overtime-requests/pending
     * Listar solicitudes pendientes (solo para aprobadores)
     */
    public function pending(Request $request)
    {
        $user = auth()->user();

        // Verificar permiso manualmente
        if (!$user->hasPermission('module.asistencia_krsft.approve_overtime')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para ver las solicitudes pendientes',
            ], 403);
        }

        $pendingRequests = DB::connection('attendance')
            ->table('overtime_requests as or')
            ->leftJoin('attendance_records as ar', 'ar.id', '=', 'or.attendance_record_id')
            ->leftJoin('users as u', 'u.id', '=', 'or.requested_by_user_id')
            ->where('or.status', 'pending')
            ->select([
                'or.id',
                'or.attendance_record_id',
                'or.extra_hours',
                'or.justification',
                'or.status',
                'or.created_at',
                'or.requested_by_user_id',
                'ar.captured_at',
                'ar.worker_name',
                'ar.worked_minutes',
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes_calc"),
                DB::raw("CONCAT(u.name, ' ', COALESCE(u.last_name, '')) as requester_name"),
            ])
            ->orderBy('or.created_at', 'desc')
            ->get()
            ->map(function ($row) {
                $minutes = $row->worked_minutes_calc ?? $row->worked_minutes;
                $minutes = is_numeric($minutes) ? (int) $minutes : 0;

                $capturedAtLima = !empty($row->captured_at)
                    ? \Illuminate\Support\Carbon::parse($row->captured_at)->timezone('America/Lima')
                    : null;

                $row->fecha = $capturedAtLima?->toDateString() ?? null;
                $row->worked_minutes = $minutes;
                $row->worked_time = $this->formatWorkedTime($minutes);
                $row->extra_hours = (float) $row->extra_hours;

                return $row;
            });

        return response()->json([
            'success' => true,
            'data' => $pendingRequests,
            'total' => $pendingRequests->count(),
        ]);
    }

    /**
     * PUT /api/asistenciakrsft/overtime-requests/{id}/approve
     * Aprobar una solicitud de horas extra
     */
    public function approve(Request $request, $id)
    {
        $user = auth()->user();

        // Verificar permiso
        if (!$user->hasPermission('module.asistencia_krsft.approve_overtime')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para aprobar solicitudes',
            ], 403);
        }

        // Obtener la solicitud
        $overtimeRequest = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $id)
            ->first();

        if (!$overtimeRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }

        // Verificar que esté pendiente
        if ($overtimeRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'La solicitud ya fue procesada',
            ], 422);
        }

        // Prevenir auto-aprobación
        if ($overtimeRequest->requested_by_user_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes aprobar tu propia solicitud',
            ], 403);
        }

        // Transacción para actualizar solicitud y registro de asistencia
        DB::connection('attendance')->transaction(function () use ($overtimeRequest, $user, $id) {
            $extraHoursMinutes = (float) $overtimeRequest->extra_hours * 60;

            // Actualizar la solicitud
            DB::connection('attendance')
                ->table('overtime_requests')
                ->where('id', $id)
                ->update([
                    'status' => 'approved',
                    'approved_by_user_id' => $user->id,
                    'approved_at' => now(),
                    'updated_at' => now(),
                ]);

            // Obtener el registro actual de attendance
            $attendanceRecord = DB::connection('attendance')
                ->table('attendance_records')
                ->where('id', $overtimeRequest->attendance_record_id)
                ->first();

            if ($attendanceRecord) {
                $currentMinutes = is_numeric($attendanceRecord->worked_minutes)
                    ? (int) $attendanceRecord->worked_minutes
                    : 0;

                DB::connection('attendance')
                    ->table('attendance_records')
                    ->where('id', $overtimeRequest->attendance_record_id)
                    ->update([
                        'worked_minutes' => $currentMinutes + (int) $extraHoursMinutes,
                        'updated_at' => now(),
                    ]);
            }
        });

        // Obtener la solicitud actualizada
        $updatedRequest = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $id)
            ->first();

        // Obtener el registro de asistencia actualizado
        $attendanceRecord = DB::connection('attendance')
            ->table('attendance_records')
            ->where('id', $overtimeRequest->attendance_record_id)
            ->first();

        $workedMinutes = is_numeric($attendanceRecord->worked_minutes ?? null)
            ? (int) $attendanceRecord->worked_minutes
            : 0;

        return response()->json([
            'success' => true,
            'message' => 'Horas extra aprobadas exitosamente',
            'data' => $updatedRequest,
            'worked_minutes' => $workedMinutes,
            'worked_time' => $this->formatWorkedTime($workedMinutes),
        ]);
    }

    /**
     * PUT /api/asistenciakrsft/overtime-requests/{id}/reject
     * Rechazar una solicitud de horas extra
     */
    public function reject(RejectOvertimeRequest $request, $id)
    {
        $user = auth()->user();

        // Verificar permiso
        if (!$user->hasPermission('module.asistencia_krsft.approve_overtime')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para rechazar solicitudes',
            ], 403);
        }

        $validated = $request->validated();

        // Obtener la solicitud
        $overtimeRequest = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $id)
            ->first();

        if (!$overtimeRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }

        // Verificar que esté pendiente
        if ($overtimeRequest->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'La solicitud ya fue procesada',
            ], 422);
        }

        // Prevenir auto-rechazo
        if ($overtimeRequest->requested_by_user_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes rechazar tu propia solicitud',
            ], 403);
        }

        // Actualizar la solicitud
        DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $id)
            ->update([
                'status' => 'rejected',
                'rejection_reason' => $validated['rejection_reason'],
                'approved_by_user_id' => $user->id,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        $updatedRequest = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('id', $id)
            ->first();

        return response()->json([
            'success' => true,
            'message' => 'Solicitud rechazada',
            'data' => $updatedRequest,
        ]);
    }

    /**
     * GET /api/asistenciakrsft/overtime-requests/for-record/{attendanceRecordId}
     * Obtener solicitudes de horas extra para un registro de asistencia
     */
    public function forRecord(Request $request, $attendanceRecordId)
    {
        $requests = DB::connection('attendance')
            ->table('overtime_requests')
            ->where('attendance_record_id', $attendanceRecordId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    private function formatWorkedTime(?int $minutes): ?string
    {
        if ($minutes === null || $minutes < 0) {
            return null;
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return sprintf('%02d:%02d', $hours, $remainingMinutes);
    }
}
