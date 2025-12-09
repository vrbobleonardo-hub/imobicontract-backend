-- Migration: add_notification_relations
-- This migration restructures the Notification model to add relations to property/landlord/tenant,
-- introduce NotificationStatus/NotificationType enums (stored as TEXT in SQLite),
-- and switches the primary key to an autoincrement integer.

PRAGMA foreign_keys=OFF;

-- Drop old table and recreate with new structure
CREATE TABLE "Notification_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "type" TEXT NOT NULL,
    "propertyId" INTEGER,
    "landlordId" TEXT,
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- NOTE: Legacy data is not migrated because the new structure is richer
-- (title/body/type/status/property/landlord/tenant). Add a manual INSERT here
-- if you need to preserve previous rows.

DROP TABLE "Notification";
ALTER TABLE "Notification_new" RENAME TO "Notification";

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
