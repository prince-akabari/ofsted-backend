import express from "express";
import { createPolicy, deletePolicy, getPolicies, updatePolicy } from "../controllers/policy.controller";
import { uploadPolicyDocument } from "../middlewares/upload";

const router = express.Router();

router.post("/", uploadPolicyDocument, createPolicy); // multipart/form-data
router.get("/", getPolicies);
router.put("/:id", uploadPolicyDocument, updatePolicy);
router.delete("/:id", deletePolicy);

export default router;
