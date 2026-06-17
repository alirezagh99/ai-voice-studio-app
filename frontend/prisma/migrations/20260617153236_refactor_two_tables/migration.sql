/*
  Warnings:

  - You are about to drop the column `s3Key` on the `audio_project` table. All the data in the column will be lost.
  - You are about to drop the column `voiceS3Key` on the `audio_project` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `uploaded_voice` table. All the data in the column will be lost.
  - Added the required column `voiceUrl` to the `audio_project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `uploaded_voice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audio_project" DROP COLUMN "s3Key",
DROP COLUMN "voiceS3Key",
ADD COLUMN     "voiceUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "uploaded_voice" DROP COLUMN "s3Key",
ADD COLUMN     "publicId" TEXT NOT NULL;
