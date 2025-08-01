import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getDashboardOverview = async (req: any, res: Response) => {
  try {
    const user = req.user; // assumes req.user is populated by middleware
    const isStaff = user.role === "staff";

    let checklistItems = [];

    if (isStaff) {
      // Get staff member by email
      const staffMember = await prisma.staff.findUnique({
        where: { email: user.email },
      });

      if (!staffMember) {
        return res.status(403).json({ error: "Staff profile not found" });
      }

      // Fetch only checklist items assigned to this staff
      checklistItems = await prisma.auditChecklist.findMany({
        where: { assignedTo: staffMember.id },
      });
    } else {
      // Admin or Read-only: Fetch all checklist items
      checklistItems = await prisma.auditChecklist.findMany();
    }

    // Compute audit completion
    const completedItems = checklistItems.filter(
      (item) => item.status === "complete"
    ).length;
    const totalItems = checklistItems.length;
    const auditCompletion =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const outstandingActions = checklistItems.filter(
      (item) => item.status !== "complete"
    ).length;

    // Group by category
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

    // Only fetch reports if NOT staff
    let lastReport = null;
    let recentReports:any[] = [];
    if (!isStaff) {
      const last = await prisma.report.findFirst({
        where: { type: "ofsted" },
        orderBy: { createdAt: "desc" },
      });
      lastReport = last
        ? {
            date: moment(last.createdAt).format("YYYY-MM-DD"),
            rating: determineOfstedRating(last.status),
          }
        : null;

      const recent = await prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
      });
      recentReports = recent.map((r) => ({
        title: r.title,
        date: moment(r.createdAt).format("YYYY-MM-DD"),
        status: r.status,
      }));
    }

    // Overall readiness for non-staff users
    let overallReadiness = 0;
    if (!isStaff) {
      const staff = await prisma.staff.findMany();
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
    }

    res.json({
      overallReadiness: isStaff ? 0 : overallReadiness,
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

function determineOfstedRating(reportStatus: any): string {
  switch (reportStatus) {
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
