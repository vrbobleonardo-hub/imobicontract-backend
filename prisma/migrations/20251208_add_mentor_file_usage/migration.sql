-- Migration: add mentor file usage count and MentorAttachment table
PRAGMA foreign_keys=OFF;

-- Add mentorFileQuestionsCount to UsageMonthly
ALTER TABLE "UsageMonthly" ADD COLUMN "mentorFileQuestionsCount" INTEGER NOT NULL DEFAULT 0;

-- Create MentorAttachment table
CREATE TABLE "MentorAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MentorAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
