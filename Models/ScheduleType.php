<?php

namespace Modulos_ERP\AsistenciaKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ScheduleType extends Model
{
    protected $connection = 'attendance';

    protected $table = 'schedule_types';

    protected $fillable = [
        'name',
        'expected_start_time',
        'expected_end_time',
        'tolerance_minutes',
        'auto_fill_salida',
        'is_active',
    ];

    protected $casts = [
        'tolerance_minutes' => 'integer',
        'auto_fill_salida' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope: only active schedule types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Relationship: worker schedule type assignments
     */
    public function workerScheduleTypes(): HasMany
    {
        return $this->hasMany(WorkerScheduleType::class, 'schedule_type_id');
    }

    /**
     * Relationship: workers assigned to this schedule type (through worker_schedule_types)
     */
    public function workers()
    {
        return $this->belongsToMany(
            \App\Models\User::class,
            'worker_schedule_types',
            'schedule_type_id',
            'worker_id'
        )->withPivot('effective_from');
    }
}
