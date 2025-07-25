import express from "express";
import {
  acknowledgePolicy,
  createPolicy,
  deletePolicy,
  getPolicies,
  updatePolicy,
} from "../controllers/policy.controller";
import { uploadPolicyDocument } from "../middlewares/upload";

const router = express.Router();

router.post("/", uploadPolicyDocument, createPolicy); // multipart/form-data
router.get("/", getPolicies);
router.put("/:id", uploadPolicyDocument, updatePolicy);
router.delete("/:id", deletePolicy);
router.post("/:policyId/acknowledge", acknowledgePolicy);

export default router;
