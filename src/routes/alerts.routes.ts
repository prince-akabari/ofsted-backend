import express from "express";
import { getAlerts } from "../controllers/alerts.controller";

const alertRoutes = express.Router();

alertRoutes.get("/", getAlerts);

export default alertRoutes;
