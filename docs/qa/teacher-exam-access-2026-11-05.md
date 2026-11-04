# Teacher exam access and directory review

## What changed

Previously, two teachers assigned to the same class saw identical management actions. Several write routes checked the class assignment alone. A teacher could change a colleague’s exam by opening Studio directly or sending a request to the server.

The creator now owns the exam. Other teachers assigned to the class can open its preview. The owner or an administrator can grant and revoke editing for an individual teacher from **Editing access** on the exam profile. An editor cannot invite another editor. Published answer-key correction still requires the separate administrator grant.

## Screen findings and fixes

| What a teacher encountered | Change |
| --- | --- |
| The library showed “Manage” on every card, with no author or access information. | Each row identifies the owner and the signed-in teacher’s access. A read-only row opens the preview. |
| The assessment screen gave long titles, status tags, dates and grading actions similar visual weight. | The title leads each row. Activity, access and actions occupy consistent positions. Rows stack on phones. |
| The access change was difficult to discover or verify. | The exam profile names the owner. Its access dialog lists eligible teachers, shows their current access and reports success or failure for each change. |
| Direct links could bypass the controls in the directory. | Management screens check access before loading forms. The server checks the stored exam for writes, including child-question, grading and scheduling routes. |

The compact list and owner byline draw on [Deputy’s library](https://mobbin.com/screens/42687920-b7cb-42a8-8cd5-3ced9f7fea47) and [Zoho’s document list](https://mobbin.com/screens/5da66ee2-7366-470b-bc39-ffa47c81b7fc). The sharing dialog uses a per-person access row, as seen in [Refero’s n8n reference](https://refero.design/pages/6e97dbbc-12e4-42fa-a5e1-79e9433fe7b9). The screens retain the school’s light and dark themes.

## Verification and rollout

Brave checks cover desktop and phone layouts, owner search, read-only links, grants and revocations. A separate test with PostgreSQL and the running API covers simultaneous grants, forged ownership, out-of-class access and rejecting writes after revocation. The browser checks use fixtures. The API test uses disposable teacher accounts.

Deploy the ownership migration with the application. It recovers legacy owners from unambiguous exam creation or clone records. Teachers start with read-only access where those records are missing or disagree. An administrator can grant editing on those exams.
