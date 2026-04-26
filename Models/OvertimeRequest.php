<?php

namespace Modulos_ERP\AsistenciaKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class OvertimeRequest extends Model
{
    protected $connection = 'attendance';

    protected $table = 'overtime_requests';

    protected $fillable = [
        'attendance_record_id',
        'requested_by_user_id',
        'approved_by_user_id',
        'extra_hours',
        'justification',
        'status',
        'rejection_reason',
        'approved_at',
    ];

    protected $casts = [
        'extra_hours' => 'decimal:2',
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope: pending requests only
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: approved requests only
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope: rejected requests only
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope: filter by attendance record
     */
    public function scopeForAttendanceRecord($query, $id)
    {
        return $query->where('attendance_record_id', $id);
    }

    /**
     * Relationship: attendance record (query builder, no Eloquent model exists)
     */
    public function attendanceRecord()
    {
        return DB::connection('attendance')
            ->table('attendance_records as ar')
            ->where('ar.id', $this->attendance_record_id);
    }

    /**
     * Relationship: requester user
     */
    public function requestedBy()
    {
        return $this->belongsTo(\App\Models\User::class, 'requested_by_user_id');
    }

    /**
     * Relationship: approver user
     */
    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by_user_id');
    }

    /**
     * Check if request is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if request is approved
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if request is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}
