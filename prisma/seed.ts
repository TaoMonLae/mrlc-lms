import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Prisma 7 setup with pg adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Create School Profile
  const school = await prisma.schoolProfile.create({
    data: {
      name: "Mon Refugee Learning Centre - GED School",
      address: "Kuala Lumpur, Malaysia",
      contactEmail: "admin@mrlc.edu",
      contactPhone: "+60 12-345-6789",
      establishedYear: 2024,
    },
  });
  console.log(`Created school profile: ${school.name}`);

  // 2. Create Initial Admin User
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mrlc.edu" },
    update: {},
    create: {
      email: "admin@mrlc.edu",
      passwordHash: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.email} (Password: admin123)`);

  // 3. Create a Demo Teacher
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@mrlc.edu" },
    update: {},
    create: {
      email: "teacher@mrlc.edu",
      passwordHash: teacherPassword,
      firstName: "Tao",
      lastName: "Mon Lae",
      role: "TEACHER",
      isActive: true,
      teacherProfile: {
        create: {
          teacherCode: "T-001",
          specialization: "Mathematics & Science",
        },
      },
    },
  });
  console.log(`Created teacher user: ${teacherUser.email}`);

  // 4. Create a Demo Student
  const studentPassword = await bcrypt.hash("student123", 10);
  const studentUser = await prisma.user.upsert({
    where: { email: "student@mrlc.edu" },
    update: {},
    create: {
      email: "student@mrlc.edu",
      passwordHash: studentPassword,
      firstName: "Min Khant",
      lastName: "Aung",
      role: "STUDENT",
      isActive: true,
      studentProfile: {
        create: {
          studentCode: "STD-2024-001",
          dateOfBirth: new Date("2005-05-15"),
          guardianName: "U Aung",
          guardianPhone: "+60 11-222-3333",
        },
      },
    },
  });
  console.log(`Created student user: ${studentUser.email}`);

  // Need to get the teacher profile ID for relations
  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: teacherUser.id }
  });

  if (!teacherProfile) {
    throw new Error("Teacher profile was not created properly.");
  }

  // 5. Create a Class
  const preGedClass = await prisma.class.create({
    data: {
      name: "Pre-GED Foundation",
      level: "Foundation",
      academicYear: "2024-2025",
      room: "Room A1",
      capacity: 30,
      teachers: {
        create: [{ teacherId: teacherProfile.id }],
      },
    },
  });
  console.log(`Created class: ${preGedClass.name}`);

  // Need to link the student directly since the studentProfile was created separately
  const studentProfile = await prisma.student.findUnique({
    where: { userId: studentUser.id }
  });
  
  if (studentProfile) {
    await prisma.student.update({
      where: { id: studentProfile.id },
      data: { classId: preGedClass.id }
    });
    console.log("Linked student to class.");
  }

  // 6. Create Subjects
  const mathSubject = await prisma.subject.create({
    data: {
      name: "Mathematics",
      code: "MATH101",
      description: "Basic Algebra and Geometry",
      teachers: {
        create: [{ teacherId: teacherProfile.id }],
      },
    },
  });
  console.log(`Created subject: ${mathSubject.name}`);

  console.log("Seeding complete! 🌱");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
