<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('schedule_types')) {
            DB::statement("
                CREATE TABLE schedule_types (
                    id                     BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
                    name                   VARCHAR(100)     NOT NULL,
                    expected_start_time    TIME            NOT NULL,
                    expected_end_time      TIME            NOT NULL,
                    tolerance_minutes      INT UNSIGNED     NOT NULL DEFAULT 5,
                    auto_fill_salida        TINYINT(1)      NOT NULL DEFAULT 0,
                    is_active              TINYINT(1)      NOT NULL DEFAULT 1,
                    created_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE INDEX idx_name_active (name, is_active) USING BTREE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_types');
    }
};
