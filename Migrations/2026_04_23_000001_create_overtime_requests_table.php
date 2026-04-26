<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('overtime_requests')) {
            DB::statement("
                CREATE TABLE overtime_requests (
                    id                     BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
                    attendance_record_id   BIGINT           NOT NULL,
                    requested_by_user_id   BIGINT           NOT NULL,
                    approved_by_user_id    BIGINT           NULL DEFAULT NULL,
                    extra_hours            DECIMAL(4,2)     NOT NULL,
                    justification          TEXT             NOT NULL,
                    status                 ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
                    rejection_reason       TEXT             NULL DEFAULT NULL,
                    created_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at             DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    approved_at            DATETIME         NULL DEFAULT NULL,
                    PRIMARY KEY (id),
                    INDEX idx_attendance_record_id (attendance_record_id),
                    INDEX idx_requested_by_user_id (requested_by_user_id),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('overtime_requests');
    }
};
