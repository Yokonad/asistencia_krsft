<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectOvertimeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rejection_reason' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'El motivo de rechazo es obligatorio',
            'rejection_reason.string' => 'El motivo de rechazo debe ser texto',
        ];
    }
}
