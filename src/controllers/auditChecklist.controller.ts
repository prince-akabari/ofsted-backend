import { Request, Response } from "express";
import prisma from "../config/db";

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

    let staffId: string | undefined;

    // If the user is staff, get their staff ID
    if (user.role === "staff") {
      const staff = await prisma.staff.findUnique({
        where: { email: user.email },
        select: { id: true },
      });

      if (!staff) {
        return res.status(404).json({ message: "Staff record not found" });
      }

      staffId = staff.id;
    }

    // Filter: if staff, only show items assigned to them
    const checklistItems = await prisma.auditChecklist.findMany({
      where: staffId ? { assignedTo: staffId } : {}, // 👈 Filter only if staff
      orderBy: { createdAt: "desc" },
    });

    // Populate assigned staff details
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
        };
      })
    );

    return res.status(200).json({ auditChecklist: populated });
  } catch (error) {
    console.error("[Get Checklist Error]", error);
    return res.status(500).json({ message: "Failed to fetch checklist items" });
  }
};


// Update a checklist item
// PUT /api/audit-checklist/:id
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

// Delete a checklist item
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
