<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('worker_schedule_types')) {
            DB::statement("
                CREATE TABLE worker_schedule_types (
                    id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
                    worker_id        BIGINT           NOT NULL,
                    schedule_type_id BIGINT           NOT NULL,
                    effective_from   DATE            NOT NULL,
                    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_worker_id (worker_id),
                    INDEX idx_schedule_type_id (schedule_type_id),
                    INDEX idx_effective_from (effective_from),
                    INDEX idx_worker_effective (worker_id, effective_from DESC)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_schedule_types');
    }
};
