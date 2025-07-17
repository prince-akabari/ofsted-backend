import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db"; 

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({
      name: user.name,
      email: user.email,
      role: user.role,
      joinDate: user.createdAt.toISOString().split("T")[0],
      lastLogin: user.lastLogin
        ? user.lastLogin.toISOString().split("T")[0]
        : null,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const existing = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: id },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: { name, email },
    });

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: id } });

    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Incorrect current password" });

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: id },
      data: { password: hashed },
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
