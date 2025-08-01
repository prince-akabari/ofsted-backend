import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getDashboardOverview = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const isStaff = user.role === "staff";

    // 1. Get user record to access homeId
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, homeId: true },
    });

    if (!currentUser) {
      return res.status(403).json({ error: "User not found" });
    }

    const homeId = currentUser.homeId;

    // 2. Get all users under same home
    const homeUsers = await prisma.user.findMany({
      where: { homeId },
      select: { id: true, email: true },
    });

    const allowedEmails = homeUsers.map((u) => u.email);
    const allowedUserIds = homeUsers.map((u) => u.id);

    // 3. Get staff linked by email
    const allowedStaff = await prisma.staff.findMany({
      where: {
        email: { in: allowedEmails },
      },
      select: { id: true, email: true },
    });
    const allowedStaffIds = allowedStaff.map((s) => s.id);

    // 4. Get checklist items
    let checklistItems = [];
    if (isStaff) {
      const staffMember = await prisma.staff.findUnique({
        where: { email: user.email },
      });

      if (!staffMember) {
        return res.status(403).json({ error: "Staff profile not found" });
      }

      checklistItems = await prisma.auditChecklist.findMany({
        where: {
          assignedTo: staffMember.id,
        },
      });
    } else {
      checklistItems = await prisma.auditChecklist.findMany({
        where: {
          assignedTo: { in: allowedStaffIds },
        },
      });
    }

    // 5. Completion & Overview
    const completedItems = checklistItems.filter(
      (item) => item.status === "complete"
    ).length;
    const totalItems = checklistItems.length;
    const auditCompletion =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const outstandingActions = checklistItems.filter(
      (item) => item.status !== "complete"
    ).length;

    const categories = [
      "Safeguarding",
      "Behavior Management",
      "Staff Recruitment",
      "Health and Safety",
      "Leadership and Management",
    ];
    const checklistOverview = categories.map((category) => {
      const itemsInCategory = checklistItems.filter(
        (item) => item.category === category
      );
      const completed = itemsInCategory.filter(
        (item) => item.status === "complete"
      ).length;
      return {
        category,
        completed,
        total: itemsInCategory.length,
      };
    });

    // 6. Reports (only for non-staff)
    let lastReport = null;
    let recentReports: any[] = [];
    if (!isStaff) {
      const last = await prisma.report.findFirst({
        where: {
          type: "ofsted",
          createdBy: { in: allowedUserIds },
        },
        orderBy: { createdAt: "desc" },
      });

      lastReport = last
        ? {
            date: moment(last.createdAt).format("YYYY-MM-DD"),
            rating: determineOfstedRating(last.status),
          }
        : null;

      const recent = await prisma.report.findMany({
        where: {
          createdBy: { in: allowedUserIds },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      recentReports = recent.map((r) => ({
        title: r.title,
        date: moment(r.createdAt).format("YYYY-MM-DD"),
        status: r.status,
      }));
    }

    // 7. Staff Readiness
    let overallReadiness = 0;
    if (!isStaff) {
      const staff = await prisma.staff.findMany({
        where: {
          email: { in: allowedEmails },
        },
      });

      const compliantStaff = staff.filter((s) => {
        return (
          s.dbsCheckStatus === "valid" &&
          s.trainingSafeguardingStatus === "complete" &&
          s.trainingFirstAidStatus === "complete" &&
          s.trainingMedicationStatus === "complete"
        );
      });

      overallReadiness =
        staff.length > 0
          ? Math.round((compliantStaff.length / staff.length) * 100)
          : 0;
    } else {
      if (isStaff) {
        const staff = await prisma.staff.findUnique({
          where: { email: user.email },
        });

        if (staff) {
          const isCompliant =
            staff.dbsCheckStatus === "valid" &&
            staff.trainingSafeguardingStatus === "complete" &&
            staff.trainingFirstAidStatus === "complete" &&
            staff.trainingMedicationStatus === "complete";

          overallReadiness = isCompliant ? 100 : 0;
        }
      }
    }

    // 8. Final Response
    res.json({
      overallReadiness: overallReadiness,
      auditCompletion,
      outstandingActions,
      lastOfstedVisit: lastReport,
      checklistOverview,
      recentReports,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

function determineOfstedRating(status: string): string {
  switch (status) {
    case "complete":
      return "Outstanding";
    case "in_progress":
      return "Good";
    case "scheduled":
      return "Requires Improvement";
    default:
      return "Not Rated";
  }
}
