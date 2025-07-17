import { Request, Response, NextFunction } from "express";
import onFinished from "on-finished";
import prisma from "../config/db";

export const activityLogger = (req: Request, res: Response, next: NextFunction) => {
  onFinished(res, async () => {
    try {
      const userId = (req as any).user?.id;
      const userName = (req as any).user?.name ?? 'Unkhown';

      // Log only for modifying routes and successful status
      if (
        ["POST", "PUT", "DELETE"].includes(req.method) &&
        res.statusCode < 400 &&
        userId
      ) {
        const action = `${req.method} ${req.originalUrl}`;
        const category = req.originalUrl.split("/")[2] || "unknown";
        const details = `User ${userName} performed ${action}`;
        const status = "success";

        await prisma.activityLog.create({
          data: {
            userId,
            userName,
            action,
            category,
            details,
            status,
          },
        });
      }
    } catch (err) {
      console.error("Activity log error:", err);
    }
  });

  next();
};
