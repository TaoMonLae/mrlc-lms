# Chat Restructure — Implementation Plan

Replaces the current write-only, email-style broadcast (`Message` +
`MessageRecipient`) with a conversation-based chat for **Admin, Staff, Teachers,
and Students**. Chosen direction:

- **Delivery:** async now (refetch / short polling), real-time (WebSocket) later.
- **Permissions:** hierarchical — students contact only staff/teachers/admin, never
  each other; staff/teachers/admin contact anyone.
- **Safety:** admin oversight + user reporting (appropriate for a school with minors).

Fits the existing stack (Prisma + Express `server.ts` + Vite/React + role-based
`navigation.ts`); no new infrastructure in phase 1.

---

## 1. Why restructure (current state)

- Today's messaging is a one-way broadcast: a teacher's class page → "Group
  Message." There is **no inbox UI, route, or nav** — recipients can't read anything.
- The inbox query is **broken** (`senderId = me AND recipient = me`), so received
  messages never appear.
- **No staff messaging**, and no cross-role contact directory.

So we build a new model rather than patch the old one. The legacy `Message`
tables are left untouched in phase 1 and retired in phase 4.

---

## 2. Data model (Prisma)

```prisma
enum ConversationType { DIRECT GROUP CLASS_CHANNEL }
enum ChatReportStatus { OPEN REVIEWED ACTIONED DISMISSED }

model Conversation {
  id            String   @id @default(uuid())
  type          ConversationType @default(DIRECT)
  title         String?            // for GROUP / CLASS_CHANNEL
  classId       String?            // set for CLASS_CHANNEL
  createdById   String
  lastMessageAt DateTime @default(now())   // for inbox sorting
  participants  ConversationParticipant[]
  messages      ChatMessage[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([classId])
  @@index([lastMessageAt])
}

model ConversationParticipant {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  lastReadAt     DateTime?          // drives unread counts
  isMuted        Boolean  @default(false)
  leftAt         DateTime?
  createdAt      DateTime @default(now())
  @@unique([conversationId, userId])
  @@index([userId])
}

model ChatMessage {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User     @relation(fields: [senderId], references: [id])
  body           String
  attachmentUrl  String?
  deletedAt      DateTime?          // soft delete
  createdAt      DateTime @default(now())
  reports        ChatMessageReport[]
  @@index([conversationId, createdAt])
  @@index([senderId])
}

model ChatMessageReport {
  id            String   @id @default(uuid())
  messageId     String
  message       ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  reportedById  String
  reason        String?
  status        ChatReportStatus @default(OPEN)
  reviewedById  String?
  reviewedAt    DateTime?
  createdAt     DateTime @default(now())
  @@index([status])
}
```

`User` gains back-relations: `conversationsCreated`, `conversationParticipations`,
`chatMessages`. (Optional `UserBlock` model deferred to phase 3.)

Migration: idempotent SQL in the established style; non-destructive (legacy
`Message`/`MessageRecipient` untouched).

---

## 3. Permission rules (hierarchical)

`STAFF_ROLES = ADMIN, TEACHER, STAFF, ACCOUNTANT, CASE_WORKER, LIBRARIAN`.

- A **student** may start/participate in a conversation **only if at least one
  staff member is a participant**. Student↔student DIRECT is rejected. (Group
  chats are allowed but must include a staff/teacher, who supervises — peers are
  visible to each other only inside a staff-owned group.)
- **Staff** may message anyone.
- Enforced in two places: the **contacts directory** (a student only sees staff),
  and **conversation creation / message send** (server re-validates, never trusts
  the client).
- **Admin oversight:** admins may read any conversation via a moderation endpoint
  (audit-logged); normal participants only see their own.

---

## 4. API (`server.ts`, all `authMiddleware`)

```
GET    /api/chat/contacts                     role-filtered directory (who I may start a chat with)
GET    /api/chat/conversations                my conversations + last message + unreadCount
POST   /api/chat/conversations                create DIRECT/GROUP (validate allowed participants)
GET    /api/chat/conversations/:id/messages   paginated; participant-or-admin only
POST   /api/chat/conversations/:id/messages   send (validate participant; bump lastMessageAt)
POST   /api/chat/conversations/:id/read       set my lastReadAt
DELETE /api/chat/messages/:id                 soft-delete own message (or admin)
POST   /api/chat/messages/:id/report          report a message

# Moderation (ADMIN)
GET    /api/chat/reports                       reports queue (?status=OPEN)
POST   /api/chat/reports/:id/resolve           ACTIONED | DISMISSED (+ optional delete message)
GET    /api/chat/admin/conversations/:id       oversight read of any conversation (audit-logged)
```

Attachments reuse the image-upload pattern already added for exam media
(`/api/chat-media`, image-only, size-limited).

---

## 5. Frontend

- **`/chat`** — two-pane page (conversation list with unread badges + thread view
  with composer and optional image). New-conversation picker pulls from
  `/api/chat/contacts` (already role-filtered). Added to `navigation.ts` for **all**
  roles.
- **Polling** for "async now": refetch the conversation list and the open thread on
  an interval and on window focus. (Swapped for WebSocket pushes in phase 5 with no
  UI change.)
- **Moderation view** (admin) — reports queue + conversation oversight, under
  Operations or Settings.
- Repoint the teacher **ClassDetails "Group Message"** to create a GROUP
  conversation instead of the legacy broadcast.

---

## 6. Phasing

1. **Core** — models + migration, contacts/conversations/messages/read endpoints,
   permission enforcement.
2. **Chat UI** — list/thread/composer + nav for all roles, polling.
3. **Safety** — reporting, admin moderation queue + oversight, block.
4. **Cutover** — repoint ClassDetails group message; retire legacy `Message`.
5. **Real-time** — add socket.io; replace polling with push (no model/UI change).

---

## 7. Verification

- Permission tests: student→student DIRECT rejected (403); student→teacher allowed;
  staff→anyone allowed; admin oversight read works and is audit-logged.
- Unread counts update on read; conversation list sorts by `lastMessageAt`.
- Report → appears in admin queue → resolve removes/keeps message correctly.
- Smoke-test additions covering the full create → send → read → report flow.

---

## 8. Effort

~4 models, ~12 endpoints, 1 main page (+ moderation view). Backend ~2 days,
frontend ~2–3 days, safety/moderation ~1 day. Phases 1–3 deliver a usable,
supervised chat for all four roles; phases 4–5 are cutover and real-time polish.
```
