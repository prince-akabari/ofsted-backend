import { Request, Response } from "express";
import moment from "moment";
import prisma from "../config/db";

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let staffId: string | undefined = undefined;

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

    const alerts = await prisma.alert.findMany({
      where: staffId ? { staffId } : {},
      orderBy: {
        date: "desc",
      },
    });

    const formatted = alerts.map((alert) => ({
      id: alert.id,
      type: alert.severity.toLowerCase(),
      title: alert.title,
      description: alert.description,
      date: moment(alert.date).format("YYYY-MM-DD"),
      category: alert.category,
      urgent: alert.severity.toLowerCase() === "urgent",
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
