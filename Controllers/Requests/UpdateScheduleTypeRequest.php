<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateScheduleTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $scheduleTypeId = $this->route('id');

        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('schedule_types')->where(function ($query) {
                    return $query->where('is_active', true);
                })->ignore($scheduleTypeId),
            ],
            'expected_start_time' => ['sometimes', 'required', 'date_format:H:i'],
            'expected_end_time' => ['sometimes', 'required', 'date_format:H:i', 'after:expected_start_time'],
            'tolerance_minutes' => ['sometimes', 'integer', 'min:0', 'max:1440'],
            'auto_fill_salida' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio',
            'name.string' => 'El nombre debe ser texto',
            'name.max' => 'El nombre no puede exceder 100 caracteres',
            'name.unique' => 'Ya existe un tipo de jornada activo con este nombre',
            'expected_start_time.required' => 'La hora de inicio es obligatoria',
            'expected_start_time.date_format' => 'La hora de inicio debe tener formato HH:MM',
            'expected_end_time.required' => 'La hora de fin es obligatoria',
            'expected_end_time.date_format' => 'La hora de fin debe tener formato HH:MM',
            'expected_end_time.after' => 'La hora de fin debe ser posterior a la hora de inicio',
            'tolerance_minutes.integer' => 'La tolerancia debe ser un número entero',
            'tolerance_minutes.min' => 'La tolerancia no puede ser negativa',
            'auto_fill_salida.boolean' => 'El campo auto-fill salida debe ser verdadero o falso',
            'is_active.boolean' => 'El campo activo debe ser verdadero o falso',
        ];
    }
}
