# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Teachers and school staff at the Mon Refugee Learning Centre (MRLC) GED School are the primary users. They manage teaching, assessment, student support, and school operations in their daily work. Students use learning and school services through their own role-based access. Public Learning Quest learners have separate learning-only accounts.

## Product Purpose

MRLC LMS brings the school's academic and operational work into one system. It supports the full path from admissions and enrollment through instruction, exams, progress tracking, student services, finance, and administration. Success means staff can manage these connected workflows and students can learn and see their progress through the same school platform.

## Positioning

The product's defining scope is its exam system together with explicit, top-to-bottom management of the whole school. The exam workflow spans question banks, authoring, scheduling, attempts, proctoring, accommodations, grading, analytics, and reporting within the broader school record.

## Operating Context

Staff work across classes, attendance, homework, exams, grades, student records, communication, fees, finance, and reports. Teachers plan lessons, assign and review work, track learners, and use classroom resources. Administrators and permission-based staff manage admissions, people, finance, settings, and sensitive records. The school operates in a multilingual context; the interface has English, Burmese, and Mon locale files, and some learning guidance can switch between English and Burmese.

## Capabilities and Constraints

- Role and permission boundaries include administrators, teachers, students, librarians, HR, finance, and other staff.
- School records and operations include attendance, homework, exams, gradebook, admissions, personnel, fees, finance, conduct, reports, communication, and learning resources.
- Learning Quest offers public course browsing and separate learner signup. Public learner accounts must remain isolated from private LMS records and administration.
- Assessment and progress data are server-verified in the exam and Learning Quest flows described by the repository.
- The existing application uses React, TypeScript, Vite, Express, Prisma, and PostgreSQL. It is a web product, including on mobile browsers.

## Brand Commitments

The product name is MRLC LMS, for the Mon Refugee Learning Centre GED School. Preserve the school's name and Mon language context. The repository includes MRLC-branded learning assets and certificates.

## Evidence on Hand

- [README.md](README.md) documents the product, roles, workflows, architecture, and feature boundaries.
- [docs/images/mrlc-lms-webapp-preview.jpg](docs/images/mrlc-lms-webapp-preview.jpg) shows the LMS login portal.
- [docs/images/language-quest-dashboard.png](docs/images/language-quest-dashboard.png) and [docs/images/language-quest-completion-certificate.png](docs/images/language-quest-completion-certificate.png) show the learner experience and certificate.
- The repository contains implementation and curriculum documentation for the exam system and Learning Quest. Future work should verify any numerical curriculum or performance claim against current source before publishing it.

## Product Principles

1. Make core teacher and staff work clear across the full school workflow.
2. Keep exams and their supporting records trustworthy, connected, and understandable.
3. Respect role boundaries and protect student and staff information.
4. Support the school's multilingual teaching and learning context.

## Accessibility & Inclusion

The repository documents responsive web flows, English/Burmese learning guidance, English/Burmese/Mon interface locales, light and dark themes for Learning Quest, and reduced-motion controls. Preserve these capabilities as relevant to each surface; no additional product-wide accessibility standard was specified during init.
