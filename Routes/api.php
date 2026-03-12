<?php

use Illuminate\Support\Facades\Route;
use Modulos_ERP\AsistenciaKrsft\Controllers\AsistenciaController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/list', [AsistenciaController::class, 'list'])->name('asistencia.list');
    Route::post('/store', [AsistenciaController::class, 'store'])->name('asistencia.store');
    Route::get('/{id}', [AsistenciaController::class, 'show'])->name('asistencia.show');
    Route::put('/{id}', [AsistenciaController::class, 'update'])->name('asistencia.update');
    Route::delete('/{id}', [AsistenciaController::class, 'destroy'])->name('asistencia.destroy');
});
