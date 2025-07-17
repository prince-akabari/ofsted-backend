import express from "express";

import {
  changePassword,
  getProfile,
  updateProfile,
} from "../controllers/profile.controller";

const router = express.Router();

router.get("/:id", getProfile);
router.put("/:id", updateProfile);
router.put("/change-password/:id", changePassword);

export default router;
