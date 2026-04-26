<?php

namespace Modulos_ERP\AsistenciaKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class WorkerScheduleType extends Model
{
    protected $connection = 'attendance';

    protected $table = 'worker_schedule_types';

    protected $fillable = [
        'worker_id',
        'schedule_type_id',
        'effective_from',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relationship: the worker
     */
    public function worker()
    {
        return $this->belongsTo(\App\Models\User::class, 'worker_id');
    }

    /**
     * Relationship: the schedule type
     */
    public function scheduleType(): BelongsTo
    {
        return $this->belongsTo(ScheduleType::class, 'schedule_type_id');
    }

    /**
     * Scope: get the schedule type effective for a given date
     * Returns the assignment with the latest effective_from <= date
     */
    public function scopeCurrent($query, $date)
    {
        return $query
            ->where('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->limit(1);
    }

    /**
     * Resolve the current schedule type for a worker on a given date
     */
    public static function resolveForWorker(int $workerId, string $date): ?self
    {
        return static::where('worker_id', $workerId)
            ->where('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->first();
    }
}
