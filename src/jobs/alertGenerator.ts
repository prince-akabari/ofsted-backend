import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import moment from "moment";

const prisma = new PrismaClient();
const now = new Date();

// Helper to check for existing active alerts
const hasExistingAlert = async (staffId: string, title: string) => {
  const existing = await prisma.alert.findFirst({
    where: {
      staffId,
      title,
      status: "active",
    },
  });
  return !!existing;
};

// Main cron function
const generateAlerts = async () => {
  try {
    const staffList = await prisma.staff.findMany();
    const today = new Date();
    const sevenDaysFromNow = moment(today).add(7, "days").toDate();
    const policies = await prisma.policy.findMany();
    const sevenDaysAgo = moment(today).subtract(7, "days").toDate();

    for (const staff of staffList) {
      const alerts: any[] = [];

      // DBS check - warning
      if (
        staff.dbsCheckStatus === "warning" &&
        !(await hasExistingAlert(staff.id, "DBS Check Warning"))
      ) {
        alerts.push({
          title: "DBS Check Warning",
          description: `${staff.name} - DBS check is marked as warning.`,
          severity: "warning",
          category: "DBS - Staff Compliance",
        });
      }

      // ===== Training: Safeguarding =====
      if (
        staff.trainingSafeguardingDate &&
        staff.trainingSafeguardingDate < today &&
        !(await hasExistingAlert(staff.id, "Safeguarding Training Overdue"))
      ) {
        alerts.push({
          title: "Safeguarding Training Overdue",
          description: `${
            staff.name
          } - Safeguarding training expired on ${moment(
            staff.trainingSafeguardingDate
          ).format("DD/MM/YYYY")}`,
          severity: "danger",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingSafeguardingStatus === "pending" &&
        !(await hasExistingAlert(staff.id, "Safeguarding Training Pending"))
      ) {
        alerts.push({
          title: "Safeguarding Training Pending",
          description: `${staff.name} - Safeguarding training is pending.`,
          severity: "warning",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingSafeguardingDate &&
        staff.trainingSafeguardingDate <= sevenDaysFromNow &&
        staff.trainingSafeguardingDate > today &&
        !(await hasExistingAlert(
          staff.id,
          "Safeguarding Training Expiring Soon"
        ))
      ) {
        alerts.push({
          title: "Safeguarding Training Expiring Soon",
          description: `${
            staff.name
          } - Safeguarding training will expire on ${moment(
            staff.trainingSafeguardingDate
          ).format("DD/MM/YYYY")}`,
          severity: "info",
          category: "Training - Staff Compliance",
        });
      }

      // ===== Training: First Aid =====
      if (
        staff.trainingFirstAidDate &&
        staff.trainingFirstAidDate < today &&
        !(await hasExistingAlert(staff.id, "First Aid Training Overdue"))
      ) {
        alerts.push({
          title: "First Aid Training Overdue",
          description: `${staff.name} - First Aid training expired on ${moment(
            staff.trainingFirstAidDate
          ).format("DD/MM/YYYY")}`,
          severity: "danger",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingFirstAidStatus === "pending" &&
        !(await hasExistingAlert(staff.id, "First Aid Training Pending"))
      ) {
        alerts.push({
          title: "First Aid Training Pending",
          description: `${staff.name} - First Aid training is pending.`,
          severity: "warning",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingFirstAidDate &&
        staff.trainingFirstAidDate <= sevenDaysFromNow &&
        staff.trainingFirstAidDate > today &&
        !(await hasExistingAlert(staff.id, "First Aid Training Expiring Soon"))
      ) {
        alerts.push({
          title: "First Aid Training Expiring Soon",
          description: `${
            staff.name
          } - First Aid training will expire on ${moment(
            staff.trainingFirstAidDate
          ).format("DD/MM/YYYY")}`,
          severity: "info",
          category: "Training - Staff Compliance",
        });
      }

      // ===== Training: Medication =====
      if (
        staff.trainingMedicationDate &&
        staff.trainingMedicationDate < today &&
        !(await hasExistingAlert(staff.id, "Medication Training Overdue"))
      ) {
        alerts.push({
          title: "Medication Training Overdue",
          description: `${staff.name} - Medication training expired on ${moment(
            staff.trainingMedicationDate
          ).format("DD/MM/YYYY")}`,
          severity: "danger",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingMedicationStatus === "pending" &&
        !(await hasExistingAlert(staff.id, "Medication Training Pending"))
      ) {
        alerts.push({
          title: "Medication Training Pending",
          description: `${staff.name} - Medication training is pending.`,
          severity: "warning",
          category: "Training - Staff Compliance",
        });
      } else if (
        staff.trainingMedicationDate &&
        staff.trainingMedicationDate <= sevenDaysFromNow &&
        staff.trainingMedicationDate > today &&
        !(await hasExistingAlert(staff.id, "Medication Training Expiring Soon"))
      ) {
        alerts.push({
          title: "Medication Training Expiring Soon",
          description: `${
            staff.name
          } - Medication training will expire on ${moment(
            staff.trainingMedicationDate
          ).format("DD/MM/YYYY")}`,
          severity: "info",
          category: "Training - Staff Compliance",
        });
      }

      // ===== Staff Status: overdue or warning =====
      if (
        staff.status === "overdue" &&
        !(await hasExistingAlert(staff.id, "Staff Overdue"))
      ) {
        alerts.push({
          title: "Staff Overdue",
          description: `${staff.name} - Staff is marked as overdue.`,
          severity: "danger",
          category: "Status - Staff Compliance",
        });
      } else if (
        staff.status === "warning" &&
        !(await hasExistingAlert(staff.id, "Staff Warning"))
      ) {
        alerts.push({
          title: "Staff Warning",
          description: `${staff.name} - Staff is marked as warning.`,
          severity: "warning",
          category: "Status - Staff Compliance",
        });
      }

      // ========== POLICY ALERTS ==========
      for (const policy of policies) {
        const isAssigned = policy.assignedStaff.includes(staff.id);
        const isAcknowledged = policy.acknowledgedStaff.includes(staff.id);

        if (isAssigned && !isAcknowledged) {
          let severity = "info";

          if (moment(policy.lastUpdated).isBefore(sevenDaysAgo)) {
            const total = policy.assignedStaff.length;
            const ack = policy.acknowledgedStaff.length;

            if (ack === 0) {
              severity = "danger";
            } else {
              severity = "warning";
            }
          }

          const title = `Policy Acknowledgement Pending - ${policy.title}`;
          if (!(await hasExistingAlert(staff.id, title))) {
            alerts.push({
              title,
              description: `${staff.name} has not acknowledged policy "${
                policy.title
              }" updated on ${moment(policy.lastUpdated).format("DD/MM/YYYY")}`,
              severity,
              category: policy.category + " - Policies",
            });
          }
        }
      }

      // ===== Save Alerts =====
      for (const alert of alerts) {
        await prisma.alert.create({
          data: {
            ...alert,
            staffId: staff.id,
            date: today,
            status: "active",
          },
        });
      }
    }

    console.log("Alert cron ran at", today.toISOString());
  } catch (error) {
    console.error("Cron Job Error:", error);
  }
};

// Run every minute
cron.schedule("*/1 * * * *", generateAlerts);
