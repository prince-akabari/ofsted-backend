import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // includes email, role, homeId
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 8;

    let staffIds: string[] = [];

    if (user.role === "staff") {
      // Fetch only their own staff ID
      const staff = await prisma.staff.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }

      staffIds = [staff.id];
    } else {
      // Admin/Readonly: fetch staff created under same homeId
      const staffUsers = await prisma.user.findMany({
        where: {
          homeId: user.homeId,
          role: "staff",
        },
        select: { email: true },
      });

      const staffEmails = staffUsers.map((u) => u.email);

      const staffList = await prisma.staff.findMany({
        where: { email: { in: staffEmails } },
        select: { id: true },
      });

      staffIds = staffList.map((s) => s.id);
    }

    // Build filtering clause
    const whereClause = { staffId: { in: staffIds } };

    const [alerts, totalCount, dangerCount, warningCount, infoCount] =
      await Promise.all([
        prisma.alert.findMany({
          where: whereClause,
          orderBy: { date: "desc" },
          skip,
          take,
        }),
        prisma.alert.count({ where: whereClause }),
        prisma.alert.count({
          where: { ...whereClause, severity: "danger" },
        }),
        prisma.alert.count({
          where: { ...whereClause, severity: "warning" },
        }),
        prisma.alert.count({
          where: { ...whereClause, severity: "info" },
        }),
      ]);

    const formatted = alerts.map((alert) => ({
      id: alert.id,
      type: alert.severity.toLowerCase(),
      title: alert.title,
      description: alert.description,
      date: moment(alert.date).format("YYYY-MM-DD"),
      category: alert.category,
      urgent: alert.severity.toLowerCase() === "danger",
    }));

    return res.json({
      alerts: formatted,
      counts: {
        total: totalCount,
        danger: dangerCount,
        warning: warningCount,
        info: infoCount,
      },
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const dismissAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    await prisma.alert.delete({ where: { id } });

    return res.status(200).json({ message: "Alert dismissed successfully" });
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
