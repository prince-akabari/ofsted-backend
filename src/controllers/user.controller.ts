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

    return res.status(201).json({ message: "User invited successfully", user });
  } catch (err) {
    console.error("Invite error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get all users
export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(users);
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, role, status },
    });

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
      return res.status(409).json({ error: "User not exists" });
    }
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
