<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Modulos_ERP\AsistenciaKrsft\Models\Asistencia;

class AsistenciaController extends Controller
{
    protected string $asistenciaTable = 'asistencias';

    public function index()
    {
        return Inertia::render('asistenciakrsft/Index');
    }

    public function list(Request $request)
    {
        $query = Asistencia::query();

        if ($request->has('search') && $request->search) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('asistencias.trabajador_nombre', 'like', $search)
                    ->orWhere('asistencias.dni', 'like', $search)
                    ->orWhere('asistencias.area', 'like', $search);
            });
        }

        if ($request->has('sort_by')) {
            $direction = $request->get('sort_direction', 'asc');
            $query->orderBy('asistencias.' . $request->sort_by, $direction);
        } else {
            $query->orderBy('asistencias.fecha', 'desc');
        }

        $asistencias = $query->get();

        return response()->json([
            'success' => true,
            'data' => $asistencias,
            'total' => $asistencias->count(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'trabajador_nombre' => 'required|string|max:255',
            'dni' => 'nullable|string|max:20',
            'area' => 'nullable|string|max:255',
            'fecha' => 'required|date',
            'hora_entrada' => 'nullable|date_format:H:i',
            'hora_salida' => 'nullable|date_format:H:i',
            'estado' => 'boolean',
            'observaciones' => 'nullable|string',
        ]);

        $id = DB::table($this->asistenciaTable)->insertGetId([
            'trabajador_nombre' => $validated['trabajador_nombre'],
            'dni' => $validated['dni'] ?? null,
            'area' => $validated['area'] ?? null,
            'fecha' => $validated['fecha'],
            'hora_entrada' => $validated['hora_entrada'] ?? null,
            'hora_salida' => $validated['hora_salida'] ?? null,
            'estado' => $validated['estado'] ?? true,
            'observaciones' => $validated['observaciones'] ?? null,
            'created_by_user_id' => $request->user()->id ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registro de asistencia creado exitosamente',
            'data' => DB::table($this->asistenciaTable)->find($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'trabajador_nombre' => 'required|string|max:255',
            'dni' => 'nullable|string|max:20',
            'area' => 'nullable|string|max:255',
            'fecha' => 'required|date',
            'hora_entrada' => 'nullable|date_format:H:i',
            'hora_salida' => 'nullable|date_format:H:i',
            'estado' => 'boolean',
            'observaciones' => 'nullable|string',
        ]);

        DB::table($this->asistenciaTable)->where('id', $id)->update([
            'trabajador_nombre' => $validated['trabajador_nombre'],
            'dni' => $validated['dni'] ?? null,
            'area' => $validated['area'] ?? null,
            'fecha' => $validated['fecha'],
            'hora_entrada' => $validated['hora_entrada'] ?? null,
            'hora_salida' => $validated['hora_salida'] ?? null,
            'estado' => $validated['estado'] ?? true,
            'observaciones' => $validated['observaciones'] ?? null,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Registro de asistencia actualizado exitosamente',
            'data' => DB::table($this->asistenciaTable)->find($id),
        ]);
    }

    public function destroy($id)
    {
        $asistencia = Asistencia::find($id);

        if (!$asistencia) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de asistencia no encontrado',
            ], 404);
        }

        $asistencia->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro de asistencia eliminado exitosamente',
        ]);
    }

    public function show($id)
    {
        $asistencia = Asistencia::find($id);

        if (!$asistencia) {
            return response()->json([
                'success' => false,
                'message' => 'Registro de asistencia no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $asistencia,
        ]);
    }
}
