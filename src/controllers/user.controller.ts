import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";

// Invite new user
export const inviteUser = async (req: Request, res: Response) => {
  const { name, email, role } = req.body;

  if (!name || !email || !role) {
    return res
      .status(400)
      .json({ error: "Name, email, and role are required" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const defaultPassword = await bcrypt.hash("User@123", 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: defaultPassword,
        status: "inactive",
      },
    });
    if (role === "staff") {
      await prisma.staff.create({
        data: {
          name,
          email,
          role: "Staff",
          status: "Pending",
          dbsCheckStatus: "Pending",
          dbsExpiryDate: new Date(),
          trainingSafeguardingStatus: "Pending",
          trainingSafeguardingDate: null,
          trainingFirstAidStatus: "Pending",
          trainingFirstAidDate: null,
          trainingMedicationStatus: "Pending",
          trainingMedicationDate: null,
        },
      });
    }

    return res.status(201).json({ message: "User invited successfully", user });
  } catch (err) {
    console.error("Invite error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 5;
  const skip = (page - 1) * limit;

  try {
    const [totalUsers, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.status(200).json({
      currentPage: page,
      totalPages,
      totalUsers,
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ error: "User does not exist" });
    }

    // Check for email conflict with another user
    const emailInUse = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id },
      },
    });

    if (emailInUse) {
      return res
        .status(400)
        .json({ error: "Email already in use by another user" });
    }

    const previousRole = existingUser.role;
    const previousEmail = existingUser.email;

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, role, status },
    });

    // Role changed from staff → something else: delete Staff record
    if (previousRole === "staff" && role !== "staff") {
      await prisma.staff.deleteMany({ where: { email: previousEmail } });
    }

    // Role changed to staff or already is staff: create or update Staff record
    if (role === "staff") {
      const existingStaff = await prisma.staff.findUnique({ where: { email } });

      if (existingStaff) {
        // Update staff name/email if changed
        await prisma.staff.update({
          where: { email },
          data: {
            name,
            email,
          },
        });
      } else {
        // Create staff if doesn't exist
        await prisma.staff.create({
          data: {
            name,
            email,
            role: "Staff",
            status: "Pending",
            dbsCheckStatus: "Pending",
            dbsExpiryDate: new Date(),
            trainingSafeguardingStatus: "Pending",
            trainingSafeguardingDate: null,
            trainingFirstAidStatus: "Pending",
            trainingFirstAidDate: null,
            trainingMedicationStatus: "Pending",
            trainingMedicationDate: null,
          },
        });
      }
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Hard delete user
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "User not exists" });
    }

    // If the user is a staff, also delete from Staff table
    if (existing.role === "staff") {
      await prisma.staff.deleteMany({ where: { email: existing.email } });
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
