-- CreateTable
CREATE TABLE "observation_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memo" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observation_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_observations" (
    "id" TEXT NOT NULL,
    "observation_point_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "image_data" BYTEA NOT NULL,
    "image_mime_type" TEXT NOT NULL,
    "note" TEXT,
    "green_ratio" DOUBLE PRECISION NOT NULL,
    "yellow_brown_ratio" DOUBLE PRECISION NOT NULL,
    "other_ratio" DOUBLE PRECISION NOT NULL,
    "avg_brightness" DOUBLE PRECISION NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crop_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crop_observations_observation_point_id_taken_at_idx" ON "crop_observations"("observation_point_id", "taken_at");

-- AddForeignKey
ALTER TABLE "observation_points" ADD CONSTRAINT "observation_points_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_observations" ADD CONSTRAINT "crop_observations_observation_point_id_fkey" FOREIGN KEY ("observation_point_id") REFERENCES "observation_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crop_observations" ADD CONSTRAINT "crop_observations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
