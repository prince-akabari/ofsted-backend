import express from "express";
import {
  inviteUser,
  getUsers,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";

const router = express.Router();

router.post("/invite", inviteUser);
router.get("/", getUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
