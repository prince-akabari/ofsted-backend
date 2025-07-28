import express from "express";
import { dismissAlert, getAlerts } from "../controllers/alerts.controller";

const alertRoutes = express.Router();

alertRoutes.get("/", getAlerts);
alertRoutes.delete("/:id", dismissAlert);

export default alertRoutes;
