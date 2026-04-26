<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attendance_records')) {
            return;
        }

        Schema::table('attendance_records', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_records', 'check_out_at')) {
                $table->dateTime('check_out_at')->nullable()->after('captured_at');
            }

            if (!Schema::hasColumn('attendance_records', 'check_out_latitude')) {
                $table->decimal('check_out_latitude', 10, 7)->nullable()->after('check_out_at');
            }

            if (!Schema::hasColumn('attendance_records', 'check_out_longitude')) {
                $table->decimal('check_out_longitude', 10, 7)->nullable()->after('check_out_latitude');
            }

            if (!Schema::hasColumn('attendance_records', 'check_out_accuracy_meters')) {
                $table->decimal('check_out_accuracy_meters', 10, 2)->nullable()->after('check_out_longitude');
            }

            if (!Schema::hasColumn('attendance_records', 'check_out_photo_path')) {
                $table->string('check_out_photo_path', 255)->nullable()->after('check_out_accuracy_meters');
            }

            if (!Schema::hasColumn('attendance_records', 'worked_minutes')) {
                $table->unsignedInteger('worked_minutes')->nullable()->after('check_out_photo_path');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('attendance_records')) {
            return;
        }

        Schema::table('attendance_records', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_records', 'worked_minutes')) {
                $table->dropColumn('worked_minutes');
            }

            if (Schema::hasColumn('attendance_records', 'check_out_photo_path')) {
                $table->dropColumn('check_out_photo_path');
            }

            if (Schema::hasColumn('attendance_records', 'check_out_accuracy_meters')) {
                $table->dropColumn('check_out_accuracy_meters');
            }

            if (Schema::hasColumn('attendance_records', 'check_out_longitude')) {
                $table->dropColumn('check_out_longitude');
            }

            if (Schema::hasColumn('attendance_records', 'check_out_latitude')) {
                $table->dropColumn('check_out_latitude');
            }

            if (Schema::hasColumn('attendance_records', 'check_out_at')) {
                $table->dropColumn('check_out_at');
            }
        });
    }
};
