-- Conduct/Discipline tracking (Phase 1: rule catalog + violation logging +
-- counts), built from the MRLC School Rules, Regulations & Hostel Guidelines
-- handbook (effective 2025). Lets teachers/admin/case workers log which
-- numbered rule a student broke, instead of free-text case notes, so
-- per-student/per-rule violation counts can be computed for the
-- Article 8 disciplinary framework (Minor -> Moderate -> Serious escalation).
--
-- NON-DESTRUCTIVE: only adds new enum + tables + reference data; no existing
-- data is touched. Idempotent so it's safe to re-run. Hand-written (this
-- sandbox can't reach binaries.prisma.sh to run `prisma migrate dev`/`diff`)
-- -- please verify against the live DB before applying.

-- ── Enum ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "RuleSeverity" AS ENUM ('MINOR','MODERATE','SERIOUS'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── ConductRule ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ConductRule" (
  "id"           TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "article"      TEXT NOT NULL,
  "articleOrder" INTEGER NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "severity"     "RuleSeverity" NOT NULL DEFAULT 'MINOR',
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConductRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConductRule_code_key" ON "ConductRule"("code");
CREATE INDEX IF NOT EXISTS "ConductRule_articleOrder_idx" ON "ConductRule"("articleOrder");
CREATE INDEX IF NOT EXISTS "ConductRule_severity_idx" ON "ConductRule"("severity");

-- ── RuleViolation ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RuleViolation" (
  "id"             TEXT NOT NULL,
  "studentId"      TEXT NOT NULL,
  "ruleId"         TEXT NOT NULL,
  "severity"       "RuleSeverity" NOT NULL,
  "note"           TEXT,
  "occurredAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedById"   TEXT NOT NULL,
  "reportedByName" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleViolation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RuleViolation_studentId_idx" ON "RuleViolation"("studentId");
CREATE INDEX IF NOT EXISTS "RuleViolation_ruleId_idx" ON "RuleViolation"("ruleId");
CREATE INDEX IF NOT EXISTS "RuleViolation_occurredAt_idx" ON "RuleViolation"("occurredAt");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "RuleViolation" ADD CONSTRAINT "RuleViolation_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RuleViolation" ADD CONSTRAINT "RuleViolation_ruleId_fkey"
    FOREIGN KEY ("ruleId") REFERENCES "ConductRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RuleViolation" ADD CONSTRAINT "RuleViolation_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed the rule catalog from the handbook ─────────────────────────────────
-- Numbered items follow the handbook's own numbering (1-72, skipping Article 8
-- which is the disciplinary framework itself, not a rule). The unnumbered
-- Article 4 facility bullets and Article 16 prohibited-items bullets use a
-- lettered scheme (e.g. "4.1a", "16a"). ON CONFLICT DO NOTHING makes this
-- re-runnable and safe if a school admin later edits/adds their own rules
-- with different codes.
INSERT INTO "ConductRule" ("id","code","article","articleOrder","title","description","severity") VALUES
('rule-001','1','Article 1 — General Conduct',1,'Respect everyone','Treat everyone on these premises — teachers, staff, fellow students, and visitors — with basic respect. This is non-negotiable.','MODERATE'),
('rule-002','2','Article 1 — General Conduct',1,'Punctuality','Come to class on time. If lateness becomes a pattern, the coordinator/principal will step in.','MINOR'),
('rule-003','3','Article 1 — General Conduct',1,'No abusive/offensive language','Abusive, offensive, or discriminatory language will not be tolerated anywhere in the building.','MODERATE'),
('rule-004','4','Article 1 — General Conduct',1,'No bullying, harassment, or fighting','Bullying, intimidation, physical fights, or harassment of any kind — including online — will lead to immediate disciplinary action.','SERIOUS'),
('rule-005','5','Article 1 — General Conduct',1,'No theft or property damage','Do not steal, vandalize, or damage school property or anyone''s personal belongings.','SERIOUS'),
('rule-006','6','Article 1 — General Conduct',1,'No gambling','Gambling is not allowed on school premises. This is non-negotiable.','SERIOUS'),
('rule-007','7','Article 1 — General Conduct',1,'No alcohol, tobacco, vaping, or drugs','Alcohol, tobacco, vaping, and illegal substances are banned on school grounds and at all school-related activities. Violations may result in expulsion.','SERIOUS'),
('rule-008','8','Article 1 — General Conduct',1,'No unauthorized outsiders','Do not bring outsiders into the building without prior approval from the principal/coordinator or a designated staff member.','MODERATE'),
('rule-009','9','Article 1 — General Conduct',1,'Participate in MRO activities','Students must participate in MRO activities when the office needs help.','MINOR'),

