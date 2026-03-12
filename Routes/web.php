<?php

use Illuminate\Support\Facades\Route;
use Modulos_ERP\AsistenciaKrsft\Controllers\AsistenciaController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [AsistenciaController::class, 'index'])->name('asistencia.index');
});
