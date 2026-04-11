-- CreateEnum
CREATE TYPE "Role" AS ENUM ('guardian', 'admin', 'driver');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ChildStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('normal', 'holiday', 'canceled', 'early_close');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('attend', 'absent');

-- CreateEnum
CREATE TYPE "UseType" AS ENUM ('default', 'use', 'not_use');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('app', 'phone', 'admin');

-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('morning', 'evening');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('planned', 'confirmed', 'in_service', 'completed', 'canceled');

-- CreateEnum
CREATE TYPE "BoardingStatus" AS ENUM ('expected', 'boarded', 'no_show', 'excused');

-- CreateEnum
CREATE TYPE "TargetRole" AS ENUM ('all', 'guardian', 'driver');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'guardian',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kana" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "class_name" TEXT NOT NULL,
    "status" "ChildStatus" NOT NULL DEFAULT 'active',
    "default_morning_use" BOOLEAN NOT NULL DEFAULT false,
    "default_evening_use" BOOLEAN NOT NULL DEFAULT false,
    "default_morning_route_id" TEXT,
    "default_morning_stop_id" TEXT,
    "default_evening_route_id" TEXT,
    "default_evening_stop_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_children" (
    "id" TEXT NOT NULL,
    "guardian_user_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL DEFAULT '保護者',

    CONSTRAINT "guardian_children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "memo" TEXT,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "stop_order" INTEGER NOT NULL,
    "planned_time" TEXT,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_days" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "operation_date" DATE NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'normal',
    "morning_deadline_at" TIMESTAMP(3),
    "evening_deadline_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operation_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_contacts" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "operation_day_id" TEXT NOT NULL,
    "attendance_status" "AttendanceStatus" NOT NULL DEFAULT 'attend',
    "morning_use_type" "UseType" NOT NULL DEFAULT 'default',
    "evening_use_type" "UseType" NOT NULL DEFAULT 'default',
    "note" TEXT,
    "source" "ContactSource" NOT NULL DEFAULT 'app',
    "submitted_by_user_id" TEXT NOT NULL,
    "received_by_user_id" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "after_deadline_flag" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "operation_day_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "segment" "Segment" NOT NULL,
    "driver_user_id" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'planned',
    "admin_note" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_passengers" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "expected_boarding" BOOLEAN NOT NULL DEFAULT true,
    "boarding_status" "BoardingStatus" NOT NULL DEFAULT 'expected',
    "checked_at" TIMESTAMP(3),
    "checked_by_user_id" TEXT,

    CONSTRAINT "trip_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_role" "TargetRole" NOT NULL DEFAULT 'all',
    "target_school_id" TEXT,
    "target_route_id" TEXT,
    "publish_from" TIMESTAMP(3) NOT NULL,
    "publish_to" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "acted_by_user_id" TEXT NOT NULL,
    "acted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_children_guardian_user_id_child_id_key" ON "guardian_children"("guardian_user_id", "child_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_route_id_stop_id_key" ON "route_stops"("route_id", "stop_id");

-- CreateIndex
CREATE UNIQUE INDEX "operation_days_school_id_operation_date_key" ON "operation_days"("school_id", "operation_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_contacts_child_id_operation_day_id_key" ON "daily_contacts"("child_id", "operation_day_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_passengers_trip_id_child_id_key" ON "trip_passengers"("trip_id", "child_id");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_default_morning_route_id_fkey" FOREIGN KEY ("default_morning_route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_default_morning_stop_id_fkey" FOREIGN KEY ("default_morning_stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_default_evening_route_id_fkey" FOREIGN KEY ("default_evening_route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_default_evening_stop_id_fkey" FOREIGN KEY ("default_evening_stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_children" ADD CONSTRAINT "guardian_children_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_days" ADD CONSTRAINT "operation_days_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_contacts" ADD CONSTRAINT "daily_contacts_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_contacts" ADD CONSTRAINT "daily_contacts_operation_day_id_fkey" FOREIGN KEY ("operation_day_id") REFERENCES "operation_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_contacts" ADD CONSTRAINT "daily_contacts_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_contacts" ADD CONSTRAINT "daily_contacts_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_operation_day_id_fkey" FOREIGN KEY ("operation_day_id") REFERENCES "operation_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_passengers" ADD CONSTRAINT "trip_passengers_checked_by_user_id_fkey" FOREIGN KEY ("checked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_school_id_fkey" FOREIGN KEY ("target_school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_target_route_id_fkey" FOREIGN KEY ("target_route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_acted_by_user_id_fkey" FOREIGN KEY ("acted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
