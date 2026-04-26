<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\LogKrsftService;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AsistenciaController extends Controller
{
    /**
     * Conexión a la BD de asistencia (eje_erp en producción, local en dev).
     */
    private function attendanceDB(string $table = 'attendance_records')
    {
        return DB::connection('attendance')->table($table);
    }

    public function index()
    {
        return Inertia::render('asistenciakrsft/Index');
    }

    public function lookupWorkerByDni(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
        ]);

        $worker = DB::table('trabajadores')
            ->select([
                'id',
                'dni',
                'nombre_completo',
                'nombres',
                'apellido_paterno',
                'apellido_materno',
                'cargo',
                'estado',
            ])
            ->where('dni', $validated['dni'])
            ->first();

        if (! $worker) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'worker' => $worker,
        ]);
    }

    public function captureExternalAttendance(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'photo' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:4096'],
        ]);

        $worker = DB::table('trabajadores')
            ->select([
                'id',
                'dni',
                'nombre_completo',
                'nombres',
                'apellido_paterno',
                'apellido_materno',
                'cargo',
                'estado',
            ])
            ->where('dni', $validated['dni'])
            ->first();

        if (! $worker) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        if (($worker->estado ?? null) !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El trabajador no se encuentra activo',
            ], 422);
        }

        $photo = $request->file('photo');
        $extension = $photo->guessExtension() ?: $photo->extension() ?: 'jpg';
        $extension = $extension === 'jpeg' ? 'jpg' : $extension;
        $filename = 'attendance-' . now()->valueOf() . '-' . random_int(100000000, 999999999) . '.' . $extension;
        $photoPath = $photo->storeAs('uploads', $filename, 'public');
        $capturedAt = now();

        $latestTodayRecord = $this->attendanceDB()
            ->where('trabajador_id', $worker->id)
            ->whereDate('captured_at', $capturedAt->toDateString())
            ->orderByDesc('captured_at')
            ->first();

        if ($latestTodayRecord && !empty($latestTodayRecord->check_out_at)) {
            return response()->json([
                'success' => false,
                'message' => 'Ya registraste entrada y salida el día de hoy',
            ], 409);
        }

        if ($latestTodayRecord && empty($latestTodayRecord->check_out_at)) {
            $checkOutAt = now();
            $entryAt = Carbon::parse($latestTodayRecord->captured_at);
            $workedMinutes = max($entryAt->diffInMinutes($checkOutAt, false), 0);

            $this->attendanceDB()->where('id', $latestTodayRecord->id)->update([
                'check_out_at' => $checkOutAt,
                'check_out_latitude' => $validated['latitude'],
                'check_out_longitude' => $validated['longitude'],
                'check_out_accuracy_meters' => $validated['accuracy'] ?? null,
                'check_out_photo_path' => $photoPath,
                'worked_minutes' => $workedMinutes,
            ]);

            LogKrsftService::log(
                module: 'asistenciakrsft',
                action: 'salida_registrada',
                message: "Salida registrada para empleado ID {$worker->id}",
                level: 'info',
                userId: auth()->id(),
                userName: auth()->user()->name,
                extra: ['employee_id' => $worker->id, 'fecha' => now(), 'worked_minutes' => $workedMinutes]
            );

            return response()->json([
                'success' => true,
                'action' => 'check-out',
                'message' => 'Salida registrada correctamente',
                'summary' => [
                    'worked_minutes' => $workedMinutes,
                    'worked_time' => $this->formatWorkedTime($workedMinutes),
                    'check_out_at' => $checkOutAt,
                ],
                'data' => $this->attendanceDB()->find($latestTodayRecord->id),
            ]);
        }

        $recordId = $this->attendanceDB()->insertGetId([
            'trabajador_id' => $worker->id,
            'dni' => $worker->dni,
            'worker_name' => $this->resolveWorkerName($worker),
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'accuracy_meters' => $validated['accuracy'] ?? null,
            'photo_path' => $photoPath,
            'device_type' => $this->resolveDeviceType($request->userAgent()),
            'captured_at' => $capturedAt,
            'created_at' => $capturedAt,
            'check_out_at' => null,
            'check_out_latitude' => null,
            'check_out_longitude' => null,
            'check_out_accuracy_meters' => null,
            'check_out_photo_path' => null,
            'worked_minutes' => null,
        ]);

        LogKrsftService::log(
            module: 'asistenciakrsft',
            action: 'entrada_registrada',
            message: "Entrada registrada para empleado ID {$worker->id}",
            level: 'info',
            userId: auth()->id(),
            userName: auth()->user()->name,
            extra: ['employee_id' => $worker->id, 'fecha' => now()]
        );

        return response()->json([
            'success' => true,
            'action' => 'check-in',
            'message' => 'Entrada registrada correctamente',
            'data' => $this->attendanceDB()->find($recordId),
        ], 201);
    }

    /**
     * Lista registros de attendance_records cruzados con trabajadores (por DNI).
     * Acepta filtros: ?fecha=YYYY-MM-DD, ?search=texto, ?mes=YYYY-MM
     */
    public function list(Request $request)
    {
        $query = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->select([
                'ar.id',
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                't.estado as trabajador_estado',
                'ar.latitude',
                'ar.longitude',
                'ar.accuracy_meters',
                'ar.photo_path',
                'ar.check_out_photo_path',
                'ar.device_type',
                'ar.captured_at',
                'ar.check_out_at',
                'ar.worked_minutes',
                'ar.created_at',
                // Derive fecha and hora from captured_at
                DB::raw("DATE(ar.captured_at) as fecha"),
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
                DB::raw("TIME_FORMAT(ar.check_out_at, '%H:%i') as hora_salida"),
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes_calc"),
            ]);

        // Filter by date range
        if ($request->filled('fecha_desde')) {
            $query->whereDate('ar.captured_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('ar.captured_at', '<=', $request->fecha_hasta);
        }

        // Filter by specific date (legacy)
        if ($request->filled('fecha')) {
            $query->whereDate('ar.captured_at', $request->fecha);
        }

        // Filter by month (YYYY-MM) (legacy)
        if ($request->filled('mes')) {
            $query->where(DB::raw("DATE_FORMAT(ar.captured_at, '%Y-%m')"), $request->mes);
        }

        // Search by name or DNI
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('ar.worker_name', 'like', $search)
                  ->orWhere('ar.dni', 'like', $search)
                  ->orWhere('t.cargo', 'like', $search);
            });
        }

        $query->orderBy('ar.captured_at', 'desc');

        $records = $query->get()->map(function ($row) {
            $minutes = $row->worked_minutes_calc ?? $row->worked_minutes;
            $minutes = is_numeric($minutes) ? (int) $minutes : null;

            $capturedAtLima = !empty($row->captured_at)
                ? Carbon::parse($row->captured_at)->timezone('America/Lima')
                : null;

            $checkOutAtLima = !empty($row->check_out_at)
                ? Carbon::parse($row->check_out_at)->timezone('America/Lima')
                : null;

            $row->fecha = $capturedAtLima?->toDateString() ?? $row->fecha;
            $row->hora_entrada = $capturedAtLima?->format('H:i') ?? $row->hora_entrada;
            $row->hora_salida = $checkOutAtLima?->format('H:i') ?? $row->hora_salida;
            $row->worked_minutes = $minutes;
            $row->worked_time = $this->formatWorkedTime($minutes);

            // Schedule type resolution for expected_salida indicator
            $row->expected_salida = null;
            $row->salida_missing = empty($row->check_out_at);
            $row->is_salida_auto_calculated = false;

            if ($row->salida_missing && $row->trabajador_id && $row->fecha) {
                $assignment = DB::connection('attendance')
                    ->table('worker_schedule_types as wst')
                    ->join('schedule_types as st', 'st.id', '=', 'wst.schedule_type_id')
                    ->where('wst.worker_id', $row->trabajador_id)
                    ->where('wst.effective_from', '<=', $row->fecha)
                    ->where('st.is_active', true)
                    ->orderByDesc('wst.effective_from')
                    ->select('st.expected_end_time', 'st.auto_fill_salida')
                    ->first();

                if ($assignment) {
                    $row->expected_salida = $assignment->expected_end_time;
                    $row->is_salida_auto_calculated = !empty($assignment->auto_fill_salida);
                }
            }

            return $row;
        });

        return response()->json([
            'success' => true,
            'data' => $records,
            'total' => $records->count(),
        ]);
    }

    public function exportXlsx(Request $request)
    {
        $periodoInput = (string) $request->input('periodo', 'dia');
        $periodo = Str::lower(Str::ascii(trim($periodoInput)));
        $fechaBase = $request->input('fecha') ?: now('America/Lima')->toDateString();

        $fechaDesde = $request->input('fecha_desde');
        $fechaHasta = $request->input('fecha_hasta');

        if (empty($fechaDesde) || empty($fechaHasta)) {
            $base = Carbon::parse($fechaBase)->timezone('America/Lima');

            if (in_array($periodo, ['semana', 'weekly', 'week'], true)) {
                $fechaDesde = $base->copy()->startOfWeek(Carbon::MONDAY)->toDateString();
                $fechaHasta = $base->copy()->endOfWeek(Carbon::SUNDAY)->toDateString();
                $periodo = 'semana';
            } elseif (in_array($periodo, ['mes', 'monthly', 'month'], true)) {
                $fechaDesde = $base->copy()->startOfMonth()->toDateString();
                $fechaHasta = $base->copy()->endOfMonth()->toDateString();
                $periodo = 'mes';
            } else {
                $fechaDesde = $base->toDateString();
                $fechaHasta = $base->toDateString();
                $periodo = 'dia';
            }
        }

        $query = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->select([
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes"),
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                'ar.photo_path',
                'ar.captured_at',
                'ar.check_out_at',
            ]);

        $query->whereDate('ar.captured_at', '>=', $fechaDesde);
        $query->whereDate('ar.captured_at', '<=', $fechaHasta);

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('ar.worker_name', 'like', $search)
                    ->orWhere('ar.dni', 'like', $search)
                    ->orWhere('t.cargo', 'like', $search);
            });
        }

        if ($request->filled('origin')) {
            if ($request->origin === 'Registro manual') {
                $query->where('ar.photo_path', 'manual-entry');
            } elseif ($request->origin === 'Captura app') {
                $query->where(function ($q) {
                    $q->whereNull('ar.photo_path')
                        ->orWhere('ar.photo_path', '!=', 'manual-entry');
                });
            }
        }

        $records = $query
            ->orderBy('ar.captured_at', 'desc')
            ->get()
            ->map(function ($record) {
                $capturedAtLima = !empty($record->captured_at)
                    ? Carbon::parse($record->captured_at)->timezone('America/Lima')
                    : null;

                $checkOutAtLima = !empty($record->check_out_at)
                    ? Carbon::parse($record->check_out_at)->timezone('America/Lima')
                    : null;

                $record->captured_at_lima = $capturedAtLima;
                $record->check_out_at_lima = $checkOutAtLima;
                $record->fecha_lima = $capturedAtLima?->toDateString();
                $record->hora_entrada_lima = $capturedAtLima?->format('H:i');
                $record->hora_salida_lima = $checkOutAtLima?->format('H:i');
                $record->worked_minutes = is_numeric($record->worked_minutes) ? (int) $record->worked_minutes : 0;

                return $record;
            });

        $resumenTrabajadores = $records
            ->groupBy(function ($row) {
                $keyId = $row->trabajador_id ?? ('dni_' . ($row->dni ?? 'sin_dni'));
                return $keyId . '|' . ($row->dni ?? '') . '|' . ($row->trabajador_nombre ?? 'SIN NOMBRE');
            })
            ->map(function ($rows) {
                $first = $rows->first();

                $totalMinutes = $rows->sum(function ($r) {
                    return is_numeric($r->worked_minutes) ? (int) $r->worked_minutes : 0;
                });

                $diasConRegistro = $rows
                    ->pluck('fecha_lima')
                    ->filter()
                    ->unique()
                    ->count();

                $primeraEntrada = $rows
                    ->pluck('captured_at_lima')
                    ->filter()
                    ->sortBy(fn ($date) => $date->getTimestamp())
                    ->first();

                $ultimaSalida = $rows
                    ->pluck('check_out_at_lima')
                    ->filter()
                    ->sortByDesc(fn ($date) => $date->getTimestamp())
                    ->first();

                $origenes = $rows
                    ->map(fn ($r) => ($r->photo_path ?? null) === 'manual-entry' ? 'Registro manual' : 'Captura app')
                    ->unique()
                    ->values();

                return [
                    'dni' => $first->dni ?? '',
                    'trabajador_nombre' => $first->trabajador_nombre ?? 'SIN NOMBRE',
                    'cargo' => $first->cargo ?? 'Sin cargo',
                    'dias_con_registro' => $diasConRegistro,
                    'primera_entrada' => $primeraEntrada ? $primeraEntrada->format('d/m/Y H:i') : '—',
                    'ultima_salida' => $ultimaSalida ? $ultimaSalida->format('d/m/Y H:i') : '—',
                    'horas_totales' => $this->formatWorkedTime($totalMinutes) ?? '00:00',
                    'total_registros' => $rows->count(),
                    'origen' => $origenes->count() > 1 ? 'Mixto' : ($origenes->first() ?? 'Captura app'),
                ];
            })
            ->sortBy('trabajador_nombre', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Asistencias');

        $periodoLabel = $periodo === 'semana' ? 'Semanal' : ($periodo === 'mes' ? 'Mensual' : 'Diario');
        $generadoEn = now('America/Lima')->format('d/m/Y H:i');

        $sheet->mergeCells('A1:I1');
        $sheet->setCellValue('A1', 'REPORTE DE ASISTENCIAS');

        $sheet->mergeCells('A2:I2');
        $sheet->setCellValue('A2', "Tipo: {$periodoLabel} | Período: {$fechaDesde} a {$fechaHasta} | Generado (PE): {$generadoEn}");

        $headers = ['DNI', 'Trabajador', 'Cargo', 'Días con registro', 'Primera entrada (PE)', 'Última salida (PE)', 'Horas totales', 'Registros', 'Origen'];
        $headerRow = 4;
        foreach ($headers as $index => $header) {
            $column = chr(65 + $index);
            $sheet->setCellValue($column . $headerRow, $header);
        }

        $row = 5;
        foreach ($resumenTrabajadores as $record) {
            $sheet->setCellValue('A' . $row, (string) ($record['dni'] ?? ''));
            $sheet->setCellValue('B' . $row, (string) ($record['trabajador_nombre'] ?? ''));
            $sheet->setCellValue('C' . $row, (string) ($record['cargo'] ?? 'Sin cargo'));
            $sheet->setCellValue('D' . $row, (int) ($record['dias_con_registro'] ?? 0));
            $sheet->setCellValue('E' . $row, (string) ($record['primera_entrada'] ?? '—'));
            $sheet->setCellValue('F' . $row, (string) ($record['ultima_salida'] ?? '—'));
            $sheet->setCellValue('G' . $row, (string) ($record['horas_totales'] ?? '00:00'));
            $sheet->setCellValue('H' . $row, (int) ($record['total_registros'] ?? 0));
            $sheet->setCellValue('I' . $row, (string) ($record['origen'] ?? 'Captura app'));
            $row++;
        }

        $lastDataRow = max($row - 1, $headerRow);

        $sheet->getStyle('A1:I1')->applyFromArray([
            'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0AA4A4']],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $sheet->getStyle('A2:I2')->applyFromArray([
            'font' => ['bold' => false, 'size' => 10, 'color' => ['rgb' => '334155']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ECFEFF']],
        ]);
        $sheet->getRowDimension(2)->setRowHeight(20);

        $sheet->getStyle('A4:I4')->applyFromArray([
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'E2E8F0'],
                ],
            ],
        ]);
        $sheet->getRowDimension(4)->setRowHeight(22);

        if ($lastDataRow >= 5) {
            $sheet->getStyle("A5:I{$lastDataRow}")->applyFromArray([
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ]);

            for ($line = 5; $line <= $lastDataRow; $line++) {
                if ($line % 2 === 0) {
                    $sheet->getStyle("A{$line}:I{$line}")->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'F8FAFC'],
                        ],
                    ]);
                }
            }
        }

        foreach (range('A', 'I') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $sheet->getStyle('A:I')->getAlignment()->setWrapText(false);
        $sheet->freezePane('A5');
        $sheet->setAutoFilter("A4:I{$lastDataRow}");

        $writer = new Xlsx($spreadsheet);
        $filename = 'asistencias_' . now()->format('Ymd_His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Devuelve las asistencias registradas hoy para la vista HOY.
     */
    public function hoy(Request $request)
    {
        $today = now()->toDateString();

        $todayRecords = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->whereDate('ar.captured_at', $today)
            ->select([
                'ar.id',
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                't.estado as trabajador_estado',
                'ar.latitude',
                'ar.longitude',
                'ar.accuracy_meters',
                'ar.photo_path',
                'ar.check_out_photo_path',
                'ar.device_type',
                'ar.captured_at',
                'ar.check_out_at',
                'ar.worked_minutes',
                DB::raw("DATE(ar.captured_at) as fecha"),
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
                DB::raw("TIME_FORMAT(ar.check_out_at, '%H:%i') as hora_salida"),
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes_calc"),
            ])
            ->orderBy('ar.captured_at', 'desc')
            ->get()
            ->unique('trabajador_id')
            ->values()
            ->map(function ($row) {
                $minutes = $row->worked_minutes_calc ?? $row->worked_minutes;
                $minutes = is_numeric($minutes) ? (int) $minutes : null;

                $capturedAtLima = !empty($row->captured_at)
                    ? Carbon::parse($row->captured_at)->timezone('America/Lima')
                    : null;

                $checkOutAtLima = !empty($row->check_out_at)
                    ? Carbon::parse($row->check_out_at)->timezone('America/Lima')
                    : null;

                $row->fecha = $capturedAtLima?->toDateString() ?? $row->fecha;
                $row->hora_entrada = $capturedAtLima?->format('H:i') ?? $row->hora_entrada;
                $row->hora_salida = $checkOutAtLima?->format('H:i') ?? $row->hora_salida;
                $row->worked_minutes = $minutes;
                $row->worked_time = $this->formatWorkedTime($minutes);

                // Schedule type resolution for expected_salida indicator
                $row->expected_salida = null;
                $row->salida_missing = empty($row->check_out_at);
                $row->is_salida_auto_calculated = false;

                if ($row->salida_missing && $row->trabajador_id && $row->fecha) {
                    $assignment = DB::connection('attendance')
                        ->table('worker_schedule_types as wst')
                        ->join('schedule_types as st', 'st.id', '=', 'wst.schedule_type_id')
                        ->where('wst.worker_id', $row->trabajador_id)
                        ->where('wst.effective_from', '<=', $row->fecha)
                        ->where('st.is_active', true)
                        ->orderByDesc('wst.effective_from')
                        ->select('st.expected_end_time', 'st.auto_fill_salida')
                        ->first();

                    if ($assignment) {
                        $row->expected_salida = $assignment->expected_end_time;
                        $row->is_salida_auto_calculated = !empty($assignment->auto_fill_salida);
                    }
                }

                return $row;
            });

        $totalTrabajadores = DB::table('trabajadores')
            ->where('estado', 'Activo')
            ->count();
        $totalPresentes = $todayRecords->count();

        return response()->json([
            'success' => true,
            'data' => $todayRecords,
            'total_registros' => $totalPresentes,
            'total_trabajadores' => $totalTrabajadores,
            'total_presentes' => $totalPresentes,
            'total_ausentes' => max($totalTrabajadores - $totalPresentes, 0),
            'total_jornadas_completas' => $todayRecords->whereNotNull('hora_salida')->count(),
            'total_en_jornada' => $todayRecords->whereNull('hora_salida')->count(),
        ]);
    }

    /**
     * Devuelve resumen por día para el calendario de asistencias.
     */
    public function resumenDia(Request $request)
    {
        $validated = $request->validate([
            'fecha' => ['required', 'date'],
        ]);

        $fecha = Carbon::parse($validated['fecha'])->toDateString();

        $records = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->whereDate('ar.captured_at', $fecha)
            ->select([
                'ar.id',
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                'ar.captured_at',
                'ar.check_out_at',
                'ar.worked_minutes',
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
                DB::raw("TIME_FORMAT(ar.check_out_at, '%H:%i') as hora_salida"),
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes_calc"),
            ])
            ->orderBy('ar.captured_at', 'desc')
            ->get()
            ->unique('trabajador_id')
            ->values()
            ->map(function ($row) {
                $minutes = $row->worked_minutes_calc ?? $row->worked_minutes;
                $minutes = is_numeric($minutes) ? (int) $minutes : null;

                $capturedAtLima = !empty($row->captured_at)
                    ? Carbon::parse($row->captured_at)->timezone('America/Lima')
                    : null;

                $checkOutAtLima = !empty($row->check_out_at)
                    ? Carbon::parse($row->check_out_at)->timezone('America/Lima')
                    : null;

                $row->hora_entrada = $capturedAtLima?->format('H:i') ?? $row->hora_entrada;
                $row->hora_salida = $checkOutAtLima?->format('H:i') ?? $row->hora_salida;
                $row->worked_minutes = $minutes;
                $row->worked_time = $this->formatWorkedTime($minutes);
                return $row;
            });

        $totalTrabajadores = DB::table('trabajadores')
            ->where('estado', 'Activo')
            ->count();

        $totalPresentes = $records->count();

        return response()->json([
            'success' => true,
            'fecha' => $fecha,
            'total_trabajadores' => $totalTrabajadores,
            'total_presentes' => $totalPresentes,
            'total_ausentes' => max($totalTrabajadores - $totalPresentes, 0),
            'trabajadores' => $records,
        ]);
    }

    public function show($id)
    {
        $record = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->select([
                'ar.*',
                't.cargo',
                't.estado as trabajador_estado',
                't.nombre_completo',
            ])
            ->where('ar.id', $id)
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $record]);
    }

    /**
     * Entrega la foto asociada a un registro de attendance_records.
     */
    public function photo($id)
    {
        $record = $this->attendanceDB()
            ->select(['id', 'photo_path'])
            ->where('id', $id)
            ->first();

        if (! $record || empty($record->photo_path) || $record->photo_path === 'manual-entry') {
            return response()->json([
                'success' => false,
                'message' => 'Registro sin foto disponible',
            ], 404);
        }

        $relativePath = ltrim((string) $record->photo_path, '/');
        $fileName = basename($relativePath);

        $candidates = [
            storage_path('app/public/' . $relativePath),
            public_path($relativePath),
            base_path('../asistencia-app/' . $relativePath),
            '/var/www/asistencia-app/' . $relativePath,
            '/var/www/asistencia-app/uploads/' . $fileName,
        ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                return response()->file($path, [
                    'Cache-Control' => 'public, max-age=300',
                ]);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Archivo de foto no encontrado',
            'photo_path' => $relativePath,
        ], 404);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
            'fecha' => ['nullable', 'date'],
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'hora_salida' => ['nullable', 'date_format:H:i'],
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'accuracy_meters' => 'nullable|numeric',
        ]);

        // Lookup the worker by DNI
        $trabajador = DB::table('trabajadores')->where('dni', $validated['dni'])->first();

        if (!$trabajador) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador con DNI ' . $validated['dni'] . ' no encontrado',
            ], 404);
        }

        if (($trabajador->estado ?? null) !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El trabajador no se encuentra activo',
            ], 422);
        }

        $capturedAt = $this->resolveCapturedAt($validated);
        $checkOutAt = $this->resolveCheckOutAt($validated, null, $capturedAt);

        if ($checkOutAt && $checkOutAt->lt($capturedAt)) {
            return response()->json([
                'success' => false,
                'message' => 'La hora de salida no puede ser menor a la hora de entrada',
            ], 422);
        }

        $workedMinutes = $checkOutAt ? max($capturedAt->diffInMinutes($checkOutAt, false), 0) : null;

        $id = $this->attendanceDB()->insertGetId([
            'trabajador_id' => $trabajador->id,
            'dni' => $trabajador->dni,
            'worker_name' => $this->resolveWorkerName($trabajador),
            'latitude' => $validated['latitude'] ?? 0,
            'longitude' => $validated['longitude'] ?? 0,
            'accuracy_meters' => $validated['accuracy_meters'] ?? null,
            'photo_path' => 'manual-entry',
            'device_type' => 'desktop',
            'captured_at' => $capturedAt,
            'check_out_at' => $checkOutAt,
            'check_out_latitude' => null,
            'check_out_longitude' => null,
            'check_out_accuracy_meters' => null,
            'check_out_photo_path' => null,
            'worked_minutes' => $workedMinutes,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Asistencia registrada para ' . $trabajador->nombre_completo,
            'data' => $this->attendanceDB()->find($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $record = $this->attendanceDB()->find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        $validated = $request->validate([
            'dni' => ['nullable', 'regex:/^\d{8}$/'],
            'fecha' => ['nullable', 'date'],
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'hora_salida' => ['nullable', 'date_format:H:i'],
            'captured_at' => ['nullable', 'date'],
        ]);

        $data = [];

        if (! empty($validated['dni'])) {
            $trabajador = DB::table('trabajadores')->where('dni', $validated['dni'])->first();

            if (! $trabajador) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trabajador con DNI ' . $validated['dni'] . ' no encontrado',
                ], 404);
            }

            if (($trabajador->estado ?? null) !== 'Activo') {
                return response()->json([
                    'success' => false,
                    'message' => 'El trabajador no se encuentra activo',
                ], 422);
            }

            $data['trabajador_id'] = $trabajador->id;
            $data['dni'] = $trabajador->dni;
            $data['worker_name'] = $this->resolveWorkerName($trabajador);
        }

        if (
            ! empty($validated['captured_at'])
            || ! empty($validated['fecha'])
            || array_key_exists('hora_entrada', $validated)
        ) {
            $data['captured_at'] = $this->resolveCapturedAt($validated, Carbon::parse($record->captured_at));
        }

        if (
            array_key_exists('hora_salida', $validated)
            || !empty($validated['fecha'])
        ) {
            $resolvedEntry = !empty($data['captured_at'])
                ? Carbon::parse($data['captured_at'])
                : Carbon::parse($record->captured_at);

            $resolvedCheckOut = $this->resolveCheckOutAt(
                $validated,
                !empty($record->check_out_at) ? Carbon::parse($record->check_out_at) : null,
                $resolvedEntry
            );

            if ($resolvedCheckOut && $resolvedCheckOut->lt($resolvedEntry)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La hora de salida no puede ser menor a la hora de entrada',
                ], 422);
            }

            $data['check_out_at'] = $resolvedCheckOut;
            $data['worked_minutes'] = $resolvedCheckOut
                ? max($resolvedEntry->diffInMinutes($resolvedCheckOut, false), 0)
                : null;
        }

        if (!empty($data)) {
            $oldRecord = $this->attendanceDB()->find($id);
            $oldEntry = $oldRecord->captured_at;
            $oldExit = $oldRecord->check_out_at;

            $this->attendanceDB()->where('id', $id)->update($data);

            $newRecord = $this->attendanceDB()->find($id);
            $newEntry = $newRecord->captured_at;
            $newExit = $newRecord->check_out_at;

            LogKrsftService::log(
                module: 'asistenciakrsft',
                action: 'asistencia_editada',
                message: "Asistencia editada para empleado ID {$newRecord->trabajador_id}",
                level: 'info',
                userId: auth()->id(),
                userName: auth()->user()->name,
                extra: [
                    'employee_id' => $newRecord->trabajador_id,
                    'before' => ['hora_entrada' => $oldEntry, 'hora_salida' => $oldExit],
                    'after' => ['hora_entrada' => $newEntry, 'hora_salida' => $newExit]
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Registro actualizado exitosamente',
            'data' => $this->attendanceDB()->find($id),
        ]);
    }

    public function destroy($id)
    {
        $record = $this->attendanceDB()->find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        $this->attendanceDB()->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro eliminado exitosamente',
        ]);
    }

    /**
     * Devuelve proyectos activos con sus trabajadores asignados y estadísticas de asistencia.
     */
    /**
     * Counts rápidos para badges de tabs
     */
    /**
     * Returns monthly attendance summary for a specific worker with expected minutes.
     * Used for calendar color indicators.
     */
    public function workerAttendanceSummary(Request $request)
    {
        $validated = $request->validate([
            'worker_id' => ['required', 'integer'],
            'month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $workerId = (int) $validated['worker_id'];
        $month = $validated['month']; // YYYY-MM format

        // Parse month boundaries
        $year = (int) substr($month, 0, 4);
        $monthNum = (int) substr($month, 5, 2);
        $startDate = sprintf('%04d-%02d-01', $year, $monthNum);
        $endDate = date('Y-m-t', strtotime($startDate));

        // Fetch all attendance records for this worker in the month
        $records = $this->attendanceDB('attendance_records as ar')
            ->where('ar.trabajador_id', $workerId)
            ->whereDate('ar.captured_at', '>=', $startDate)
            ->whereDate('ar.captured_at', '<=', $endDate)
            ->select([
                DB::raw("DATE(ar.captured_at) as date"),
                DB::raw("SUM(COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE 0 END)) as worked_minutes"),
            ])
            ->groupBy(DB::raw("DATE(ar.captured_at)"))
            ->get()
            ->keyBy('date');

        // Build a map of date => worked_minutes
        $workedByDate = $records->mapWithKeys(fn($r) => [$r->date => (int) $r->worked_minutes])->toArray();

        // For each day in the month, determine expected minutes from schedule type
        $result = [];
        $current = strtotime($startDate);
        $end = strtotime($endDate);

        while ($current <= $end) {
            $date = date('Y-m-d', $current);
            $dayOfWeek = (int) date('N', $current); // 1=Mon, 7=Sun

            $hasRecord = isset($workedByDate[$date]);
            $workedMinutes = $workedByDate[$date] ?? 0;

            // Resolve schedule type for this worker on this date
            $expectedMinutes = null;
            $scheduleTypeName = null;

            $assignment = DB::connection('attendance')
                ->table('worker_schedule_types as wst')
                ->join('schedule_types as st', 'st.id', '=', 'wst.schedule_type_id')
                ->where('wst.worker_id', $workerId)
                ->where('wst.effective_from', '<=', $date)
                ->where('st.is_active', true)
                ->orderByDesc('wst.effective_from')
                ->select('st.name', 'st.expected_start_time', 'st.expected_end_time')
                ->first();

            if ($assignment && $assignment->expected_start_time && $assignment->expected_end_time) {
                $scheduleTypeName = $assignment->name;
                $startParts = explode(':', $assignment->expected_start_time);
                $endParts = explode(':', $assignment->expected_end_time);
                $startMinutes = ((int) $startParts[0]) * 60 + ((int) $startParts[1]);
                $endMinutes = ((int) $endParts[0]) * 60 + ((int) $endParts[1]);
                $expectedMinutes = max(0, $endMinutes - $startMinutes);
            }

            $result[] = [
                'date' => $date,
                'worked_minutes' => $workedMinutes,
                'has_record' => $hasRecord,
                'schedule_type_name' => $scheduleTypeName,
                'expected_minutes' => $hasRecord ? ($expectedMinutes ?? 480) : null, // 8h default if worked but no schedule
            ];

            $current = strtotime('+1 day', $current);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'worker_id' => $workerId,
            'month' => $month,
        ]);
    }

    /**
     * Returns a monthly summary for ALL workers.
     */
    public function generalMonthlySummary(Request $request)
    {
        $validated = $request->validate([
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'min:2000'],
        ]);

        $month = str_pad($validated['month'], 2, '0', STR_PAD_LEFT);
        $year = $validated['year'];

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth()->toDateString();
        $endDate = Carbon::createFromDate($year, $month, 1)->endOfMonth()->toDateString();

        // 1. Get all active workers
        $workers = DB::table('trabajadores')
            ->where('estado', 'Activo')
            ->select('id', 'dni', 'nombre_completo', 'cargo')
            ->get();

        // 2. Get all attendance records in the month
        $records = $this->attendanceDB('attendance_records as ar')
            ->select([
                'ar.trabajador_id',
                DB::raw("DATE(ar.captured_at) as date"),
                DB::raw("SUM(COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE 0 END)) as worked_minutes"),
            ])
            ->whereBetween(DB::raw("DATE(ar.captured_at)"), [$startDate, $endDate])
            ->groupBy('ar.trabajador_id', DB::raw("DATE(ar.captured_at)"))
            ->get();

        // Group records by worker_id
        $recordsByWorker = $records->groupBy('trabajador_id');

        $result = [];

        foreach ($workers as $worker) {
            $workerRecords = $recordsByWorker->get($worker->id, collect());
            
            $diasAsistidos = $workerRecords->count();
            $totalWorkedMinutes = $workerRecords->sum('worked_minutes');

            $result[] = [
                'worker_id' => $worker->id,
                'dni' => $worker->dni,
                'nombre_completo' => $worker->nombre_completo,
                'cargo' => $worker->cargo,
                'dias_asistidos' => $diasAsistidos,
                'total_worked_minutes' => (int) $totalWorkedMinutes,
            ];
        }

        // Sort by name
        usort($result, function($a, $b) {
            return strcasecmp($a['nombre_completo'], $b['nombre_completo']);
        });

        return response()->json([
            'success' => true,
            'data' => $result,
            'month' => $month,
            'year' => $year,
        ]);
    }

    /**
     * Returns all attendance records for a specific date with worker info.
     * Used by the General calendar view day-click modal.
     */
    public function dayAttendance(Request $request)
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = $validated['date'];

        $records = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->whereDate('ar.captured_at', $date)
            ->select([
                'ar.id',
                'ar.trabajador_id',
                DB::raw("COALESCE(t.nombre_completo, ar.worker_name) as trabajador_nombre"),
                'ar.dni',
                't.cargo',
                'ar.captured_at',
                'ar.check_out_at',
                'ar.worked_minutes',
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
                DB::raw("TIME_FORMAT(ar.check_out_at, '%H:%i') as hora_salida"),
                DB::raw("COALESCE(ar.worked_minutes, CASE WHEN ar.check_out_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ar.captured_at, ar.check_out_at) ELSE NULL END) as worked_minutes_calc"),
            ])
            ->orderBy('ar.captured_at', 'asc')
            ->get()
            ->map(function ($row) {
                $minutes = $row->worked_minutes_calc ?? $row->worked_minutes;
                $minutes = is_numeric($minutes) ? (int) $minutes : null;

                $capturedAtLima = !empty($row->captured_at)
                    ? Carbon::parse($row->captured_at)->timezone('America/Lima')
                    : null;

                $checkOutAtLima = !empty($row->check_out_at)
                    ? Carbon::parse($row->check_out_at)->timezone('America/Lima')
                    : null;

                $row->hora_entrada = $capturedAtLima?->format('H:i') ?? $row->hora_entrada;
                $row->hora_salida = $checkOutAtLima?->format('H:i') ?? $row->hora_salida;
                $row->worked_minutes = $minutes;
                $row->worked_time = $this->formatWorkedTime($minutes);

                return $row;
            });

        return response()->json([
            'success' => true,
            'data' => $records,
            'date' => $date,
        ]);
    }

    public function counts()
    {
        $personas = DB::table('trabajadores')->where('estado', 'Activo')->count();

        $proyectosActivos = DB::table('projects')->where('status', 'active')->count();

        return response()->json([
            'personas' => $personas,
            'proyectos' => $proyectosActivos,
        ]);
    }

    public function proyectos(Request $request)
    {
        $today = now()->toDateString();

        // ── 1. Proyectos activos (iniciados desde el pipeline) ──
        $activeProjects = DB::table('projects')
            ->where('status', 'active')
            ->select(['id', 'name', 'abbreviation', 'status', 'created_at'])
            ->orderBy('name')
            ->get();

        $projectIds = $activeProjects->pluck('id');

        // ── 2. Trabajadores de proyectos activos (solo asignación directa del proyecto) ──
        $directAssignments = DB::table('project_workers as pw')
            ->join('trabajadores as t', 't.id', '=', 'pw.trabajador_id')
            ->whereIn('pw.project_id', $projectIds)
            ->select([
                'pw.project_id',
                't.id as trabajador_id',
                't.dni',
                't.nombre_completo',
                't.cargo',
                't.estado',
            ])
            ->orderBy('t.nombre_completo')
            ->get()
            ->groupBy('project_id');

        $projectAssignments = $projectIds->mapWithKeys(function ($projectId) use ($directAssignments) {
            $direct = $directAssignments->get($projectId, collect());
            $workers = $direct->unique('trabajador_id')->sortBy('nombre_completo')->values();
            return [$projectId => $workers];
        });

        // ── 3. Asistencias de hoy ──
        $allWorkerIds = $projectAssignments->flatten()->pluck('trabajador_id')->unique()->values();

        $todayAttendance = collect();
        if ($allWorkerIds->isNotEmpty()) {
            $todayAttendance = $this->attendanceDB()
                ->whereDate('captured_at', $today)
                ->whereIn('trabajador_id', $allWorkerIds)
                ->select(['trabajador_id', DB::raw("TIME_FORMAT(captured_at, '%H:%i') as hora_entrada")])
                ->get()
                ->keyBy('trabajador_id');
        }

        // ── 4. Construir respuesta ──
        $buildWorkerList = function ($workers) use ($todayAttendance) {
            $presentToday = 0;
            $list = $workers->map(function ($w) use ($todayAttendance, &$presentToday) {
                $attendance = $todayAttendance->get($w->trabajador_id);
                $present = $attendance !== null;
                if ($present) $presentToday++;
                return [
                    'trabajador_id' => $w->trabajador_id,
                    'dni' => $w->dni,
                    'nombre_completo' => $w->nombre_completo,
                    'cargo' => $w->cargo,
                    'presente_hoy' => $present,
                    'hora_entrada' => $attendance->hora_entrada ?? null,
                ];
            })->values();
            return [$list, $presentToday];
        };

        // Proyectos activos
        $data = $activeProjects->map(function ($project) use ($projectAssignments, $buildWorkerList) {
            $workers = $projectAssignments->get($project->id, collect());
            [$workerList, $presentToday] = $buildWorkerList($workers);
            return [
                'id' => 'project_' . $project->id,
                'name' => $project->name,
                'abbreviation' => $project->abbreviation ?? null,
                'status' => 'active',
                'etapa' => 'Proyecto Iniciado',
                'total_trabajadores' => $workers->count(),
                'presentes_hoy' => $presentToday,
                'ausentes_hoy' => $workers->count() - $presentToday,
                'trabajadores' => $workerList,
            ];
        });

        $allData = $data->values();

        return response()->json([
            'success' => true,
            'data' => $allData,
            'total_proyectos' => $allData->count(),
        ]);
    }

    private function resolveWorkerName(object $worker): string
    {
        if (! empty($worker->nombre_completo)) {
            return $worker->nombre_completo;
        }

        $parts = array_filter([
            $worker->apellido_paterno ?? null,
            $worker->apellido_materno ?? null,
            $worker->nombres ?? null,
        ]);

        return trim(implode(' ', $parts)) ?: (string) ($worker->dni ?? 'SIN NOMBRE');
    }

    private function resolveDeviceType(?string $userAgent): ?string
    {
        if (! $userAgent) {
            return null;
        }

        $normalized = Str::lower($userAgent);

        return preg_match('/android|iphone|ipad|ipod|mobile|windows phone/', $normalized)
            ? 'mobile'
            : 'desktop';
    }

    private function resolveCapturedAt(array $payload, ?Carbon $fallback = null): Carbon
    {
        if (! empty($payload['captured_at'])) {
            return Carbon::parse($payload['captured_at']);
        }

        $date = $payload['fecha'] ?? $fallback?->toDateString() ?? now()->toDateString();
        $time = $payload['hora_entrada'] ?? $fallback?->format('H:i') ?? now()->format('H:i');

        return Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
    }

    private function resolveCheckOutAt(array $payload, ?Carbon $fallback = null, ?Carbon $entryAt = null): ?Carbon
    {
        if (array_key_exists('check_out_at', $payload) && !empty($payload['check_out_at'])) {
            return Carbon::parse($payload['check_out_at']);
        }

        if (array_key_exists('hora_salida', $payload)) {
            $rawTime = trim((string) ($payload['hora_salida'] ?? ''));
            if ($rawTime === '') {
                return null;
            }

            $date = $payload['fecha']
                ?? $entryAt?->toDateString()
                ?? $fallback?->toDateString()
                ?? now()->toDateString();

            return Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $rawTime);
        }

        return $fallback;
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
