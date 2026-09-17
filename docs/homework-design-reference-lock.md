# Homework workspace reference lock

Target: direct implementation in the existing MRLC design system, not a new brand.

Dominant reference: Ui/shadcn style c14c0a94-1037-449e-bf5b-4cb972656ac7 — compact functional type, thin neutral borders, quiet surfaces. Adapt to MRLC navy/teal and existing components; exclude decorative imagery, large marketing headlines and gradients.

Supporting references:
- Google Classroom screen 3876690f-0513-46c4-9412-1afeeb6480b5: separate review destination, student identity/navigation above evidence left and feedback right. Exclude unsupported annotation controls.
- Cushion screen 7d4c97c0-972a-4092-881e-8cfc0d0717ca: dashed upload surface, browse/drop interaction, visible size/type limits.
- Nike upload flow 2032: choose → validate → inspect/remove → submit. Adapt to coursework documents, not social photo import.
- Asana style a62c0ef5-f510-4e58-9321-e7605524a47e: task filters and status-led lists. Exclude marketing palette and oversized pills.
- Preply style 27a3ccec-81de-419a-af4f-8c2abd732cd7: approachable instructional copy; exclude lifestyle imagery and pink hero branding.

Decisions: keep current class/news/ebook/video entry points, dates, gradebook integration and draft storage; tighten typography/density; make ownership explicit; move document review to a bookmarkable route. Reuse the licensed React Bits AnimatedContent adaptation for a 200ms entrance with reduced-motion support, never for loading or critical form state.

Acceptance: co-teachers cannot list/read/edit/mark/delete/sync or fetch another teacher's files; students can upload multiple supported documents with validation and remove-before-submit; review URL survives refresh; feedback/score errors retain inputs. Verify desktop/mobile, light/dark, keyboard and reduced motion.

## Verification and deployment

Verified against an isolated local database: same-class co-teacher denies on all homework read/write routes and linked gradebook mutations, classwork/video catalog privacy, protected file access, multiple student attachments, missing/forged files, zero scores, redo/resubmit and gradebook cleanup.

Safari/WebKit and Chromium: upload validation/removal/hand-in, direct review links and refresh, failed feedback retry, zero score save, protected PDF/image blob previews/downloads and multi-student queue navigation. Reviewed desktop light and mobile dark captures. Fixed route-link semantics, long-title wrapping and dark helper-text contrast. Reused the existing licensed React Bits short entrance; reduced motion leaves content visible.

No database migration is required for this change. Deploy frontend and backend together: old unauthenticated file links cannot access the protected route. Purge any existing CDN cache for `/uploads/homework-media/*` and exempt that path from cache-everything rules; these URLs were previously publicly cached for 30 days. Previously downloaded copies cannot be recalled. New responses are authenticated, private/no-store and vary on Authorization.

Gradebook matrices hide other teachers' linked homework records; student progress retains school-wide aggregates but hides other teachers' detailed homework trend/feedback records. Admin and student-own grade access stays intact.

Deleting an owned linked grade item clears the homework link transactionally, preventing a dangling pointer from breaking later homework edits; syncing can recreate the item from saved submissions.

Final checks: 331 unit tests, 14 homework/video API tests and 14 WebKit/Chromium browser tests passed, plus TypeScript checking and production build. Mobile date columns keep the year/month label intact. No remaining blocking findings in the tested flows.
