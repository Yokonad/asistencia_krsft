<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOvertimeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'attendance_record_id' => ['required', 'integer'],
            'extra_hours' => ['required', 'numeric', 'between:0.01,4.00'],
            'justification' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'attendance_record_id.required' => 'El registro de asistencia es obligatorio',
            'attendance_record_id.integer' => 'El registro de asistencia debe ser un identificador válido',
            'extra_hours.required' => 'Las horas extra son obligatorias',
            'extra_hours.numeric' => 'Las horas extra deben ser un número válido',
            'extra_hours.between' => 'Las horas extra deben estar entre 0.01 y 4.00',
            'justification.required' => 'La justificación es obligatoria',
            'justification.string' => 'La justificación debe ser texto',
        ];
    }
}
