import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getDashboardOverview = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const isStaff = user.role === "staff";

    // 1. Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, homeId: true },
    });

    if (!currentUser) {
      return res.status(403).json({ error: "User not found" });
    }

    const homeId = currentUser.homeId;

    // 2. Get home users
    const homeUsers = await prisma.user.findMany({
      where: { homeId },
      select: { id: true, email: true },
    });

    const allowedEmails = homeUsers.map((u) => u.email);
    const allowedUserIds = homeUsers.map((u) => u.id);

    // 3. Get all staff linked to home emails
    const allowedStaff = await prisma.staff.findMany({
      where: { email: { in: allowedEmails } },
      select: {
        id: true,
        email: true,
        dbsCheckStatus: true,
        trainingSafeguardingStatus: true,
        trainingFirstAidStatus: true,
        trainingMedicationStatus: true,
      },
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
        where: { assignedTo: staffMember.id },
      });
    } else {
      checklistItems = await prisma.auditChecklist.findMany({
        where: { assignedTo: { in: allowedStaffIds } },
      });
    }

    // 5. Checklist summary
    const completedItems = checklistItems.filter(
      (item) => item.status === "complete"
    ).length;

    const totalItems = checklistItems.length;
    const auditCompletion =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const outstandingActions = totalItems - completedItems;

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

    // 6. Ofsted Reports (non-staff only)
    let lastReport = null;
    let recentReports: any[] = [];

    if (!isStaff) {
      const [last, recent] = await Promise.all([
        prisma.report.findFirst({
          where: {
            type: { equals: "ofsted", mode: "insensitive" },
            createdBy: { in: allowedUserIds },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.report.findMany({
          where: { createdBy: { in: allowedUserIds } },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
      ]);

      lastReport = last
        ? {
            date: moment(last.createdAt).format("YYYY-MM-DD"),
            rating: determineOfstedRating(last.status),
          }
        : null;

      recentReports = recent.map((r) => ({
        title: r.title,
        date: moment(r.createdAt).format("YYYY-MM-DD"),
        status: r.status,
      }));
    }

    // 7. Staff Readiness
    let overallReadiness = 0;

    if (!isStaff) {
      const compliantCount = allowedStaff.filter((s) => isCompliant(s)).length;

      overallReadiness =
        allowedStaff.length > 0
          ? Math.round((compliantCount / allowedStaff.length) * 100)
          : 0;
    } else {
      const staff = await prisma.staff.findUnique({
        where: { email: user.email },
        select: {
          dbsCheckStatus: true,
          trainingSafeguardingStatus: true,
          trainingFirstAidStatus: true,
          trainingMedicationStatus: true,
        },
      });

      overallReadiness = staff && isCompliant(staff) ? 100 : 0;
    }

    // 8. Final Response
    res.json({
      overallReadiness,
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

// Clean status-to-rating mapping
function determineOfstedRating(status: string): string {
  const map: { [key: string]: string } = {
    complete: "Outstanding",
    in_progress: "Good",
    scheduled: "Requires Improvement",
  };

  return map[status?.toLowerCase()] ?? "Not Rated";
}

// Staff compliance check
function isCompliant(staff: any): boolean {
  return (
    staff.dbsCheckStatus === "valid" &&
    staff.trainingSafeguardingStatus === "complete" &&
    staff.trainingFirstAidStatus === "complete" &&
    staff.trainingMedicationStatus === "complete"
  );
}
