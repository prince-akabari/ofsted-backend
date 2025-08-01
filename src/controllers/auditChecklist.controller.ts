import { Request, Response } from "express";
import prisma from "../config/db";
import path from "path";
import fs from "fs";
import moment from "moment";

// Add a checklist item
export const addAuditChecklist = async (req: Request, res: Response) => {
  try {
    const {
      category,
      item,
      status,
      priority,
      dueDate,
      assignedTo,
      evidence,
      comments,
    } = req.body;

    const newChecklist = await prisma.auditChecklist.create({
      data: {
        category,
        item,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo,
        comments,
        evidence: evidence ?? [],
      },
    });

    return res.status(201).json(newChecklist);
  } catch (error) {
    console.error("[Add Checklist Error]", error);
    return res.status(500).json({ message: "Failed to add checklist item" });
  }
};

export const getAuditChecklists = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let checklistWhereClause: any = {};

    if (user.role === "staff") {
      // Find staff ID by email
      const staff = await prisma.staff.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      if (!staff) {
        return res.status(404).json({ message: "Staff not found" });
      }

      // Filter only assigned to this staff
      checklistWhereClause.assignedTo = staff.id;

    } else if (user.role === "admin" || user.role === "readonly") {
      // Step 1: Get current user's homeId
      const currentUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { homeId: true },
      });

      if (!currentUser || !currentUser.homeId) {
        return res.status(404).json({ message: "User homeId not found" });
      }

      // Step 2: Get all users in the same home
      const homeUsers = await prisma.user.findMany({
        where: { homeId: currentUser.homeId },
        select: { email: true },
      });

      const homeEmails = homeUsers.map((u) => u.email);

      // Step 3: Find all staff whose email is in that home
      const homeStaff = await prisma.staff.findMany({
        where: {
          email: { in: homeEmails },
        },
        select: { id: true },
      });

      const homeStaffIds = homeStaff.map((s) => s.id);

      checklistWhereClause.assignedTo = { in: homeStaffIds };
    }

    // Step 4: Fetch checklists with applied filter
    const checklistItems = await prisma.auditChecklist.findMany({
      where: checklistWhereClause,
      orderBy: { createdAt: "desc" },
    });

    // Step 5: Populate assigned staff info
    const populated = await Promise.all(
      checklistItems.map(async (item) => {
        const staff = item.assignedTo
          ? await prisma.staff.findUnique({
              where: { id: item.assignedTo },
              select: { id: true, name: true, email: true, role: true },
            })
          : null;

        return {
          ...item,
          assignedTo: staff,
          formattedDate: moment(item.createdAt).format("YYYY-MM-DD HH:mm"),
        };
      })
    );

    return res.status(200).json({ auditChecklist: populated });

  } catch (error) {
    console.error("[Get Checklist Error]", error);
    return res.status(500).json({ message: "Failed to fetch checklist items" });
  }
};


export const editAuditChecklist = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.auditChecklist.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "Audit checklist item not found." });
    }

    const {
      category,
      item,
      status,
      priority,
      dueDate,
      assignedTo,
      evidence,
      comments,
    } = req.body;

    const updated = await prisma.auditChecklist.update({
      where: { id },
      data: {
        category,
        item,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedTo,
        evidence,
        comments,
      },
    });

    return res.status(200).json({
      message: "Audit checklist item updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Edit Error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// DELETE /api/audit-checklist/:id
export const deleteAuditChecklist = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.auditChecklist.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "Audit checklist item not found." });
    }

    await prisma.auditChecklist.delete({ where: { id } });

    return res
      .status(200)
      .json({ message: "Audit checklist item deleted successfully." });
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

// GET /api/audit-checklist/:id
export const getAuditChecklistById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const item = await prisma.auditChecklist.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    // Populate staff details
    const assignedStaff = item.assignedTo
      ? await prisma.staff.findUnique({
          where: { id: item.assignedTo },
          select: { id: true, name: true, email: true, role: true },
        })
      : null;

    return res.status(200).json({
      checklistItem: {
        ...item,
        assignedTo: assignedStaff,
      },
    });
  } catch (error) {
    console.error("[Get Checklist By ID Error]", error);
    return res.status(500).json({ message: "Failed to fetch checklist item" });
  }
};

const auditEvidenceDir = path.join(__dirname, "..", "..", "documents", "audit");

export const uploadAuditEvidence = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const item = await prisma.auditChecklist.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    // Delete existing evidence files (if any)
    if (Array.isArray(item.evidence) && item.evidence.length > 0) {
      for (const filename of item.evidence) {
        const filePath = path.join(auditEvidenceDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // If no new files are uploaded
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      await prisma.auditChecklist.update({
        where: { id },
        data: { evidence: [] },
      });

      return res
        .status(200)
        .json({ message: "All evidence removed successfully." });
    }

    // New evidence files uploaded
    const files = req.files as Express.Multer.File[];
    const filenames = files.map((file) => file.filename);

    await prisma.auditChecklist.update({
      where: { id },
      data: { evidence: filenames },
    });

    return res.status(200).json({
      message: "Evidence uploaded successfully",
      files: filenames,
    });
  } catch (err) {
    console.error("Evidence Upload Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
