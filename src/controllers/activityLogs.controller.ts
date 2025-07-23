import { Request, Response } from "express";
import prisma from "../config/db";
import moment from "moment";

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
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