('rule-010','10','Article 2 — Academic Responsibilities',2,'Minimum attendance (80%)','Attendance is not optional. Students must attend at least 80% of scheduled classes to stay in the program.','MODERATE'),
('rule-011','11','Article 2 — Academic Responsibilities',2,'Notify absence in advance','If you are sick or have an urgent reason to miss class, let your teacher or the principal know in advance — not after the fact.','MINOR'),
('rule-012','12','Article 2 — Academic Responsibilities',2,'Submit assignments on time','Complete your assignments and submit them on time. Teachers set deadlines for good reason.','MINOR'),
('rule-013','13','Article 2 — Academic Responsibilities',2,'No cheating or plagiarism','Cheating, copying, or plagiarism in any form is a serious offence and can get you removed from the program.','SERIOUS'),
('rule-014','14','Article 2 — Academic Responsibilities',2,'Catch up on missed lessons','If you miss a lesson, it is your job to catch up. Reach out to your teacher or a classmate — don''t let it slide.','MINOR'),
('rule-015','15','Article 2 — Academic Responsibilities',2,'Use library/study spaces responsibly','Use the library and study spaces well, and look out for each other''s learning.','MINOR'),
('rule-016','16','Article 2 — Academic Responsibilities',2,'Register and sit for GED when ready','When you are ready, you are expected to register and sit for the GED exam. That is the goal we are all working toward.','MINOR'),

('rule-017','17','Article 3 — Dress Code',3,'Dress modestly','Dress modestly and appropriately whenever you are in classrooms or shared spaces.','MINOR'),
('rule-018','18','Article 3 — Dress Code',3,'No offensive clothing','Clothing with offensive graphics, slogans, or imagery is not acceptable.','MINOR'),
('rule-019','19','Article 3 — Dress Code',3,'Wear footwear','Wear footwear in all common and academic areas.','MINOR'),

('rule-020a','4.1a','Article 4 — Use of School Facilities',4,'Keep the library quiet','The library is a quiet space. Keep conversations to a whisper.','MINOR'),
('rule-020b','4.1b','Article 4 — Use of School Facilities',4,'Return library materials','Return books and materials to where you found them.','MINOR'),
('rule-020c','4.1c','Article 4 — Use of School Facilities',4,'No food/drinks in the library','No food or drinks in the library.','MINOR'),
('rule-020d','4.1d','Article 4 — Use of School Facilities',4,'Library materials stay in the building','Library materials stay in the building unless you have permission to take them out.','MINOR'),
('rule-020e','4.2a','Article 4 — Use of School Facilities',4,'Keep classrooms clean','Keep classrooms clean and tidy.','MINOR'),
('rule-020f','4.2b','Article 4 — Use of School Facilities',4,'Don''t move classroom furniture','Do not move desks, chairs, or equipment without being told to by a teacher.','MINOR'),
('rule-020g','4.2c','Article 4 — Use of School Facilities',4,'No phones in classrooms on weekdays','Phones are not allowed in classrooms on weekdays — hand yours in at the start of the day (see Article 5).','MODERATE'),
('rule-020h','4.2d','Article 4 — Use of School Facilities',4,'No loitering in classrooms','Do not hang around in classrooms outside class time without permission.','MINOR'),
('rule-020i','4.3a','Article 4 — Use of School Facilities',4,'Scheduled use only (Multipurpose Room)','This room is for scheduled group activities, meetings, and events.','MINOR'),
('rule-020j','4.3b','Article 4 — Use of School Facilities',4,'Get approval for other use (Multipurpose Room)','If you want to use it for something else, get approval first.','MINOR'),
('rule-020k','4.3c','Article 4 — Use of School Facilities',4,'Return furniture/equipment (Multipurpose Room)','Put furniture and equipment back where you found it after every use.','MINOR'),

