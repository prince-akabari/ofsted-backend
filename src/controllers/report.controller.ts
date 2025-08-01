import { Request, Response } from "express";
import prisma from "../config/db";

// GET /api/reports - List all reports created by logged-in user
export const getAllReports = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // expects: { id, email, role, homeId }

    let reports;

    if (user.role === "staff") {
      // Staff: Only their own reports
      reports = await prisma.report.findMany({
        where: {
          createdBy: user.id,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Admin / Readonly: Fetch all users under the same homeId
      const homeUsers = await prisma.user.findMany({
        where: {
          homeId: user.homeId,
        },
        select: {
          id: true,
        },
      });

      const userIds = homeUsers.map((u) => u.id);

      reports = await prisma.report.findMany({
        where: {
          createdBy: { in: userIds },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Get distinct user IDs from reports
    const userIds = [...new Set(reports.map((r) => r.createdBy))];

    // Fetch those users
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Map user details to reports
    const enrichedReports = reports.map((report: any) => {
      const user = users.find((u) => u.id === report.createdBy);
      return {
        ...report,
        createdByUser: user || null,
      };
    });

    res.status(200).json(enrichedReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
};

// GET /api/reports/:id - View single report if owned by user
export const getReportById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: report.createdBy },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return res.status(200).json({
      ...report,
      createdByUser: user || null,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ message: "Failed to fetch report" });
  }
};

// POST /api/reports - Create new report
export const createReport = async (req: any, res: Response) => {
  try {
    const { title, type, category } = req.body;
    const userId = req.user.id;
    // Validate allowed types/categories
    const allowedReports = [
      "OFSTED Readiness Report",
      "Staff Compliance Summary",
      "Audit Progress Report",
      "Policy Compliance Report",
    ];

    if (!allowedReports.includes(title)) {
      return res.status(400).json({ error: "Invalid report title" });
    }

    const newReport = await prisma.report.create({
      data: {
        title,
        type,
        category: title,
        createdBy: userId,
        status: "in_progress",
        date: new Date(),
      },
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to create report" });
  }
};

// PUT /api/reports/:id - Update a report if owned
export const updateReport = async (req: any, res: Response) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;
    const { title, type, category, status } = req.body;

    const existingReport = await prisma.report.findFirst({
      where: { id: reportId, createdBy: userId },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        title,
        type,
        category,
        status,
      },
    });

    res.status(200).json(updatedReport);
  } catch (error) {
    console.error("Error updating report:", error);
    res.status(500).json({ error: "Failed to update report" });
  }
};

// DELETE /api/reports/:id - Delete a report if owned
export const deleteReport = async (req: any, res: Response) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    const existingReport = await prisma.report.findFirst({
      where: { id: reportId, createdBy: userId },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    res.status(500).json({ error: "Failed to delete report" });
  }
};
