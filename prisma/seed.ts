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

  // 1. Create School Profile (find-or-create — no unique column to upsert on)
  const school =
    (await prisma.schoolProfile.findFirst()) ??
    (await prisma.schoolProfile.create({
      data: {
        name: "Mon Refugee Learning Centre - GED School",
        address: "Kuala Lumpur, Malaysia",
        contactEmail: "admin@mrlc.edu",
        contactPhone: "+60 12-345-6789",
        establishedYear: 2024,
      },
    }));
  console.log(`School profile: ${school.name}`);

  // 2. Create Initial Admin User.
  //    Passwords come from env vars when provided; otherwise a demo default is
  //    used and the account is flagged to force a password change on first login.
  //    The actual password is never printed to the logs.
  const adminPw = process.env.SEED_ADMIN_PASSWORD;
  const adminMustChange = !adminPw;
  const admin = await prisma.user.upsert({
    where: { email: "admin@mrlc.edu" },
    update: {},
    create: {
      email: "admin@mrlc.edu",
      passwordHash: await bcrypt.hash(adminPw || "admin123", 10),
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      isActive: true,
      mustChangePassword: adminMustChange,
    },
  });
  console.log(`Admin user: ${admin.email}${adminMustChange ? " (demo password — must change on first login)" : ""}`);

  // 3. Create a Demo Teacher
  const teacherPw = process.env.SEED_TEACHER_PASSWORD;
  const teacherMustChange = !teacherPw;
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@mrlc.edu" },
    update: {},
    create: {
      email: "teacher@mrlc.edu",
      passwordHash: await bcrypt.hash(teacherPw || "teacher123", 10),
      firstName: "Tao",
      lastName: "Mon Lae",
      role: "TEACHER",
      isActive: true,
      mustChangePassword: teacherMustChange,
      teacherProfile: {
        create: {
          teacherCode: "T-001",
          specialization: "Mathematics & Science",
        },
      },
    },
  });
  console.log(`Teacher user: ${teacherUser.email}${teacherMustChange ? " (demo password — must change on first login)" : ""}`);

  // 4. Create a Demo Student
  const studentPw = process.env.SEED_STUDENT_PASSWORD;
  const studentMustChange = !studentPw;
  const studentUser = await prisma.user.upsert({
    where: { email: "student@mrlc.edu" },
    update: {},
    create: {
      email: "student@mrlc.edu",
      passwordHash: await bcrypt.hash(studentPw || "student123", 10),
      firstName: "Min Khant",
      lastName: "Aung",
      role: "STUDENT",
      isActive: true,
      mustChangePassword: studentMustChange,
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
  console.log(`Student user: ${studentUser.email}${studentMustChange ? " (demo password — must change on first login)" : ""}`);

  // Need to get the teacher profile ID for relations
  const teacherProfile = await prisma.teacher.findUnique({
    where: { userId: teacherUser.id }
  });

  if (!teacherProfile) {
    throw new Error("Teacher profile was not created properly.");
  }

  // 5. Create a Class (find-or-create by name)
  const preGedClass =
    (await prisma.class.findFirst({ where: { name: "Pre-GED Foundation" } })) ??
    (await prisma.class.create({
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
    }));
  console.log(`Class: ${preGedClass.name}`);

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

  // 6. Create Subjects (upsert on unique code)
  const mathSubject = await prisma.subject.upsert({
    where: { code: "MATH101" },
    update: {},
    create: {
      name: "Mathematics",
      code: "MATH101",
      description: "Basic Algebra and Geometry",
      teachers: {
        create: [{ teacherId: teacherProfile.id }],
      },
    },
  });
  console.log(`Subject: ${mathSubject.name}`);

  // 7. GED class + the four official GED subject areas
  const gedClass =
    (await prisma.class.findFirst({ where: { name: "GED Preparation" } })) ??
    (await prisma.class.create({
      data: {
        name: "GED Preparation",
        level: "GED",
        academicYear: "2024-2025",
        room: "Room B2",
        capacity: 30,
        teachers: { create: [{ teacherId: teacherProfile.id }] },
      },
    }));
  console.log(`Class: ${gedClass.name}`);

  const gedSubjectsData = [
    { name: "Mathematical Reasoning", code: "GED-MATH", description: "GED Mathematical Reasoning: quantitative problem solving, algebra, geometry, and data analysis." },
    { name: "Reasoning Through Language Arts", code: "GED-RLA", description: "GED RLA: reading comprehension, language conventions, and the extended-response essay." },
    { name: "Science", code: "GED-SCI", description: "GED Science: life science, physical science, and earth & space science." },
    { name: "Social Studies", code: "GED-SOC", description: "GED Social Studies: civics & government, U.S. history, economics, and geography." },
  ];

  const gedSubjects = [];
  for (const s of gedSubjectsData) {
    const subj = await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, teachers: { create: [{ teacherId: teacherProfile.id }] } },
    });
    gedSubjects.push(subj);
    console.log(`GED subject: ${subj.name} (${subj.code})`);
  }

  // 8. GED practice tests + the demo student's scaled scores.
  //    GED is scored 100–200 per subject; 145 is the passing standard.
  const gedScores: Record<string, number> = {
    "GED-MATH": 165,
    "GED-RLA": 152,
    "GED-SCI": 148,
    "GED-SOC": 158,
  };

  if (studentProfile) {
    for (const subj of gedSubjects) {
      const title = `${subj.name} — GED Practice Test`;
      const exam =
        (await prisma.exam.findFirst({ where: { title, subjectId: subj.id } })) ??
        (await prisma.exam.create({
          data: {
            title,
            type: "MOCK",
            date: new Date("2025-04-15"),
            durationMinutes: 120,
            totalMarks: 200,
            classId: gedClass.id,
            subjectId: subj.id,
          },
        }));
      const score = gedScores[subj.code] ?? 150;
      await prisma.examAttempt.upsert({
        where: { studentId_examId: { studentId: studentProfile.id, examId: exam.id } },
        update: { score, isCompleted: true, completedAt: new Date("2025-04-15T11:00:00Z") },
        create: {
          studentId: studentProfile.id,
          examId: exam.id,
          score,
          isCompleted: true,
          startedAt: new Date("2025-04-15T09:00:00Z"),
          completedAt: new Date("2025-04-15T11:00:00Z"),
        },
      });
      console.log(`  ${subj.code}: scored ${score}/200 — ${score >= 145 ? "PASS" : "below passing"}`);
    }
  }

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