('rule-020','20','Article 5 — Mobile Phones and Electronics',5,'Hand in phone on weekdays','From Monday to Friday, hand your phone to your class teacher at the start of the school day. Phones are kept safely by staff and returned to you on Friday after the last class.','MODERATE'),
('rule-021','21','Article 5 — Mobile Phones and Electronics',5,'Weekend phone hours only','On weekends, you may use your phone during these hours only: Saturday 8:00 AM–10:30 PM, Sunday 6:00 AM–6:30 PM.','MINOR'),
('rule-022','22','Article 5 — Mobile Phones and Electronics',5,'No phone use outside permitted hours without approval','Outside those hours, phone use is only allowed if a teacher or staff member gives you specific permission — for example, an urgent family call or a supervised class activity.','MODERATE'),
('rule-023','23','Article 5 — Mobile Phones and Electronics',5,'Refusing to hand in phone / unauthorized use','Refusing to hand in your phone, or using it outside permitted hours without approval, is a disciplinary matter. The phone may be held for longer as a result.','MODERATE'),
('rule-024','24','Article 5 — Mobile Phones and Electronics',5,'No photographing/filming without consent','Never photograph or film another student, teacher, or staff member without their consent. This applies at all times, not just during class.','SERIOUS'),
('rule-025','25','Article 5 — Mobile Phones and Electronics',5,'Personal responsibility for surrendered phones','MRLC will look after surrendered phones carefully, but you remain responsible for your own device. We are not liable for pre-existing damage or anything lost through your own carelessness.','MINOR'),

('rule-026','26','Article 6 — Visitors and External Contacts',6,'Visitors must sign in','All visitors must sign in at the reception area or get approval from a teacher and must state the reason for their visit.','MINOR'),
('rule-027','27','Article 6 — Visitors and External Contacts',6,'Meet visitors in common areas only','You may meet visitors only during designated visiting hours and in common areas — not in dormitory rooms.','MODERATE'),
('rule-028','28','Article 6 — Visitors and External Contacts',6,'No visitors in hostel areas','No visitor is allowed in the hostel areas under any circumstances.','SERIOUS'),
('rule-029','29','Article 6 — Visitors and External Contacts',6,'Report family emergencies immediately','If there is a family emergency, inform the principal or a teacher right away.','MINOR'),

('rule-030','30','Article 7 — Health and Hygiene',7,'Personal hygiene','Take care of your personal hygiene. It affects everyone around you.','MINOR'),
('rule-031','31','Article 7 — Health and Hygiene',7,'Report illness immediately','If you feel unwell, tell a staff member straight away and go to the designated rest area.','MINOR'),
('rule-032','32','Article 7 — Health and Hygiene',7,'Stay out of class if contagious','If you have something contagious, stay out of class and get medical attention.','MINOR'),
('rule-033','33','Article 7 — Health and Hygiene',7,'No on-site clinic — escalate to MRO staff','MRLC does not have an on-site clinic. For anything serious, speak to MRO staff and they will help connect you with the right support.','MINOR'),

('rule-034','34','Article 9 — Entry, Exit, and Curfew',9,'6:00 PM curfew','All students must be back inside the building by 6:00 PM every day, including weekends and public holidays. Exceptions must be approved in advance.','MODERATE'),
('rule-035','35','Article 9 — Entry, Exit, and Curfew',9,'Get permission before going out','If you want to go out outside of school hours, tell a duty staff member or teacher and get their permission first.','MODERATE'),
('rule-036','36','Article 9 — Entry, Exit, and Curfew',9,'No unapproved late-night outings','Going out late at night is not allowed unless there is a genuine emergency. Overnight outings require written approval.','SERIOUS'),
('rule-037','37','Article 9 — Entry, Exit, and Curfew',9,'Late return without approval','Coming back late without prior approval will be recorded and handled under the disciplinary framework.','MODERATE'),
('rule-038','38','Article 9 — Entry, Exit, and Curfew',9,'AWOL (absent without leave)','If you do not return and have not told anyone, you will be marked as absent without leave (AWOL) and your parents or guardian will be contacted straight away.','SERIOUS'),

