-- AlterTable
ALTER TABLE "AuditChecklist" ALTER COLUMN "assignedTo" DROP NOT NULL,
ALTER COLUMN "assignedTo" SET DATA TYPE TEXT;
