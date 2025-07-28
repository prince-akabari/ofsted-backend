import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let staffId: string | undefined;

    // If staff, get their ID
    if (user.role === "staff") {
      const staff = await prisma.staff.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }

      staffId = staff.id;
    }

    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 8;

    const whereClause = staffId ? { staffId } : {};

    // Fetch paginated alerts and counts in parallel
    const [alerts, totalCount, dangerCount, warningCount, infoCount] =
      await Promise.all([
        prisma.alert.findMany({
          where: whereClause,
          orderBy: { date: "desc" },
          skip,
          take,
        }),
        prisma.alert.count({ where: whereClause }), // Total (unfiltered)
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

    // Format for frontend
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
