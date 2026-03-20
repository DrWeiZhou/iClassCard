# Personalized Lesson Plan Recommendation Design

## Overview

Teachers upload docx lesson plans per classroom. The system parses them into viewable HTML pages with anchored headings. When teachers create self-assessment questions, AI matches the "学习内容名称" (learning content name) against lesson plan headings. Students who rate themselves ≤3 stars are prompted to view the matched lesson plan section.

## Data Model

### New table: `lesson_plans`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| classroom_id | uuid FK → classrooms.id (unique) | One lesson plan per classroom |
| file_name | varchar(200) | Original docx filename |
| html_content | text | Parsed HTML from mammoth |
| created_at | timestamp | |

Constraint: unique on `classroom_id` — re-uploading replaces the existing lesson plan.

### New table: `lesson_plan_sections`

| Field | Type | Description |
|-------|------|-------------|
| id | uuid PK | |
| lesson_plan_id | uuid FK → lesson_plans.id (cascade delete) | |
| heading_level | integer | 1-6 corresponding to h1-h6 |
| heading_text | varchar(500) | The heading text content |
| anchor_id | varchar(200) | HTML anchor id (e.g., "section-1") |
| order | integer | Position in document |

### Modified table: `card_questions`

New nullable field:
- `matched_section_id` uuid FK → lesson_plan_sections.id (set null on delete)

## Upload & Parsing Flow

### Upload Entry Point

Teacher classroom page (`/teacher/courses/[courseId]/classrooms/[classroomId]/cards`) gets an "上传教案" button.

### API Route: `POST /api/lesson-plan/upload`

Input: `FormData` with `file` (docx) and `classroomId`.

Processing steps:
1. Parse docx with `mammoth` → HTML string
2. Extract embedded images (mammoth outputs base64 data URIs)
3. Upload each image to Supabase Storage bucket `lesson-plan-images/[classroomId]/`
4. Replace base64 src in HTML with Supabase public URLs
5. Inject `id` attributes on all `<h1>`-`<h6>` elements (e.g., `id="section-0"`, `id="section-1"`)
6. Extract heading text, level, anchor_id, and order
7. Database transaction:
   - Delete existing lesson_plan for this classroom (cascade deletes sections)
   - Insert new `lesson_plans` row
   - Batch insert `lesson_plan_sections` rows
8. Return success with section count and lesson plan id

### Teacher UI

On the classroom cards page, show:
- If no lesson plan: "上传教案" button
- If lesson plan exists: filename, section count, "查看" link, "重新上传" button

## AI Heading Matching

### Trigger

When a teacher saves a `self_assessment` question in the card editor:
1. Check if the question's classroom has a lesson plan
2. If yes, send the question's `title` (学习内容名称) and all section headings to the AI
3. Store the matched `section_id` in `card_questions.matched_section_id`

### API Route: `POST /api/lesson-plan/match`

Input: `{ questionTitle: string, classroomId: string }`

Processing:
1. Fetch all sections for the classroom's lesson plan
2. Call the teacher's default LLM with the matching prompt
3. Parse the response (a number) and return the matched section id

### AI Prompt

```
你是一个教案标题匹配助手。给定一个学习内容名称和一组教案标题，找出最匹配的标题。

学习内容名称：{学习内容名称}

教案标题列表：
1. {标题1}
2. {标题2}
...

请返回最匹配标题的序号(从1开始)。如果没有合适的匹配，返回0。只返回数字。
```

Uses the teacher's configured default LLM model.

### Card Editor Integration

In `QuestionSelfAssessment` component and card save action:
- After saving a self-assessment question, if the classroom has a lesson plan, auto-trigger matching
- Show matching status: "匹配中...", "已匹配: {heading_text}", or "未匹配到教案标题"
- Teacher can manually re-trigger matching

## Student Experience

### Self-Assessment Submission (modified `SelfAssessmentAnswer`)

After star rating submission:
1. If `matched_section_id` exists → show "精准教案" link button below the rating
2. If stars ≤ 3:
   - Show dialog: "似乎没学太明白，是否需要瞄一眼教案内容充个电？"
   - "是" → navigate to `/student/lesson-plan/[lessonPlanId]#[anchorId]`
   - "否" → close dialog, no navigation
3. If stars > 3:
   - No dialog, but "精准教案" link is still visible for optional access

### Data Flow

The student card page needs to pass `matched_section_id` and lesson plan info to `SelfAssessmentAnswer`. The server action `getCardForStudent` will be extended to include this data.

## Lesson Plan Viewer Page

### Route: `/student/lesson-plan/[id]`

Server component that:
1. Fetches lesson plan HTML from database
2. Renders with `dangerouslySetInnerHTML` (trusted content from teacher-uploaded docx parsed by mammoth)
3. Wrapped in Tailwind `prose` classes for typography
4. Back button to return to the learning card

### Anchor Scrolling

Client component wrapper with `useEffect`:
- On mount, check `window.location.hash`
- Scroll to the element with matching id
- Smooth scroll behavior

### Styling

- `prose` / `prose-sm` for readable typography
- Responsive images: `max-w-full h-auto`
- Mobile-friendly padding and font sizes

## Dependencies

New npm package: `mammoth` (docx → HTML conversion)

## Supabase Storage

New bucket: `lesson-plan-images`
- Public read access (images are from teacher lesson plans)
- Path structure: `[classroomId]/[imageIndex].[ext]`

## File Changes Summary

### New files
- `app/api/lesson-plan/upload/route.ts` — Upload & parse API
- `app/api/lesson-plan/match/route.ts` — AI matching API
- `app/student/lesson-plan/[id]/page.tsx` — Lesson plan viewer
- `components/teacher/lesson-plan-upload.tsx` — Upload UI component
- `components/student/lesson-plan-dialog.tsx` — ≤3 star dialog component
- `lib/actions/lesson-plans.ts` — Server actions for lesson plans

### Modified files
- `lib/db/schema.ts` — Add lesson_plans, lesson_plan_sections tables; add matched_section_id to card_questions
- `components/teacher/card-editor/question-self-assessment.tsx` — Show matching status
- `components/student/self-assessment-answer.tsx` — Add dialog + link
- `components/student/answer-card.tsx` — Pass lesson plan data through
- `components/student/student-card-content.tsx` — Pass lesson plan data through
- `app/student/cards/[cardId]/page.tsx` — Fetch lesson plan data
- `lib/actions/student-data.ts` — Include lesson plan info in student card query
- `lib/actions/cards.ts` — Trigger AI matching on save
- `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/page.tsx` — Add upload button