('rule-039','39','Article 10 — Dormitory Conduct',10,'Quiet hours (10 PM–6 AM)','Quiet hours run from 10:00 PM to 6:00 AM. Keep noise — music, talking, laughter — to a minimum during this time. Other people are trying to sleep.','MINOR'),
('rule-040','40','Article 10 — Dormitory Conduct',10,'Lights out at 10:30 PM','Lights out is at 10:30 PM on weekdays. If you want to read after that, use a personal light and keep it to yourself.','MINOR'),
('rule-041','41','Article 10 — Dormitory Conduct',10,'Keep your space clean','Your space is your responsibility — your bed, your storage area, the floor around you. Keep it clean and tidy.','MINOR'),
('rule-042','42','Article 10 — Dormitory Conduct',10,'Make your bed','Make your bed before you leave the dorm each morning.','MINOR'),
('rule-043','43','Article 10 — Dormitory Conduct',10,'Do your cleaning roster shift','Common dormitory areas are cleaned on a rotating roster. Do your shift without being reminded.','MODERATE'),
('rule-044','44','Article 10 — Dormitory Conduct',10,'Don''t move shared furniture','Do not move or rearrange shared furniture without asking staff first.','MINOR'),
('rule-045','45','Article 10 — Dormitory Conduct',10,'Store belongings securely','Store your things neatly in your assigned space. MRLC is not responsible for lost or stolen items — keep valuables secure.','MINOR'),
('rule-046','46','Article 10 — Dormitory Conduct',10,'No outsiders in dormitory rooms','No one from outside — including friends from other floors — is allowed in your dormitory room.','MODERATE'),

('rule-047','47','Article 11 — Gender Separation Policy',11,'Boys''/Girls'' hostel separation','The Boys'' Hostel on the Second Floor and the Girls'' Dormitory on the Third Floor are separate and must stay that way.','SERIOUS'),
('rule-048','48','Article 11 — Gender Separation Policy',11,'No male students on Third Floor','Male students are not allowed on the Third Floor at any time.','SERIOUS'),
('rule-049','49','Article 11 — Gender Separation Policy',11,'No female students in Boys'' Hostel','Female students are not allowed in the Boys'' Hostel area of the Second Floor at any time.','SERIOUS'),
('rule-050','50','Article 11 — Gender Separation Policy',11,'Immediate action for gender-separation breach','Anyone found breaking this rule will face immediate disciplinary action. The reason given does not matter.','SERIOUS'),
('rule-051','51','Article 11 — Gender Separation Policy',11,'Mixing allowed in common areas','Boys and girls are very welcome to spend time together in common areas — the library, multipurpose room, and dining hall — during appropriate hours.','MINOR'),

('rule-052','52','Article 12 — Kitchen and Dining Hall',12,'Authorized kitchen use only','The kitchen is for authorized use only. Do not use cooking equipment unless a staff member has specifically said you may.','MODERATE'),
('rule-053','53','Article 12 — Kitchen and Dining Hall',12,'Don''t hoard or waste food','Food made in the kitchen is shared by everyone unless marked otherwise. Do not hoard food or throw it away unnecessarily.','MINOR'),
('rule-054','54','Article 12 — Kitchen and Dining Hall',12,'Clean up after meals','Clean up after every meal — the dining hall and kitchen both. Students take turns on the washing-up roster.','MINOR'),
('rule-055','55','Article 12 — Kitchen and Dining Hall',12,'No food/drinks in dormitory rooms','No food or drinks in the dormitory rooms. It attracts pests. Small sealed snacks in your personal storage are fine.','MINOR'),
('rule-056','56','Article 12 — Kitchen and Dining Hall',12,'Observe meal times','Meal times, unless staff announce otherwise: Breakfast 8:00 AM, Lunch 11:45 AM–12:45 PM, Dinner 6:30 PM–7:00 PM.','MINOR'),
('rule-057','57','Article 12 — Kitchen and Dining Hall',12,'Missed meals are on you','If you miss a meal because you were out, that is on you — sort your own food for that time.','MINOR'),
('rule-058','58','Article 12 — Kitchen and Dining Hall',12,'Personal cooking rules','Personal cooking is allowed only with staff knowledge and in the windows of time set aside for it. Leave the kitchen cleaner than you found it.','MODERATE'),

