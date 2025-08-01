import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Set user to active if first login
    if (user.status === "inactive") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: "active",
          lastLogin: new Date(),
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role , homeId: user.homeId},
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token, user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, code } = req.body;

  if (!name || !email || !password || !code) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Find the admin user with this home code
    const admin = await prisma.user.findFirst({
      where: {
        role: "admin",
        homeId: code,
      },
    });

    if (!admin) {
      return res.status(400).json({ error: "Invalid home code" });
    }

    // Hash password and create user (default role: 'staff' or 'readonly')
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default to staff for now — change logic here if you later allow user role selection
    const role = "staff";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: "active",
        homeId: admin.homeId,
      },
    });

    // If staff, also create staff entry
    if (role === "staff") {
      await prisma.staff.create({
        data: {
          name,
          email,
          role: "Staff",
          status: "Active",
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

    return res.status(201).json({
      message: "Account created successfully!",
      user,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

