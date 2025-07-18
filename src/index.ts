import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import chalk from "chalk";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import prisma from "./config/db";
import { loggerMiddleware } from "./utils/logger";
import profileRoutes from "./routes/profile.routes";
import staffRoutes from "./routes/staff.routes";
import policyRoutes from "./routes/policy.routes";
import auditChecklistRoutes from "./routes/auditChecklist.routes";
import reportsRoutes from "./routes/report.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import path from "path";
import { authMiddleware } from "./middlewares/authMiddleware";
import { activityLogger } from "./middlewares/activityLogger";
// import "./jobs/alertGenerator"; 
import alertRoutes from "./routes/alerts.routes";

dotenv.config();

const app = express();

// DB CONNECTIVITY CHECK
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log(chalk.green("Connected to PostgreSQL"));
  } catch (err) {
    console.error(chalk.red("Failed to connect to PostgreSQL:"), err);
    process.exit(1);
  }
}
checkDatabaseConnection();

// Middleware
app.use(
  cors({
    origin: "https://ofsted.vercel.app",
    credentials: true,
  })
);
// Root
app.get("/", (_, res) => res.send("OFSTED API Running..."));

app.use(helmet());
app.use(express.json());
app.use(loggerMiddleware);
app.use("/api/auth", authRoutes);
app.use(authMiddleware);
app.use(activityLogger);
// Routes
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/policy", policyRoutes);
app.use("/api/audit-checklist", auditChecklistRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/alerts", alertRoutes);

//
app.use("/documents", express.static(path.join(__dirname, "..", "documents")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(chalk.blueBright(`Server running on port ${PORT}`))
);
