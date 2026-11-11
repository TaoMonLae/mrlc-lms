# Prepare and transfer courses offline

## Recommended: author in your local LMS

1. Start PostgreSQL and your local LMS (`npm run dev`). Internet is not required once the application and its dependencies are installed.
2. Open **My Teaching → Courses**. Create or edit a course and **Save draft**.
3. Choose **Export ZIP**. Include local PDFs and MP4/WebM videos when you may copy and transfer them. The ZIP always contains the syllabus and editable lesson text.
4. Keep the ZIP on your computer or a USB drive. Local edits are not automatically synchronized with the online school.
5. When the destination LMS is reachable, open **Courses → Import course**, choose the ZIP and select **Preview package**.
6. Check the modules, included files and reconnect warnings. Confirm your rights to use the materials, then select **Import as new draft**.
7. Open the imported draft. Reconnect any Learning Quest practice, homework or exams using the course editor's resource picker. Submit for administrator approval.
8. The administrator opens **Review & assign**, reviews the imported files, and approves the course. Approval publishes the referenced imported PDFs/videos to the internal school libraries and creates the course version. Assign that version to a class.

Imports create a new course owned by the importing teacher or administrator. They never overwrite an existing course or transfer student accounts, enrollments, progress, marks or approval decisions. Import retries from the same page reuse a request key to avoid creating duplicate courses if the response was interrupted.

## Edit files without running the LMS

On **Courses → Import course**, choose **Download starter ZIP**. Unzip it and read `README.txt`.

```text
course.json
README.txt
lessons/
  001-lesson-1.txt
assets/
  reading.pdf
  worked-example.mp4
```

The starter's lesson filename may differ; use the paths already recorded in its `lessonFiles` mapping. Lesson text is plain UTF-8. TextEdit on Mac can edit it after **Format → Make Plain Text**. Keep `.txt` as the extension. The LMS displays this text with its paragraph breaks; it does not execute HTML or scripts.

`course.json` stores the title, summary, subject, level, teaching language, outcomes, module order and lesson order. It uses the `mrlc-course` format, version `1`. Editing JSON is optional if you author using the local LMS. When editing manually, preserve valid JSON syntax and give every module and lesson a unique ID containing letters, numbers, hyphens or underscores.

The `lessonFiles` mapping connects a lesson ID to its text file. Imported file text replaces the lesson's inline `content`, if both are present. Rezip either the folder contents or one enclosing course folder; both are accepted.

### Add a PDF or video

Put your file in `assets/`. Add a resource descriptor to `resources`, for example:

```json
{
  "key": "reading-pdf",
  "kind": "EBOOK",
  "title": "Ratio worked examples",
  "file": "assets/reading.pdf"
}
```

Add or update a lesson with `kind: "EBOOK"` and `resourceId: "reading-pdf"`. Videos use `kind: "VIDEO"` and an `.mp4` or `.webm` file. Write the attribution in the lesson's `source` field. A packaged media file must be referenced by a resource, and that resource must be used by a lesson.

Exports include a `sha256` checksum for packaged media. If you intentionally replace a file while editing offline, remove its old `sha256` field or update the checksum; a mismatch blocks import so damaged transfers are not silently accepted.

## Limits and materials needing attention

- ZIP upload: **90 MiB** maximum. Included media: **80 MiB** total. Expanded package: **200 MiB** maximum. Large videos can use the existing video uploader and be linked after import.
- Embedded formats: **PDF, MP4, WebM**. EPUB/comic books, Word documents, thumbnails, subtitle tracks and video learning configurations are not bundled in this version.
- Website readings, hosted videos and unsupported/oversized/restricted files remain reconnect tasks. Read the ZIP's `README.txt` export notes and the import preview; a lesson is not silently removed because its media could not be included.
- Existing exams, homework and Learning Quest practice remain in their original modules. The destination teacher chooses the appropriate local resources; IDs or similar titles are not automatically trusted across installations.
- Imported PDFs start as staff-only books; imported videos start as staff-only drafts. Only administrator approval of their importing course publishes them. Ordinary private resources from another course or owner cannot use this path to bypass review.
- After approval, imported media is available in the internal school video/e-book libraries. This is separate from assigning the course to a class. Review the materials with that audience in mind.
- External readings still require internet. This transfer feature does not turn the hosted LMS into a standalone offline player or provide automatic local/online synchronization.
- Only MRLC course packages are supported. SCORM packages and Moodle backups need conversion. Archives with unsafe paths, symbolic links, encrypted contents, extra unreferenced files or invalid manifests are rejected.

No additional database migration is required for ZIP transfer beyond the course module migration.
