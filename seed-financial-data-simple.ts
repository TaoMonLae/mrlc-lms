import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Initialize Prisma with PostgreSQL adapter (same as server.ts)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedFinancialData() {
  console.log("🌱 Starting simplified financial data seeding...");

  try {
    // Check if data already exists
    const existingDonors = await prisma.donor.count();
    const existingBudgets = await prisma.budget.count();
    const existingExpenses = await prisma.expense.count();
    const existingDonations = await prisma.donation.count();

    if (existingDonors > 0 && existingBudgets > 0 && existingExpenses > 0 && existingDonations > 0) {
      console.log("\n✅ Financial data already exists in database!");
      console.log(`📊 Current data:`);
      console.log(`   - Donors: ${existingDonors}`);
      console.log(`   - Budgets: ${existingBudgets}`);
      console.log(`   - Expenses: ${existingExpenses}`);
      console.log(`   - Donations: ${existingDonations}`);
      console.log("\n💡 To refresh data, clear the database first or run with --force flag");
      return;
    }

    // Create test users
    console.log("Creating test users...");
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@mrlc.edu" },
      update: {},
      create: {
        email: "admin@mrlc.edu",
        passwordHash: await bcrypt.hash("admin123", 10),
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        isActive: true,
      },
    });

    const accountantUser = await prisma.user.upsert({
      where: { email: "accountant@mrlc.edu" },
      update: {},
      create: {
        email: "accountant@mrlc.edu",
        passwordHash: await bcrypt.hash("accountant123", 10),
        firstName: "Jane",
        lastName: "Smith",
        role: "ACCOUNTANT",
        isActive: true,
      },
    });

    console.log("✅ Users ready");

    // Only create data if it doesn't exist
    if (existingDonors === 0) {
      console.log("Creating sample donors...");
      await Promise.all([
        prisma.donor.create({
          data: {
            donorCode: `DONOR-${new Date().getFullYear()}-0001`,
            name: "Tan Wei Ming",
            email: "tan.weiming@email.com",
            phone: "+60-12-3456-7890",
            donorType: "ALUMNUS",
            category: "Major Donor",
            address: "123 Resident Street",
            city: "Petaling Jaya",
            state: "Selangor",
            postalCode: "46000",
            country: "Malaysia",
            preferredContact: "EMAIL",
            doNotContact: false,
            createdById: accountantUser.id,
            createdByName: accountantUser.firstName + " " + accountantUser.lastName,
            tags: ["alumnus", "regular", "major"],
          },
        }),
        prisma.donor.create({
          data: {
            donorCode: `DONOR-${new Date().getFullYear()}-0002`,
            name: "Siti Fatimah Binti Ali",
            email: "siti.fatimah@corporate.com",
            phone: "+60-19-8765-4321",
            organization: "Tech Solutions Malaysia",
            donorType: "ORGANIZATION",
            category: "Corporate Partner",
            address: "456 Business Center",
            city: "Kuala Lumpur",
            state: "Wilayah Persekutuan",
            postalCode: "50000",
            country: "Malaysia",
            preferredContact: "EMAIL",
            doNotContact: false,
            createdById: accountantUser.id,
            createdByName: accountantUser.firstName + " " + accountantUser.lastName,
            tags: ["corporate", "technology", "partner"],
          },
        }),
        prisma.donor.create({
          data: {
            donorCode: `DONOR-${new Date().getFullYear()}-0003`,
            name: "Dr. Rajesh Kumar",
            email: "dr.rajesh@hospital.com",
            phone: "+60-16-2345-6789",
            donorType: "INDIVIDUAL",
            category: "Supporter",
            address: "789 Medical Garden",
            city: "Ipoh",
            state: "Perak",
            postalCode: "30000",
            country: "Malaysia",
            preferredContact: "PHONE",
            doNotContact: false,
            createdById: accountantUser.id,
            createdByName: accountantUser.firstName + " " + accountantUser.lastName,
            tags: ["individual", "healthcare", "supporter"],
          },
        }),
      ]);
      console.log("✅ Sample donors created");
    }

    if (existingBudgets === 0) {
      console.log("Creating sample budgets...");
      await Promise.all([
        prisma.budget.create({
          data: {
            name: "Annual Budget 2024",
            code: `BUD-${new Date().getFullYear()}-001`,
            description: "Operating budget for fiscal year",
            status: "ACTIVE",
            fiscalYear: new Date().getFullYear(),
            startDate: new Date(`${new Date().getFullYear()}-01-01`),
            endDate: new Date(`${new Date().getFullYear()}-12-31`),
            allocatedAmount: 500000,
            currency: "MYR",
            spentAmount: 325000,
            remainingAmount: 175000,
            category: "OPERATIONAL",
            alertThreshold: 0.8,
            approvedById: adminUser.id,
            approvedByName: adminUser.firstName + " " + adminUser.lastName,
            approvedAt: new Date(`${new Date().getFullYear()}-01-01`),
            tags: ["annual", "operational"],
          },
        }),
        prisma.budget.create({
          data: {
            name: "Education & Resources",
            code: `EDU-${new Date().getFullYear()}-001`,
            description: "Budget for educational materials and resources",
            status: "ACTIVE",
            fiscalYear: new Date().getFullYear(),
            startDate: new Date(`${new Date().getFullYear()}-01-01`),
            endDate: new Date(`${new Date().getFullYear()}-12-31`),
            allocatedAmount: 150000,
            currency: "MYR",
            spentAmount: 120000,
            remainingAmount: 30000,
            category: "ACADEMIC",
            alertThreshold: 0.85,
            approvedById: accountantUser.id,
            approvedByName: accountantUser.firstName + " " + adminUser.lastName,
            approvedAt: new Date(`${new Date().getFullYear()}-02-01`),
            tags: ["education", "resources"],
          },
        }),
      ]);
      console.log("✅ Sample budgets created");
    }

    if (existingExpenses === 0) {
      console.log("Creating sample expenses...");
      const sampleBudgets = await prisma.budget.findMany();
      if (sampleBudgets.length > 0) {
        await prisma.expense.create({
          data: {
            title: "Monthly Office Supplies",
            description: "Stationery, printer paper, and office consumables",
            category: "ADMINISTRATIVE",
            status: "PAID",
            amount: 2500,
            currency: "MYR",
            expenseDate: new Date(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            paidDate: new Date(),
            paymentMethod: "BANK_TRANSFER",
            budgetId: sampleBudgets[0].id,
            submittedById: accountantUser.id,
            submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
            submittedAt: new Date(),
            approvedById: adminUser.id,
            approvedByName: adminUser.firstName + " " + adminUser.lastName,
            approvedAt: new Date(),
            academicYear: new Date().getFullYear().toString(),
            tags: ["office", "supplies", "monthly"],
          },
        });
      }
      console.log("✅ Sample expenses created");
    }

    if (existingDonations === 0) {
      console.log("Creating sample donations...");
      const sampleDonors = await prisma.donor.findMany();
      if (sampleDonors.length > 0) {
        await prisma.donation.create({
          data: {
            donationNumber: `DON-${new Date().getFullYear()}-0001`,
            amount: 5000,
            currency: "MYR",
            donationType: "ONE_TIME",
            status: "PROCESSED",
            donorId: sampleDonors[0].id,
            purpose: "Student scholarship support",
            designation: "Scholarship Fund",
            paymentMethod: "BANK_TRANSFER",
            paymentReference: "BANK-TEST-001",
            donationDate: new Date(),
            receivedDate: new Date(),
            processedDate: new Date(),
            isTaxDeductible: true,
            taxReceiptAmount: 5000,
            acknowledgmentSent: true,
          },
        });
      }
      console.log("✅ Sample donations created");
    }

    console.log("\n🎉 FINANCIAL DATA SEEDING COMPLETED SUCCESSFULLY!");
    console.log("\n📊 SUMMARY:");
    console.log("✅ Test users created (admin, accountant)");
    console.log("✅ Sample financial data populated");
    console.log("\n🔐 TEST LOGIN:");
    console.log("Admin: admin@mrlc.edu / admin123");
    console.log("Accountant: accountant@mrlc.edu / accountant123");
    console.log("\n🌐 NEW PAGES TO TEST:");
    console.log("- Donor List: http://localhost:8000/donors");
    console.log("- Donor Profile: http://localhost:8000/donors/{id}");
    console.log("- Financial Reports: http://localhost:8000/financial/income-expense");
    console.log("\n📊 NEW API ENDPOINTS:");
    console.log("- GET /api/donors");
    console.log("- GET /api/donors/:id");
    console.log("- GET /api/bill-payments");
    console.log("- GET /api/financial-reports/summary");
    console.log("- GET /api/financial-reports/income-expense");
    console.log("\n💡 READY FOR TESTING!");

  } catch (error) {
    console.error("❌ Error seeding financial data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedFinancialData()
  .then(() => {
    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
