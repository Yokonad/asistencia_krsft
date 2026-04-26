<?php

use Illuminate\Support\Facades\Route;
use Modulos_ERP\AsistenciaKrsft\Controllers\AsistenciaController;
use Modulos_ERP\AsistenciaKrsft\Controllers\OvertimeRequestController;
use Modulos_ERP\AsistenciaKrsft\Controllers\ScheduleTypeController;
use Modulos_ERP\AsistenciaKrsft\Controllers\WorkerScheduleTypeController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/list', [AsistenciaController::class, 'list'])->name('asistencia.list');
    Route::get('/export', [AsistenciaController::class, 'exportXlsx'])->name('asistencia.export.xlsx');
    Route::get('/hoy', [AsistenciaController::class, 'hoy'])->name('asistencia.hoy');
    Route::get('/resumen-dia', [AsistenciaController::class, 'resumenDia'])->name('asistencia.resumen-dia');
    Route::get('/photo/{id}', [AsistenciaController::class, 'photo'])->name('asistencia.photo');
    Route::get('/counts', [AsistenciaController::class, 'counts'])->name('asistencia.counts');
    Route::get('/day-attendance', [AsistenciaController::class, 'dayAttendance'])->name('asistencia.day-attendance');
    Route::get('/general-monthly-summary', [AsistenciaController::class, 'generalMonthlySummary'])->name('asistencia.general-monthly-summary');
    Route::get('/worker-attendance-summary', [AsistenciaController::class, 'workerAttendanceSummary'])->name('asistencia.worker-attendance-summary');
    Route::get('/proyectos', [AsistenciaController::class, 'proyectos'])->name('asistencia.proyectos');
    Route::post('/store', [AsistenciaController::class, 'store'])->name('asistencia.store');
    Route::get('/{id}', [AsistenciaController::class, 'show'])->name('asistencia.show');
    Route::put('/{id}', [AsistenciaController::class, 'update'])->name('asistencia.update');
    Route::delete('/{id}', [AsistenciaController::class, 'destroy'])->name('asistencia.destroy');

    // Overtime Requests
    Route::post('/overtime-requests', [OvertimeRequestController::class, 'store'])->name('overtime-requests.store');
    Route::get('/overtime-requests/pending', [OvertimeRequestController::class, 'pending'])->name('overtime-requests.pending');
    Route::put('/overtime-requests/{id}/approve', [OvertimeRequestController::class, 'approve'])->name('overtime-requests.approve');
    Route::put('/overtime-requests/{id}/reject', [OvertimeRequestController::class, 'reject'])->name('overtime-requests.reject');
    Route::get('/overtime-requests/for-record/{attendanceRecordId}', [OvertimeRequestController::class, 'forRecord'])->name('overtime-requests.for-record');

    // Schedule Types
    Route::get('/schedule-types', [ScheduleTypeController::class, 'index'])->name('schedule-types.index');
    Route::post('/schedule-types', [ScheduleTypeController::class, 'store'])->name('schedule-types.store');
    Route::put('/schedule-types/{id}', [ScheduleTypeController::class, 'update'])->name('schedule-types.update');
    Route::delete('/schedule-types/{id}', [ScheduleTypeController::class, 'destroy'])->name('schedule-types.destroy');

    // Worker Schedule Types
    Route::get('/workers/schedule-types', [WorkerScheduleTypeController::class, 'index'])->name('worker-schedule-types.index');
    Route::get('/workers/{workerId}/schedule-type', [WorkerScheduleTypeController::class, 'show'])->name('worker-schedule-types.show');
    Route::put('/workers/{workerId}/schedule-type', [WorkerScheduleTypeController::class, 'update'])->name('worker-schedule-types.update');
});
