import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import moment from "moment";

const prisma = new PrismaClient();

export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      status,
    } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      category?: string;
      status?: string;
    }; 

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Filters
    const where = {
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { userName: { contains: search, mode: "insensitive" } },
              { action: { contains: search, mode: "insensitive" } },
              { details: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Get paginated activity logs
    const [logs, total, uniqueCategories, uniqueStatuses] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.activityLog.findMany({
        distinct: ["status"],
        select: { status: true },
      }),
    ]);

    const formattedLogs = logs.map((log, index) => ({
      id: skip + index + 1,
      timestamp: moment(log.createdAt).format("YYYY-MM-DD HH:mm"),
      user: log.userName,
      action: log.action,
      category: log.category,
      details: log.details,
      status: log.status,
    }));

    res.json({
      total,
      data: formattedLogs,
      categories: uniqueCategories.map((c) => c.category),
      statuses: uniqueStatuses.map((s) => s.status),
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
