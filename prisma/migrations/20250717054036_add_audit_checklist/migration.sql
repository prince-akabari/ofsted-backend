-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('complete', 'incomplete', 'inprogress', 'overdue');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "AuditChecklist" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL,
    "priority" "PriorityLevel" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "assignedTo" TEXT[],
    "evidence" TEXT[],
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditChecklist_pkey" PRIMARY KEY ("id")
);