('rule-059','59','Article 13 — Shared Responsibilities and Cleaning Duties',13,'Do your hostel chores','Everyone on the hostel roster has chores. These may include sweeping, mopping, bathroom cleaning, and kitchen duties. No exceptions.','MODERATE'),
('rule-060','60','Article 13 — Shared Responsibilities and Cleaning Duties',13,'Skipping duties','Skipping your duties without a good reason goes on your record and can affect your standing in the program.','MODERATE'),
('rule-061','61','Article 13 — Shared Responsibilities and Cleaning Duties',13,'Leave bathrooms clean','Flush after yourself in shared bathrooms and leave them clean.','MINOR'),
('rule-062','62','Article 13 — Shared Responsibilities and Cleaning Duties',13,'No littering','Put your rubbish in the bins. Littering is not acceptable.','MINOR'),
('rule-063','63','Article 13 — Shared Responsibilities and Cleaning Duties',13,'Laundry in designated area/times','Do laundry in the designated area at the designated times. Do not hang clothes in shared walkways or on the stairwell.','MINOR'),

('rule-064','64','Article 14 — Security and Safety',14,'Know your emergency exits','Know where the emergency exits are on your floor. Do not wait for a drill to find out.','MINOR'),
('rule-065','65','Article 14 — Security and Safety',14,'Never block fire exits','Never block fire exits or stairwells — not even temporarily.','SERIOUS'),
('rule-066','66','Article 14 — Security and Safety',14,'Don''t tamper with safety/electrical equipment','Do not touch fire safety equipment, electrical fittings, or anything that is part of the building''s infrastructure.','SERIOUS'),
('rule-067','67','Article 14 — Security and Safety',14,'Follow emergency procedures','If there is a fire or emergency, get out calmly and quickly. Follow staff instructions and go straight to the designated assembly point.','MODERATE'),
('rule-068','68','Article 14 — Security and Safety',14,'Lock your room','Lock your room when you leave it. MRLC will not cover losses from rooms left unsecured.','MINOR'),
('rule-069','69','Article 14 — Security and Safety',14,'Report suspicious activity','If you see or hear something suspicious, report it to staff immediately. Do not ignore it or handle it yourself.','MINOR'),

('rule-070','70','Article 15 — Study Hours in the Hostel',15,'Self-study hours (7:30–9:00 PM)','Self-study runs from 7:30 PM to 9:00 PM each evening. Use this time to study in the dorm, library, or a quiet area — not to relax or socialise.','MINOR'),
('rule-071','71','Article 15 — Study Hours in the Hostel',15,'Support each other during study hours','Help each other during study hours. If you understand something, share it.','MINOR'),
('rule-072','72','Article 15 — Study Hours in the Hostel',15,'No gaming/noise during self-study','No gaming, entertainment, or noisy activities in dormitory rooms during self-study time.','MINOR'),

('rule-073a','16a','Article 16 — Prohibited Items in the Hostel',16,'Alcohol/tobacco/vaping/illegal substances','Alcohol, tobacco, vaping devices, or any illegal substances are not allowed in hostel rooms or anywhere on school premises.','SERIOUS'),
('rule-073b','16b','Article 16 — Prohibited Items in the Hostel',16,'Weapons','Weapons of any kind are not allowed in hostel rooms or anywhere on school premises.','SERIOUS'),
('rule-073c','16c','Article 16 — Prohibited Items in the Hostel',16,'Open flames (candles/incense)','Candles, incense, or anything with an open flame are not allowed in hostel rooms or anywhere on school premises.','SERIOUS'),
('rule-073d','16d','Article 16 — Prohibited Items in the Hostel',16,'Large amounts of cash','Large amounts of cash are not allowed — keep valuables to a minimum.','MINOR'),
('rule-073e','16e','Article 16 — Prohibited Items in the Hostel',16,'Pornographic/offensive material','Pornographic or offensive material is not allowed in hostel rooms or anywhere on school premises.','MODERATE'),
('rule-073f','16f','Article 16 — Prohibited Items in the Hostel',16,'Unauthorized cooking equipment','Personal cooking equipment not authorised by staff (hotplates, electric kettles in rooms, etc.) is not allowed.','MODERATE')
ON CONFLICT ("code") DO NOTHING;
