import { Request, Response } from "express";
import prisma from "../config/db";
import moment from "moment";

// Helper to safely parse date strings
const parseDate = (date: string | null): Date => {
  return date ? new Date(date) : new Date();
};

// ✅ Create Staff
export const createStaff = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Staff with this email already exists." });
    }

    const staff = await prisma.staff.create({
      data: {
        name: req.body.name,
        role: req.body.role,
        email: req.body.email,
        status: req.body.status,
        dbsCheckStatus: req.body.dbsCheckStatus,
        dbsExpiryDate: parseDate(req.body.dbsExpiryDate),
        trainingSafeguardingStatus: req.body.trainingSafeguardingStatus,
        trainingSafeguardingDate: parseDate(req.body.trainingSafeguardingDate),
        trainingFirstAidStatus: req.body.trainingFirstAidStatus,
        trainingFirstAidDate: parseDate(req.body.trainingFirstAidDate),
        trainingMedicationStatus: req.body.trainingMedicationStatus,
        trainingMedicationDate: parseDate(req.body.trainingMedicationDate),
      },
    });

    return res
      .status(201)
      .json({ message: "Staff created successfully", staff });
  } catch (err) {
    console.error("Create staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // { email, role }

    let staff;

    // Role-based filtering
    if (user.role === "staff") {
      staff = await prisma.staff.findMany({
        where: {
          email: user.email,
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      staff = await prisma.staff.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    const total = staff.length;
    const fullyCompliant = staff.filter((s) => s.status === "compliant").length;
    const attentionNeeded = staff.filter((s) => s.status === "warning").length;
    const overdue = staff.filter((s) => s.status === "overdue").length;

    const overallCompliance =
      total > 0 ? Math.round((fullyCompliant / total) * 100) : 0;

    res.status(200).json({
      staff,
      summary: {
        overallCompliance,
        fullyCompliant,
        attentionNeeded,
        overdue,
      },
    });
  } catch (err) {
    console.error("Get all staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getStaffById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    // Calculate compliance percentage
    const trainingFields = [
      staff.trainingSafeguardingStatus,
      staff.trainingFirstAidStatus,
      staff.trainingMedicationStatus,
    ];
    const completed = trainingFields.filter(
      (status) => status === "complete"
    ).length;
    const overallCompliance = Math.round(
      (completed / trainingFields.length) * 100
    );

    // DBS Expiry calculation
    const dbsDate = moment(staff.dbsExpiryDate);
    const daysRemaining = dbsDate.diff(moment(), "days");

    res.status(200).json({
      name: staff.name,
      role: staff.role,
      email: staff.email,
      status: staff.status,
      overallCompliance,
      dbsCheck: {
        status: staff.dbsCheckStatus,
        expiryDate: moment(staff.dbsExpiryDate).format("MM/DD/YYYY"),
        daysRemaining,
      },
      training: {
        safeguarding: {
          date: moment(staff.trainingSafeguardingDate).format("YYYY-MM-DD"),
          status: staff.trainingSafeguardingStatus,
        },
        firstAid: {
          date: moment(staff.trainingFirstAidDate).format("YYYY-MM-DD"),
          status: staff.trainingFirstAidStatus,
        },
        medication: {
          date: moment(staff.trainingMedicationDate).format("YYYY-MM-DD"),
          status: staff.trainingMedicationStatus,
        },
      },
    });
  } catch (err) {
    console.error("Get staff by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Update Staff
export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ error: "Staff not found." });
    }

    // Check if the new email is used by another staff
    // const existingEmail = await prisma.staff.findFirst({
    //   where: {
    //     email,
    //     NOT: { id },
    //   },
    // });

    // if (existingEmail) {
    //   return res
    //     .status(400)
    //     .json({ error: "Email is already used by another staff member." });
    // }

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        name: req.body.name,
        role: req.body.role,
        email,
        status: req.body.status,
        dbsCheckStatus: req.body.dbsCheckStatus,
        dbsExpiryDate: parseDate(req.body.dbsExpiryDate),
        trainingSafeguardingStatus: req.body.trainingSafeguardingStatus,
        trainingSafeguardingDate: parseDate(req.body.trainingSafeguardingDate),
        trainingFirstAidStatus: req.body.trainingFirstAidStatus,
        trainingFirstAidDate: parseDate(req.body.trainingFirstAidDate),
        trainingMedicationStatus: req.body.trainingMedicationStatus,
        trainingMedicationDate: parseDate(req.body.trainingMedicationDate),
      },
    });

    return res
      .status(200)
      .json({ message: "Staff updated successfully", staff: updated });
  } catch (err) {
    console.error("Update staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete Staff
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ error: "Staff not found." });
    }

    await prisma.staff.delete({ where: { id } });
    return res.status(200).json({ message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Delete staff error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
