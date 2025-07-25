import express from "express";
import {
  createStaff,
  deleteStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  updateStaffRecords,
} from "../controllers/staff.controller";

const router = express.Router();
router.get("/", getAllStaff);
router.get("/:id", getStaffById);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);
router.post("/:id/update-records", updateStaffRecords);

export default router;
