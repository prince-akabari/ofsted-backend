import { Request, Response } from "express";
import prisma from "../config/db";
import moment from "moment";

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // { email, role, homeId }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find all users under this admin's homeId
    const relatedUsers = await prisma.user.findMany({
      where: { homeId: user.homeId },
      select: { name: true },
    });

    const userNames = relatedUsers.map((u) => u.name);

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({
        where: { userName: { in: userNames } },
      }),
      prisma.activityLog.findMany({
        where: { userName: { in: userNames } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      timestamp: moment(log.createdAt).format("YYYY-MM-DD HH:mm"),
      user: log.userName,
      category: log.category.toUpperCase(),
      action: log.action,
      details: log.details,
      status: log.status.toUpperCase(),
    }));

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
      logs: formattedLogs,
    });
  } catch (error) {
    console.error("Activity Log Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
