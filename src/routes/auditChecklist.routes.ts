import express from "express";
import {
  addAuditChecklist,
  deleteAuditChecklist,
  getAuditChecklists,
  editAuditChecklist,
  getAuditChecklistById,
} from "../controllers/auditChecklist.controller";

const router = express.Router();

router.get("/", getAuditChecklists);
router.post("/", addAuditChecklist);
router.put("/:id", editAuditChecklist);
router.delete("/:id", deleteAuditChecklist);
router.get("/:id", getAuditChecklistById);

export default router;
