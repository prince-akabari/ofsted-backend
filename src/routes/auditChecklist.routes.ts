import express from "express";
import {
  addAuditChecklist,
  deleteAuditChecklist,
  getAuditChecklists,
  editAuditChecklist,
  getAuditChecklistById,
  uploadAuditEvidence,
} from "../controllers/auditChecklist.controller";
import { uploadEvidenceMiddleware } from "../middlewares/uploadEvidence";

const router = express.Router();

router.get("/", getAuditChecklists);
router.post("/", addAuditChecklist);
router.put("/:id", editAuditChecklist);
router.delete("/:id", deleteAuditChecklist);
router.get("/:id", getAuditChecklistById);
router.post(
  "/:id/evidence",
  uploadEvidenceMiddleware,
  uploadAuditEvidence
);
export default router;
