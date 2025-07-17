import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import moment from "moment";

const prisma = new PrismaClient();

// Helper to generate alert entries
const generateAlert = async () => {
  try {
    const now = new Date();

    // Get all staff records
    const staffList = await prisma.staff.findMany();

    for (const staff of staffList) {
      // Safeguarding training check
      if (
        staff.trainingSafeguardingDate &&
        staff.trainingSafeguardingDate < now &&
        staff.trainingSafeguardingStatus !== "expired"
      ) {
        await prisma.alert.create({
          data: {
            title: "Training Overdue",
            description: `${staff.name} - Safeguarding training expired on ${moment(staff.trainingSafeguardingDate).format("DD/MM/YYYY")}`,
            severity: "warning",
            category: "Training",
            date: new Date(),
          },
        });

        // Optional: update status if you want
        await prisma.staff.update({
          where: { id: staff.id },
          data: { trainingSafeguardingStatus: "expired" },
        });
      }

      // First Aid training check
      if (
        staff.trainingFirstAidDate &&
        staff.trainingFirstAidDate < now &&
        staff.trainingFirstAidStatus !== "expired"
      ) {
        await prisma.alert.create({
          data: {
            title: "Training Overdue",
            description: `${staff.name} - First Aid training expired on ${moment(staff.trainingFirstAidDate).format("DD/MM/YYYY")}`,
            severity: "warning",
            category: "Training",
            date: new Date(),
          },
        });

        await prisma.staff.update({
          where: { id: staff.id },
          data: { trainingFirstAidStatus: "expired" },
        });
      }

      // Medication training check
      if (
        staff.trainingMedicationDate &&
        staff.trainingMedicationDate < now &&
        staff.trainingMedicationStatus !== "expired"
      ) {
        await prisma.alert.create({
          data: {
            title: "Training Overdue",
            description: `${staff.name} - Medication training expired on ${moment(staff.trainingMedicationDate).format("DD/MM/YYYY")}`,
            severity: "warning",
            category: "Training",
            date: new Date(),
          },
        });

        await prisma.staff.update({
          where: { id: staff.id },
          data: { trainingMedicationStatus: "expired" },
        });
      }
    }

    console.log("Training alert job executed at", new Date().toISOString());
  } catch (error) {
    console.error("Error in training alert cron job:", error);
  }
};

// Run every 5 minutes
cron.schedule("*/1 * * * *", generateAlert);
