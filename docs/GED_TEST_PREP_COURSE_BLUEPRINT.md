# GED prep book to MRLC courses

Research date: 31 October 2026. Source: the user's *Kaplan GED Test Prep 2022–2023* PDF, especially its contents (PDF pages 4–11), study planners (PDF pages 29–35), and study instructions (PDF pages 14–16 and 36–37). Printed page references below refer to the book's own numbering, not PDF page numbers. Check page references against the particular edition before giving them to students.

## What the book contains

The book starts with an overview and diagnostic pretest for each subject, then divides instruction into four subject units. Each chapter has shorter lessons followed by chapter practice. Each subject has a final practice test, with answers and explanations collected later. The study planners map pretest weaknesses to chapter readings. This is a useful planning structure, but the pretest or chapter percentage is **not** an official GED score or readiness prediction.

| MRLC course | Book unit | Chapters / draft modules | Named lessons in contents | Diagnostic emphasis |
| --- | --- | ---: | ---: | --- |
| Reasoning Through Language Arts | 1 | 9 | 47 | Reading, writing and language, extended response |
| Mathematical Reasoning | 2 | 7 | 62 | Quantitative reasoning; algebra and geometry |
| Social Studies | 3 | 5 | 26 | Source and data practices; content contexts |
| Science | 4 | 4 | 25 | Scientific practices; content contexts |
| **Total** | | **25** | **160** | Four pretests and four final practice tests |

The 25 chapters are now the editable modules in the four GED Course builder templates (`shared/courses.ts`). These are curriculum outlines, **not** published lessons. A teacher must add items and original/authorized teaching content, then submit for administrator review and class assignment. Existing drafts and published courses are unaffected by edits to templates.

## Original MRLC-GED courses built for the LMS

In Courses, a teacher or administrator selects **Create four MRLC-GED courses** to prepare four editable drafts. Each unit includes an original reading with a worked example, a short exercise and a five-question test. New courses run independently of Learning Quest. Teachers can add optional practice links, class homework and YouTube or Vimeo video lessons. Students play supported video links in the course.

| Course | Units | Reading and practice lessons | Unit tests | Original test questions |
| --- | ---: | ---: | ---: | ---: |
| RLA | 9 | 18 | 9 | 45 |
| Math | 7 | 14 | 7 | 35 |
| Social Studies | 5 | 10 | 5 | 25 |
| Science | 4 | 8 | 4 | 20 |

Students have 15 minutes per unit test by default. Four correct answers out of five pass a generated test. Teachers can edit the questions, time limit and pass mark before review. Each attempt belongs to a student enrollment and published course version. The server checks the class assignment, grades the attempt and saves its date, responses, score and pass status. Feedback appears after submission. Staff can see attempt histories in the course progress report. An RLA essay can be assigned and marked through Homework.

Apply the course migrations, including `20261031020000_course_unit_tests`, before deploying. Use administrator review and class assignment to release a course to students. Existing published versions keep their original syllabus.

## Chapter map and what to teach

| Course | Module sequence, based on the book's contents | MRLC evidence of learning |
| --- | --- | --- |
| RLA | Interpret nonfiction; analyze nonfiction; interpret fiction; write effective sentences; connect ideas; write about text; polish writing; use grammar; use mechanics | Original passage questions with evidence, editing in context, and a teacher-scored extended response |
| Math | Number sense and problem solving; decimals and fractions; ratios, proportions and percent; data, statistics and probability; algebra basics and expressions; equations, inequalities and functions; geometry | Worked solutions and explanation, calculator and non-calculator practice, mixed chapter checks |
| Social Studies | Social studies practices; U.S. history; civics and government; economics; geography and the world | Source interpretation, claims and evidence, maps, charts and numerical reasoning |
| Science | Science practices; life science; Earth and space science; physical science | Experimental design, reading graphs and tables, scientific explanations supported by data |

The chapter order follows the book for navigation. Within a chapter, prioritize transferable GED skills. For example, teach source interpretation during civics/history, graph reading throughout science, and argument evaluation while reading and writing RLA. The official international [test subjects page](https://www.ged.com/en/curriculum.html) describes the assessed skills; the [educator resources](https://www.ged.com/en/professional-development/develop-student-skills.html) provide assessment guides, high impact indicators, and performance descriptors. Book topics are a planning aid, not a claim that every lesson has equal exam weight.

## Student and teacher flow

1. **Placement:** Create an original MRLC diagnostic or use an authorized assessment; tag each question to a module/skill. Record the result and let the teacher choose a starting module. A student can revisit earlier modules. If an individual student owns the book, a teacher may refer that student to a chapter without putting the PDF or its questions in the LMS.
2. **Independent lesson:** Give a short, original written explanation or an authorized video; a worked example; 5–10 practice questions with explanations; and a clear next step. Teachers may add optional Learning Quest practice. Use captions, plain language and a downloadable low-bandwidth option where rights permit.
3. **Chapter check:** Follow practice with a short original quiz and feedback by skill. Use incorrect responses to recommend a specific lesson for review. Treat the check as formative; do not translate its percentage to a GED scaled score.
4. **Teacher homework:** Create homework in the existing class homework module, set instructions, due date and feedback, then link the homework item into the matching course module. Examples: an evidence paragraph in RLA, a worked ratio problem, a document comparison in Social Studies, or interpreting a small experiment in Science. A student's course item becomes complete from the homework submission record; feedback and rework remain in homework.
5. **Final review:** Add original mixed practice and an appropriately timed mock for each subject. Review errors and writing with a teacher. A genuine GED Ready result should be tracked separately from MRLC quizzes.

One useful repeatable chapter pattern is **learn → guided example → independent practice → chapter check → homework/feedback → revisit**. A teacher can assign a whole subject course to a class and use homework deadlines to pace that class while students proceed through accessible lessons at their own pace. The current Course builder links existing homework and exams; it does not create a new homework automatically from an outline. Individual course assignment, automatic placement and per-skill mastery recommendations need further work.

## Classroom use

Preview each course as a teacher. Check that reading level, examples and assessment timing suit the class. Teachers can add a class homework submission to collect a written response, or add a video to demonstrate a worked example. Assign the reviewed course version to the class. Students use **My Courses** to resume the next required lesson, review feedback and repeat tests.

## Rights and official readiness

The PDF's copyright page (PDF page 3) says Kaplan retains rights and prohibits reproduction or storing its text in an information retrieval system without express permission. **Do not upload the PDF into the student library, paste its lessons or answers into course items, or import its pretests and practice questions into the LMS unless MRLC obtains appropriate permission.** This blueprint uses chapter organization and original learning outcomes only. Teachers can write original lessons and questions, link authorized materials, and record attribution/license for third-party assets. Kaplan also states that the book is not endorsed by GED Testing Service.

Malaysia's current [GED policy](https://www.ged.com/en/policies/malaysia.html) says a candidate needs approval from an Authorized GED Prep Provider and a GED Ready score of at least 145 in the relevant subject before scheduling the GED test. Do not mark a student officially ready from MRLC course completion, and do not represent MRLC as an authorized provider unless that status has been confirmed. The official [GED Ready FAQ](https://www.ged.com/faqs/ged-ready.html) describes GED Ready as a separately purchased official practice test with a personalized study report.
