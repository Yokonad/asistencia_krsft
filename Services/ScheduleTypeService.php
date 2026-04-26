<?php

namespace Modulos_ERP\AsistenciaKrsft\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Modulos_ERP\AsistenciaKrsft\Models\ScheduleType;
use Modulos_ERP\AsistenciaKrsft\Models\WorkerScheduleType;

class ScheduleTypeService
{
    /**
     * Resolve the active schedule type for a worker on a given date.
     * Returns the ScheduleType model or null if none assigned.
     */
    public function resolveScheduleForWorker(int $workerId, string $date): ?ScheduleType
    {
        $assignment = WorkerScheduleType::where('worker_id', $workerId)
            ->where('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->first();

        if (!$assignment) {
            return null;
        }

        return ScheduleType::where('id', $assignment->schedule_type_id)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Auto-fill missing check_out_at based on worker's schedule type.
     * If check_out_at is null and schedule has auto_fill_salida=true,
     * calculates and persists the exit time.
     *
     * Returns array with:
     * - filled (bool): whether auto-fill was applied
     * - check_out_at (string|null): the filled check_out_at ISO string
     * - expected_salida (string|null): expected HH:MM for display even without auto-fill
     * - salida_missing (bool): whether salida was originally missing
     */
    public function autoFillSalida(array $attendanceRecord, int $workerId, string $attendanceDate): array
    {
        $result = [
            'filled' => false,
            'check_out_at' => null,
            'expected_salida' => null,
            'salida_missing' => false,
            'is_salida_auto_calculated' => false,
        ];

        // Check if salida already exists
        if (!empty($attendanceRecord['check_out_at'])) {
            return $result;
        }

        $result['salida_missing'] = true;

        // Get worker's schedule type
        $scheduleType = $this->resolveScheduleForWorker($workerId, $attendanceDate);

        if (!$scheduleType) {
            return $result;
        }

        $expectedEndTime = $scheduleType->expected_end_time;

        // Set expected_salida for display even without auto-fill
        $result['expected_salida'] = $expectedEndTime;

        // If auto_fill_salida is enabled, calculate and persist
        if ($scheduleType->auto_fill_salida) {
            $capturedAt = $attendanceRecord['captured_at'] ?? null;

            if ($capturedAt) {
                $capturedAtCarbon = Carbon::parse($capturedAt)->timezone('America/Lima');
                $dateStr = $capturedAtCarbon->toDateString();

                $checkOutAt = Carbon::createFromFormat(
                    'Y-m-d H:i:s',
                    $dateStr . ' ' . $expectedEndTime . ':00'
                )->timezone('America/Lima');

                // If end time is before start time, assume next day
                $startTime = $scheduleType->expected_start_time;
                $capturedTime = $capturedAtCarbon->format('H:i');
                if ($expectedEndTime <= $startTime && $capturedTime > $expectedEndTime) {
                    $checkOutAt->addDay();
                }

                $workedMinutes = max($capturedAtCarbon->diffInMinutes($checkOutAt, false), 0);

                // Persist to database
                DB::connection('attendance')
                    ->table('attendance_records')
                    ->where('id', $attendanceRecord['id'])
                    ->update([
                        'check_out_at' => $checkOutAt,
                        'worked_minutes' => $workedMinutes,
                        'updated_at' => now(),
                    ]);

                $result['filled'] = true;
                $result['check_out_at'] = $checkOutAt->toDateTimeString();
                $result['is_salida_auto_calculated'] = true;
            }
        }

        return $result;
    }
}
