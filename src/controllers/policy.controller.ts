import { Request, Response } from "express";
import prisma from "../config/db";
import fs from "fs";
import path from "path";

export const createPolicy = async (req: any, res: Response) => {
  try {
    const { title, category, version, reviewDate, priority, assignedStaff } =
      req.body;
    const staffArray = Array.isArray(assignedStaff)
      ? assignedStaff
      : [assignedStaff];

    const file = req.file;
    if (!title || !category || !version || !reviewDate || !priority || !file) {
      return res
        .status(400)
        .json({ error: "All fields and document are required" });
    }

    const policy = await prisma.policy.create({
      data: {
        title,
        category,
        version,
        lastUpdated: new Date(reviewDate),
        status: priority,
        assignedStaff: staffArray,
        document: file.filename,
      },
    });

    res.status(201).json({ message: "Policy created", policy });
  } catch (err) {
    console.error("Create policy error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPolicies = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // expects: { id, email, role }

    // Get all policies
    let policies = await prisma.policy.findMany({
      orderBy: { createdAt: "desc" },
    });

    let staff: any = await prisma.staff.findUnique({
      where: { email: user.email },
    });

    // If user is staff, filter policies assigned to them
    if (user.role === "staff") {
      policies = policies.filter(
        (policy: any) =>
          Array.isArray(policy.assignedStaff) &&
          policy.assignedStaff.includes(staff.id)
      );
    }

    // Enhance assignedStaff data for each policy
    const enhancedPolicies = await Promise.all(
      policies.map(async (policy: any) => {
        let assignedStaffData: any = [];

        if (
          Array.isArray(policy.assignedStaff) &&
          policy.assignedStaff.length > 0
        ) {
          assignedStaffData = await prisma.staff.findMany({
            where: { id: { in: policy.assignedStaff } },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          });
        }

        return {
          ...policy,
          assignedStaff: assignedStaffData,
        };
      })
    );

    res.status(200).json({ policies: enhancedPolicies });
  } catch (err) {
    console.error("List policies error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePolicy = async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, category, version, lastUpdated, status, assignedStaff } =
    req.body;

  try {
    const existingPolicy: any = await prisma.policy.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    let updatedData: any = {
      title,
      category,
      version,
      lastUpdated,
      status,
      assignedStaff,
    };

    if (req.file) {
      // Delete old document
      const oldPath = path.join(
        __dirname,
        "../../documents/policy",
        existingPolicy.document
      );
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      updatedData.document = req.file.filename;
    }

    const updatedPolicy = await prisma.policy.update({
      where: { id },
      data: updatedData,
    });

    res.status(200).json({ message: "Policy updated", policy: updatedPolicy });
  } catch (err) {
    console.error("Update policy error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const policy: any = await prisma.policy.findUnique({ where: { id } });

    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    // Remove the document file from storage
    const filePath = path.join(
      __dirname,
      "../../documents/policy",
      policy.document
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.policy.delete({ where: { id } });

    res.status(200).json({ message: "Policy deleted successfully" });
  } catch (err) {
    console.error("Delete policy error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const acknowledgePolicy = async (req: Request, res: Response) => {
  const { policyId } = req.params;
  const user = (req as any).user; // from your auth middleware

  try {
    // Step 1: Get staff record using the user.id
    const staff = await prisma.staff.findFirst({
      where: { email: user.email },
      select: { id: true },
    });

    if (!staff) {
      return res
        .status(404)
        .json({ message: "Staff record not found for this user." });
    }

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return res.status(404).json({ message: "Policy not found." });
    }

    // Step 2: Check if staff has already acknowledged
    if (policy.acknowledgedStaff.includes(staff.id)) {
      return res
        .status(400)
        .json({ message: "You have already acknowledged this policy." });
    }

    // Step 3: Push staff ID into acknowledgedStaff and increment counter
    const updatedPolicy = await prisma.policy.update({
      where: { id: policyId },
      data: {
        acknowledgedStaff: {
          push: staff.id,
        },
        acknowledgements: policy.acknowledgements + 1,
      },
    });

    return res.status(200).json({
      message: "Policy acknowledged successfully.",
      policy: updatedPolicy,
    });
  } catch (error) {
    console.error("[Acknowledge Policy Error]", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
