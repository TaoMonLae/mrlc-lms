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
  console.log("🌱 Starting financial data seeding...");

  try {
    // Create test users with financial permissions
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

    console.log("✅ Users created");

    // Create Budgets
    console.log("Creating budgets...");
    const budget2024 = await prisma.budget.upsert({
      where: { code: "BUD-2024-001" },
      create: {
        name: "Annual Budget 2024",
        code: "BUD-2024-001",
        description: "Operating budget for fiscal year 2024",
        status: "ACTIVE",
        fiscalYear: 2024,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        allocatedAmount: 500000,
        currency: "MYR",
        spentAmount: 325000,
        remainingAmount: 175000,
        category: "OPERATIONAL",
        alertThreshold: 0.8,
        approvedById: adminUser.id,
        approvedByName: adminUser.firstName + " " + adminUser.lastName,
        approvedAt: new Date("2024-01-01"),
        tags: ["annual", "operational", "2024"],
      },
      update: {},
    });

    const budget2025 = await prisma.budget.create({
      data: {
        name: "Annual Budget 2025",
        code: "BUD-2025-001",
        description: "Operating budget for fiscal year 2025",
        status: "ACTIVE",
        fiscalYear: 2025,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        allocatedAmount: 600000,
        currency: "MYR",
        spentAmount: 285000,
        remainingAmount: 315000,
        category: "OPERATIONAL",
        alertThreshold: 0.8,
        approvedById: adminUser.id,
        approvedByName: adminUser.firstName + " " + adminUser.lastName,
        approvedAt: new Date("2025-01-01"),
        tags: ["annual", "operating", "2025"],
      },
    });

    const educationBudget = await prisma.budget.create({
      data: {
        name: "Education & Resources 2024",
        code: "EDU-2024-001",
        description: "Budget for educational materials and resources",
        status: "ACTIVE",
        fiscalYear: 2024,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        allocatedAmount: 150000,
        currency: "MYR",
        spentAmount: 120000,
        remainingAmount: 30000,
        category: "ACADEMIC",
        alertThreshold: 0.85,
        approvedById: accountantUser.id,
        approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
        approvedAt: new Date("2024-02-01"),
        tags: ["education", "resources", "2024"],
      },
    });

    console.log("✅ Budgets created");

    // Create Vendors
    console.log("Creating vendors...");
    const vendors = await Promise.all([
      prisma.vendor.create({
        data: {
          name: "ABC Office Supplies Sdn Bhd",
          code: "VEN-2024-001",
          description: "Office supplies and stationery provider",
          contactPerson: "John Lee",
          email: "sales@abcoffice.com.my",
          phone: "+60-3-1234-5678",
          address: "123 Business Street, Level 3",
          city: "Kuala Lumpur",
          state: "Wilayah Persekutuan",
          postalCode: "50000",
          country: "Malaysia",
          category: "Office Supplies",
          paymentTerms: "NET 30",
          isActive: true,
          totalPurchases: 15000,
          purchaseCount: 8,
          lastPurchaseDate: new Date("2024-06-15"),
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["office", "supplies", "stationery"],
        },
      }),
      prisma.vendor.create({
        data: {
          name: "Tech Solutions Malaysia",
          code: "VEN-2024-002",
          description: "IT equipment and software solutions",
          contactPerson: "Sarah Chen",
          email: "contact@techsolutions.my",
          phone: "+60-3-9876-5432",
          address: "456 Tech Park, Block B",
          city: "Cyberjaya",
          state: "Selangor",
          postalCode: "63000",
          country: "Malaysia",
          category: "Technology",
          paymentTerms: "NET 45",
          isActive: true,
          totalPurchases: 45000,
          purchaseCount: 3,
          lastPurchaseDate: new Date("2024-05-20"),
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["technology", "it", "software"],
        },
      }),
      prisma.vendor.create({
        data: {
          name: "Fresh Food Catering Service",
          code: "VEN-2024-003",
          description: "Halal certified catering for events and daily meals",
          contactPerson: "Ahmad Ibrahim",
          email: "orders@freshfood.com.my",
          phone: "+60-3-4567-8901",
          address: "789 Food Industrial Area",
          city: "Shah Alam",
          state: "Selangor",
          postalCode: "40000",
          country: "Malaysia",
          category: "Food & Catering",
          paymentTerms: "COD",
          taxId: "GST-1234567890",
          isActive: true,
          totalPurchases: 28000,
          purchaseCount: 25,
          lastPurchaseDate: new Date("2024-06-20"),
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["catering", "food", "halal"],
        },
      }),
      prisma.vendor.create({
        data: {
          name: "CleanPro Services",
          code: "VEN-2024-004",
          description: "Professional cleaning and maintenance services",
          contactPerson: "Raj Kumar",
          email: "info@cleanpro.com.my",
          phone: "+60-3-2345-6789",
          address: "321 Service Center",
          city: "Petaling Jaya",
          state: "Selangor",
          postalCode: "46000",
          country: "Malaysia",
          category: "Maintenance",
          paymentTerms: "NET 30",
          isActive: true,
          totalPurchases: 8500,
          purchaseCount: 12,
          lastPurchaseDate: new Date("2024-06-10"),
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["cleaning", "maintenance", "services"],
        },
      }),
      prisma.vendor.create({
        data: {
          name: "Education Books Ltd",
          code: "VEN-2024-005",
          description: "Academic books and educational materials supplier",
          contactPerson: "Lim Siew Ling",
          email: "orders@edubooks.com.my",
          phone: "+60-4-1234-5678",
          address: "555 Academic Mall",
          city: "Penang",
          state: "Penang",
          postalCode: "10000",
          country: "Malaysia",
          category: "Education",
          paymentTerms: "NET 60",
          isActive: true,
          totalPurchases: 22000,
          purchaseCount: 6,
          lastPurchaseDate: new Date("2024-04-15"),
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["education", "books", "academic"],
        },
      }),
    ]);

    console.log("✅ Vendors created");

    // Create Expenses
    console.log("Creating expenses...");
    const expenses = await Promise.all([
      prisma.expense.create({
        data: {
          title: "Monthly Office Supplies",
          description: "Stationery, printer paper, and office consumables",
          category: "ADMINISTRATIVE",
          status: "PAID",
          amount: 2500,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 2500,
          expenseDate: new Date("2024-06-01"),
          dueDate: new Date("2024-06-15"),
          paidDate: new Date("2024-06-10"),
          vendorId: vendors[0].id,
          vendorInvoiceNo: "INV-2024-0601",
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-2024-0601",
          budgetId: budget2024.id,
          submittedById: accountantUser.id,
          submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
          submittedAt: new Date("2024-06-01"),
          approvedById: adminUser.id,
          approvedByName: adminUser.firstName + " " + adminUser.lastName,
          approvedAt: new Date("2024-06-05"),
          academicYear: "2024",
          term: "Term 2",
          tags: ["office", "supplies", "monthly"],
        },
      }),
      prisma.expense.create({
        data: {
          title: "Computer Lab Equipment Upgrade",
          description: "10 new computers for student computer lab",
          category: "TECHNOLOGY",
          status: "PAID",
          amount: 35000,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 35000,
          expenseDate: new Date("2024-05-15"),
          dueDate: new Date("2024-06-30"),
          paidDate: new Date("2024-06-20"),
          vendorId: vendors[1].id,
          vendorInvoiceNo: "TECH-2024-0515",
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-2024-0515",
          budgetId: budget2024.id,
          submittedById: accountantUser.id,
          submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
          submittedAt: new Date("2024-05-15"),
          approvedById: adminUser.id,
          approvedByName: adminUser.firstName + " " + adminUser.lastName,
          approvedAt: new Date("2024-05-20"),
          academicYear: "2024",
          tags: ["technology", "computers", "lab"],
        },
      }),
      prisma.expense.create({
        data: {
          title: "Staff Training Event Catering",
          description: "Lunch and refreshments for staff development day",
          category: "FOOD_CATERING",
          status: "PAID",
          amount: 1800,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 1800,
          expenseDate: new Date("2024-06-20"),
          dueDate: new Date("2024-06-25"),
          paidDate: new Date("2024-06-25"),
          vendorId: vendors[2].id,
          vendorInvoiceNo: "CAT-2024-0620",
          paymentMethod: "CASH",
          paymentReference: "CASH-2024-0620",
          budgetId: budget2024.id,
          submittedById: accountantUser.id,
          submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
          submittedAt: new Date("2024-06-20"),
          approvedById: adminUser.id,
          approvedByName: adminUser.firstName + " " + adminUser.lastName,
          approvedAt: new Date("2024-06-22"),
          academicYear: "2024",
          tags: ["catering", "training", "staff"],
        },
      }),
      prisma.expense.create({
        data: {
          title: "Building Maintenance Services",
          description: "Monthly cleaning and minor repairs",
          category: "FACILITY",
          status: "APPROVED",
          amount: 3500,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 3500,
          expenseDate: new Date("2024-06-01"),
          dueDate: new Date("2024-07-15"),
          vendorId: vendors[3].id,
          vendorInvoiceNo: "MAIN-2024-0601",
          paymentMethod: "BANK_TRANSFER",
          budgetId: budget2024.id,
          submittedById: accountantUser.id,
          submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
          submittedAt: new Date("2024-06-01"),
          approvedById: adminUser.id,
          approvedByName: adminUser.firstName + " " + adminUser.lastName,
          approvedAt: new Date("2024-06-10"),
          academicYear: "2024",
          tags: ["maintenance", "cleaning", "monthly"],
        },
      }),
      prisma.expense.create({
        data: {
          title: "GED Study Materials Purchase",
          description: "GED preparation books and practice tests",
          category: "ACADEMIC",
          status: "PAID",
          amount: 4500,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 4500,
          expenseDate: new Date("2024-04-15"),
          dueDate: new Date("2024-05-15"),
          paidDate: new Date("2024-05-01"),
          vendorId: vendors[4].id,
          vendorInvoiceNo: "EDU-2024-0415",
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-2024-0415",
          budgetId: educationBudget.id,
          submittedById: accountantUser.id,
          submittedByName: accountantUser.firstName + " " + accountantUser.lastName,
          submittedAt: new Date("2024-04-15"),
          approvedById: adminUser.id,
          approvedByName: adminUser.firstName + " " + adminUser.lastName,
          approvedAt: new Date("2024-04-20"),
          academicYear: "2024",
          relatedSubjectId: "GED",
          tags: ["education", "ged", "books"],
        },
      }),
    ]);

    console.log("✅ Expenses created");

    // Create Bill Payments
    console.log("Creating bill payments...");
    const billPayments = await Promise.all([
      prisma.billPayment.create({
        data: {
          expenseId: expenses[0].id,
          paymentNumber: "PAY-2024-0001",
          amount: 2500,
          currency: "MYR",
          paymentMethod: "BANK_TRANSFER",
          paymentDate: new Date("2024-06-10"),
          referenceNumber: "BNK-MYR-2024-0601",
          bankAccount: "School Operating Account",
          receiptUrl: "/receipts/pay-2024-0001.pdf",
          approvedById: accountantUser.id,
          approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
          approvedAt: new Date("2024-06-11"),
        },
      }),
      prisma.billPayment.create({
        data: {
          expenseId: expenses[1].id,
          paymentNumber: "PAY-2024-0002",
          amount: 35000,
          currency: "MYR",
          paymentMethod: "BANK_TRANSFER",
          paymentDate: new Date("2024-06-20"),
          referenceNumber: "BNK-MYR-2024-0620",
          bankAccount: "School Operating Account",
          approvedById: accountantUser.id,
          approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
          approvedAt: new Date("2024-06-21"),
        },
      }),
      prisma.billPayment.create({
        data: {
          expenseId: expenses[2].id,
          paymentNumber: "PAY-2024-0003",
          amount: 1800,
          currency: "MYR",
          paymentMethod: "CASH",
          paymentDate: new Date("2024-06-25"),
          referenceNumber: "CASH-REC-2024-0625",
          approvedById: accountantUser.id,
          approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
          approvedAt: new Date("2024-06-26"),
        },
      }),
    ]);

    console.log("✅ Bill payments created");

    // Create Donation Campaigns
    console.log("Creating donation campaigns...");
    const campaigns = await Promise.all([
      prisma.donationCampaign.create({
        data: {
          name: "2024 Student Scholarship Fund",
          description: "Support deserving students with scholarships for the 2024 academic year",
          goalAmount: 100000,
          currency: "MYR",
          status: "ACTIVE",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          targetAudience: "ALUMNI",
          raisedAmount: 45000,
          donorCount: 35,
          coverImage: "/images/campaigns/scholarship-2024.jpg",
          createdById: adminUser.id,
          createdByName: adminUser.firstName + " " + adminUser.lastName,
          tags: ["scholarship", "students", "2024"],
        },
      }),
      prisma.donationCampaign.create({
        data: {
          name: "Library Enhancement Project",
          description: "Upgrade library facilities and add new book collections",
          goalAmount: 50000,
          currency: "MYR",
          status: "ACTIVE",
          startDate: new Date("2024-03-01"),
          endDate: new Date("2024-12-31"),
          targetAudience: "PUBLIC",
          raisedAmount: 32500,
          donorCount: 48,
          createdById: adminUser.id,
          createdByName: adminUser.firstName + " " + adminUser.lastName,
          tags: ["library", "education", "books"],
        },
      }),
      prisma.donationCampaign.create({
        data: {
          name: "Technology Upgrade Fund",
          description: "Support school technology infrastructure improvements",
          goalAmount: 75000,
          currency: "MYR",
          status: "ACTIVE",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-06-30"),
          targetAudience: "CORPORATE",
          raisedAmount: 68000,
          donorCount: 12,
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["technology", "infrastructure", "corporate"],
        },
      }),
    ]);

    console.log("✅ Donation campaigns created");

    // Create Donors
    console.log("Creating donors...");
    const donors = await Promise.all([
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0001",
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
          taxId: "123456789012",
          receiptPreference: "EMAIL",
          isActive: true,
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["alumnus", "regular", "major"],
        },
      }),
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0002",
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
          taxId: "987654321012",
          isActive: true,
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["corporate", "technology", "partner"],
        },
      }),
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0003",
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
          isActive: true,
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["individual", "healthcare", "supporter"],
        },
      }),
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0004",
          name: "Lim Family Foundation",
          email: "contact@limfamily.org",
          phone: "+60-12-9876-5432",
          donorType: "ORGANIZATION",
          category: "Major Donor",
          address: "321 Foundation Tower",
          city: "George Town",
          state: "Penang",
          postalCode: "10000",
          country: "Malaysia",
          preferredContact: "EMAIL",
          taxId: "555555555555",
          isActive: true,
          createdById: adminUser.id,
          createdByName: adminUser.firstName + " " + adminUser.lastName,
          tags: ["foundation", "major", "education"],
        },
      }),
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0005",
          name: "Chen Mei Ling",
          email: "chen.meiling@email.com",
          phone: "+60-17-3456-7890",
          donorType: "PARENT",
          category: "Regular Supporter",
          address: "555 Residential Area",
          city: "Subang Jaya",
          state: "Selangor",
          postalCode: "47500",
          country: "Malaysia",
          preferredContact: "EMAIL",
          isActive: true,
          createdById: accountantUser.id,
          createdByName: adminUser.firstName + " " + adminUser.lastName,
          tags: ["parent", "regular", "community"],
        },
      }),
      prisma.donor.create({
        data: {
          donorCode: "DONOR-2024-0006",
          name: "Ahmad bin Hassan",
          email: "ahmad.hassan@email.com",
          phone: "+60-13-8765-4321",
          donorType: "ALUMNUS",
          category: "Regular Supporter",
          address: "999 Alumnus Gardens",
          city: "Johor Bahru",
          state: "Johor",
          postalCode: "80000",
          country: "Malaysia",
          preferredContact: "PHONE",
          isActive: true,
          createdById: accountantUser.id,
          createdByName: accountantUser.firstName + " " + accountantUser.lastName,
          tags: ["alumnus", "regular", "johor"],
        },
      }),
    ]);

    console.log("✅ Donors created");

    // Create Donations
    console.log("Creating donations...");
    const donations = await Promise.all([
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0001",
          amount: 5000,
          currency: "MYR",
          donationType: "ONE_TIME",
          status: "PROCESSED",
          donorId: donors[0].id,
          purpose: "Student scholarship support",
          designation: "Scholarship Fund",
          campaignId: campaigns[0].id,
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-TWM-2024-001",
          donationDate: new Date("2024-02-15"),
          receivedDate: new Date("2024-02-16"),
          processedDate: new Date("2024-02-18"),
          isTaxDeductible: true,
          taxReceiptAmount: 5000,
          acknowledgmentSent: true,
        },
      }),
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0002",
          amount: 15000,
          currency: "MYR",
          donationType: "ONE_TIME",
          status: "PROCESSED",
          donorId: donors[1].id,
          purpose: "Technology infrastructure support",
          designation: "Computer Lab",
          campaignId: campaigns[2].id,
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-TSM-2024-001",
          donationDate: new Date("2024-03-10"),
          receivedDate: new Date("2024-03-12"),
          processedDate: new Date("2024-03-15"),
          isTaxDeductible: true,
          taxReceiptAmount: 15000,
          acknowledgmentSent: true,
        },
      }),
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0003",
          amount: 2500,
          currency: "MYR",
          donationType: "ONE_TIME",
          status: "PROCESSED",
          donorId: donors[2].id,
          purpose: "Library book collection",
          designation: "Library Resources",
          campaignId: campaigns[1].id,
          paymentMethod: "CASH",
          paymentReference: "CASH-RK-2024-001",
          donationDate: new Date("2024-04-05"),
          receivedDate: new Date("2024-04-05"),
          processedDate: new Date("2024-04-06"),
          isTaxDeductible: true,
          taxReceiptAmount: 2500,
          acknowledgmentSent: true,
        },
      }),
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0004",
          amount: 10000,
          currency: "MYR",
          donationType: "RECURRING_YEARLY",
          status: "PROCESSED",
          donorId: donors[3].id,
          purpose: "Annual scholarship endowment",
          designation: "Scholarship Endowment",
          campaignId: campaigns[0].id,
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-LFF-2024-001",
          donationDate: new Date("2024-01-15"),
          receivedDate: new Date("2024-01-16"),
          processedDate: new Date("2024-01-18"),
          isTaxDeductible: true,
          taxReceiptAmount: 10000,
          acknowledgmentSent: true,
        },
      }),
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0005",
          amount: 1000,
          currency: "MYR",
          donationType: "ONE_TIME",
          status: "RECEIVED",
          donorId: donors[4].id,
          purpose: "General school support",
          designation: "General Fund",
          paymentMethod: "ONLINE_PAYMENT",
          paymentReference: "ONLINE-CML-2024-001",
          donationDate: new Date("2024-06-20"),
          receivedDate: new Date("2024-06-21"),
          isTaxDeductible: true,
          taxReceiptAmount: 1000,
          acknowledgmentSent: false,
        },
      }),
      prisma.donation.create({
        data: {
          donationNumber: "DON-2024-0006",
          amount: 3000,
          currency: "MYR",
          donationType: "ONE_TIME",
          status: "PROCESSED",
          donorId: donors[5].id,
          purpose: "Technology equipment",
          designation: "Technology Fund",
          campaignId: campaigns[2].id,
          paymentMethod: "BANK_TRANSFER",
          paymentReference: "BANK-AH-2024-001",
          donationDate: new Date("2024-05-25"),
          receivedDate: new Date("2024-05-26"),
          processedDate: new Date("2024-05-28"),
          isTaxDeductible: true,
          taxReceiptAmount: 3000,
          acknowledgmentSent: true,
        },
      }),
    ]);

    console.log("✅ Donations created");

    // Create Donation Receipts
    console.log("Creating donation receipts...");
    await Promise.all([
      prisma.donationReceipt.create({
        data: {
          donationId: donations[0].id,
          receiptNumber: "TAX-2024-0001",
          receiptDate: new Date("2024-02-18"),
          recipientName: donors[0].name,
          recipientAddress: donors[0].address,
          recipientEmail: donors[0].email,
          amount: 5000,
          currency: "MYR",
          isTaxDeductible: true,
          taxDeductibleAmount: 5000,
          taxId: donors[0].taxId,
        },
      }),
      prisma.donationReceipt.create({
        data: {
          donationId: donations[1].id,
          receiptNumber: "TAX-2024-0002",
          receiptDate: new Date("2024-03-15"),
          recipientName: donors[1].name,
          recipientAddress: donors[1].address,
          recipientEmail: donors[1].email,
          amount: 15000,
          currency: "MYR",
          isTaxDeductible: true,
          taxDeductibleAmount: 15000,
          taxId: donors[1].taxId,
        },
      }),
      prisma.donationReceipt.create({
        data: {
          donationId: donations[2].id,
          receiptNumber: "TAX-2024-0003",
          receiptDate: new Date("2024-04-06"),
          recipientName: donors[2].name,
          recipientAddress: donors[2].address,
          recipientEmail: donors[2].email,
          amount: 2500,
          currency: "MYR",
          isTaxDeductible: true,
          taxDeductibleAmount: 2500,
          taxId: donors[2].taxId,
        },
      }),
      prisma.donationReceipt.create({
        data: {
          donationId: donations[3].id,
          receiptNumber: "TAX-2024-0004",
          receiptDate: new Date("2024-01-18"),
          recipientName: donors[3].name,
          recipientAddress: donors[3].address,
          recipientEmail: donors[3].email,
          amount: 10000,
          currency: "MYR",
          isTaxDeductible: true,
          taxDeductibleAmount: 10000,
          taxId: donors[3].taxId,
        },
      }),
    ]);

    console.log("✅ Donation receipts created");

    // Create Recurring Expenses
    console.log("Creating recurring expenses...");
    await Promise.all([
      prisma.recurringExpense.create({
        data: {
          title: "Monthly Internet Service",
          description: "High-speed internet for school operations",
          category: "TECHNOLOGY",
          status: "APPROVED",
          amount: 800,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 800,
          vendorId: vendors[1].id,
          frequency: "MONTHLY",
          startDate: new Date("2024-01-01"),
          dayOfMonth: 1,
          paymentMethod: "BANK_TRANSFER",
          budgetId: budget2024.id,
          approvedById: accountantUser.id,
          approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
          approvedAt: new Date("2024-01-01"),
          nextOccurrenceDate: new Date("2024-07-01"),
          lastGeneratedDate: new Date("2024-06-01"),
          totalGenerated: 6,
          tags: ["technology", "internet", "monthly"],
        },
      }),
      prisma.recurringExpense.create({
        data: {
          title: "Quarterly Maintenance Service",
          description: "Building maintenance and inspection",
          category: "FACILITY",
          status: "APPROVED",
          amount: 2500,
          currency: "MYR",
          taxAmount: 0,
          totalAmount: 2500,
          vendorId: vendors[3].id,
          frequency: "QUARTERLY",
          startDate: new Date("2024-01-01"),
          dayOfMonth: 15,
          paymentMethod: "BANK_TRANSFER",
          budgetId: budget2024.id,
          approvedById: accountantUser.id,
          approvedByName: accountantUser.firstName + " " + accountantUser.lastName,
          approvedAt: new Date("2024-01-01"),
          nextOccurrenceDate: new Date("2024-07-15"),
          lastGeneratedDate: new Date("2024-04-15"),
          totalGenerated: 2,
          tags: ["maintenance", "quarterly", "facility"],
        },
      }),
    ]);

    console.log("✅ Recurring expenses created");

    console.log("\n🎉 FINANCIAL DATA SEEDING COMPLETED SUCCESSFULLY!");
    console.log("\n📊 SUMMARY:");
    console.log("✅ Users: 2 (admin, accountant)");
    console.log("✅ Budgets: 3 (2024, 2025, Education)");
    console.log("✅ Vendors: 5 (various categories)");
    console.log("✅ Expenses: 5 (different categories and statuses)");
    console.log("✅ Bill Payments: 3 (linked to expenses)");
    console.log("✅ Campaigns: 3 (scholarship, library, technology)");
    console.log("✅ Donors: 6 (individuals and organizations)");
    console.log("✅ Donations: 6 (with various statuses)");
    console.log("✅ Donation Receipts: 4 (tax receipts issued)");
    console.log("✅ Recurring Expenses: 2 (monthly and quarterly)");
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
    console.log("- POST /api/donors");
    console.log("- GET /api/bill-payments");
    console.log("- GET /api/financial-reports/summary");
    console.log("- GET /api/financial-reports/income-expense");
    console.log("- GET /api/financial-reports/budget-vs-actual");
    console.log("- GET /api/financial-reports/cash-flow");
    console.log("- POST /api/donations/:id/acknowledge");
    console.log("- POST /api/donations/:id/tax-receipt");
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
