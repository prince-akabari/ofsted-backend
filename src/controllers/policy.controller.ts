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
    const policies = await prisma.policy.findMany({
      orderBy: { createdAt: "desc" },
    });

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
