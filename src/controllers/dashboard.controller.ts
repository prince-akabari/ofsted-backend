import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    // Get all audit checklist items
    const checklistItems = await prisma.auditChecklist.findMany();

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

    // Last OFSTED visit report
    const lastReport = await prisma.report.findFirst({
      where: { type: "ofsted" },
      orderBy: { createdAt: "desc" },
    });

    // Recent reports
    const recentReportsRaw = await prisma.report.findMany({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const recentReports = recentReportsRaw.map((r: any) => ({
      title: r.title,
      date: moment(r.createdAt).format("YYYY-MM-DD"),
      status: r.status,
    }));

    // Overall readiness based on staff compliance
    const staff = await prisma.staff.findMany();

    const compliantStaff = staff.filter((s) => {
      return (
        s.dbsCheckStatus === "valid" &&
        s.trainingSafeguardingStatus === "complete" &&
        s.trainingFirstAidStatus === "complete" &&
        s.trainingMedicationStatus === "complete"
      );
    });
    const overallReadiness =
      staff.length > 0
        ? Math.round((compliantStaff.length / staff.length) * 100)
        : 0;

    res.json({
      overallReadiness,
      auditCompletion,
      outstandingActions,
      lastOfstedVisit: lastReport
        ? {
            date: moment(lastReport.createdAt).format("YYYY-MM-DD"),
            rating: determineOfstedRating(lastReport.status),
          }
        : null,
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
      return "Requires Improvement"; // or 'Not Yet Rated'
    default:
      return "Not Rated";
  }
}
