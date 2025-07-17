import express from "express";
import {
  addAuditChecklist,
  deleteAuditChecklist,
  getAuditChecklists,
  editAuditChecklist,
} from "../controllers/auditChecklist.controller";

const router = express.Router();

router.get("/", getAuditChecklists);
router.post("/", addAuditChecklist);
router.put("/:id", editAuditChecklist);
router.delete("/:id", deleteAuditChecklist);

export default router;
