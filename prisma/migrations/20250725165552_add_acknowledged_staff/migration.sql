-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "acknowledgedStaff" TEXT[] DEFAULT ARRAY[]::TEXT[];
