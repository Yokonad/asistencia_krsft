<?php

namespace Modulos_ERP\AsistenciaKrsft\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asistencia extends Model
{
    protected $table = 'asistencias';

    protected $fillable = [
        'trabajador_nombre',
        'dni',
        'area',
        'fecha',
        'hora_entrada',
        'hora_salida',
        'estado',
        'observaciones',
        'created_by_user_id',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'fecha' => 'date',
        'created_by_user_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación con el usuario que registró la asistencia
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by_user_id');
    }

    /**
     * Verifica si el trabajador estuvo presente
     */
    public function isPresente(): bool
    {
        return $this->estado === true;
    }
}
