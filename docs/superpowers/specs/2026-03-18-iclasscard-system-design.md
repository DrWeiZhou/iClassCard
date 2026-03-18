# iClassCard System Design

## Overview

iClassCard is an AI-powered interactive classroom response card system. Teachers create courses, manage students, and publish AI-graded learning cards (quizzes). Students answer questions and receive personalized AI feedback via LLM integration.

Two roles: **Teacher** (manages courses, students, classrooms, learning cards, LLM configs, prompt templates) and **Student** (views assigned cards, answers questions, receives AI-scored feedback).

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Edge Runtime for AI streaming)
- **UI**: Shadcn UI + Tailwind CSS (responsive: mobile-first)
- **AI/Streaming**: Vercel AI SDK (`useChat` / `useCompletion` for streaming LLM responses)
- **Database**: Supabase (cloud, PostgreSQL with pgvector)
- **ORM**: Drizzle ORM + drizzle-kit (migrations)
- **Auth**: Custom JWT (jose) — teacher: phone+password, student: student_no+name
- **Deployment**: Vercel
- **Language**: TypeScript

### Key Dependencies

| Purpose | Package |
|---|---|
| Framework | `next` 15 |
| ORM | `drizzle-orm` + `drizzle-kit` |
| DB driver | `postgres` (node-postgres) |
| AI SDK | `ai` + `@ai-sdk/openai` (OpenAI-compatible) |
| UI | Shadcn UI components (installed per-component) |
| Styling | `tailwindcss` |
| Forms | `react-hook-form` + `zod` |
| Excel parsing | `xlsx` (SheetJS, client-side) |
| JWT | `jose` (Edge-compatible) |
| Password hashing | `bcryptjs` |
| Charts | `recharts` (multiple-choice analysis) |
| Word cloud | `react-wordcloud` (fill-in-the-blank analysis) |
| Danmaku | `rc-bullets` or custom CSS animation (short-answer analysis) |
| Drag & drop | `@dnd-kit/core` (question reordering) |

## Architecture

Single Next.js App Router application. Teacher and student routes are separated by URL prefix (`/teacher/*`, `/student/*`). Middleware enforces role-based access via JWT in httpOnly cookies.

Server Actions handle all Supabase CRUD operations. AI-related API routes use Edge Runtime for low-latency streaming.

## Project Structure

```
app/
├── (auth)/                         # Auth pages (no layout chrome)
│   ├── login/page.tsx              # Teacher login (phone + password)
│   ├── register/page.tsx           # Teacher registration
│   └── student-login/page.tsx      # Student login (student_no + name)
├── teacher/                        # Teacher pages
│   ├── layout.tsx                  # Teacher layout (sidebar nav)
│   ├── profile/page.tsx            # Teacher profile edit
│   ├── models/page.tsx             # LLM model management
│   ├── templates/page.tsx          # Prompt template management
│   ├── courses/
│   │   ├── page.tsx                # Course list
│   │   └── [courseId]/
│   │       ├── page.tsx            # Course detail
│   │       ├── students/page.tsx   # Student management (Excel import)
│   │       ├── classrooms/page.tsx # Classroom list
│   │       └── classrooms/[classroomId]/
│   │           └── cards/
│   │               ├── page.tsx                    # Learning card list
│   │               ├── [cardId]/edit/page.tsx       # Card editor
│   │               └── [cardId]/analysis/page.tsx   # Card analysis
├── student/                        # Student pages
│   ├── layout.tsx                  # Student layout (mobile-first)
│   ├── courses/page.tsx            # My courses & cards
│   └── cards/[cardId]/page.tsx     # Answer questions
├── api/
│   └── ai/
│       ├── score/route.ts          # AI scoring (Edge Runtime)
│       └── feedback/route.ts       # AI feedback (Edge Runtime, streaming)
├── layout.tsx                      # Root layout
└── page.tsx                        # Landing / redirect
lib/
├── db/
│   ├── schema.ts                   # Drizzle schema
│   ├── index.ts                    # DB connection
│   └── migrations/                 # Migration files
├── actions/                        # Server Actions
│   ├── auth.ts
│   ├── courses.ts
│   ├── students.ts
│   ├── classrooms.ts
│   ├── cards.ts
│   └── models.ts
├── ai/
│   ├── prompts.ts                  # Template placeholder replacement
│   └── scoring.ts                  # Scoring logic
├── auth.ts                         # JWT utilities (sign, verify)
└── utils.ts
components/
├── ui/                             # Shadcn UI components
├── teacher/                        # Teacher-specific components
├── student/                        # Student-specific components
└── shared/                         # Shared components
```

## Data Model

### teachers

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default gen |
| name | varchar(50) | |
| college | varchar(100) | Academy/department |
| major | varchar(100) | |
| phone | varchar(20) | Unique, used for login |
| password_hash | varchar(255) | bcrypt hash |
| created_at | timestamp | |
| updated_at | timestamp | |

### llm_models

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK -> teachers |
| display_name | varchar(100) | Shown in UI |
| model_name | varchar(100) | API model identifier |
| base_url | varchar(500) | API endpoint |
| api_key | varchar(500) | Encrypted at rest |
| is_default | boolean | One default per teacher |
| created_at | timestamp | |

### courses

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK -> teachers |
| year | varchar(20) | e.g. "2025-2026" |
| semester | varchar(20) | e.g. "第一学期" |
| name | varchar(200) | Course name |
| student_count | integer | |
| class_composition | text | Teaching class composition |
| created_at | timestamp | |
| updated_at | timestamp | |

### students

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| student_no | varchar(50) | Unique, dedup key for Excel import |
| name | varchar(50) | |
| gender | varchar(10) | |
| college | varchar(100) | |
| grade | varchar(20) | |
| major | varchar(100) | |
| class | varchar(50) | |
| phone | varchar(20) | |
| email | varchar(100) | |
| created_at | timestamp | |

### course_students

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| course_id | uuid | FK -> courses |
| student_id | uuid | FK -> students |
| is_retake | boolean | Whether retaking |
| created_at | timestamp | |

Unique constraint on (course_id, student_id).

### classrooms

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| course_id | uuid | FK -> courses |
| date | date | Required |
| time | varchar(50) | Required, e.g. "10:00-11:30" |
| name | varchar(200) | |
| room | varchar(100) | |
| instructor | varchar(50) | Default: teacher name |
| notes | text | |
| created_at | timestamp | |
| updated_at | timestamp | |

### learning_cards

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| classroom_id | uuid | FK -> classrooms |
| name | varchar(200) | Default: classroom name |
| status | varchar(20) | 'draft' or 'published' |
| total_score | integer | Sum of all question scores. Publishing requires total_score == 100. Editor shows running total with warning if != 100. |
| created_at | timestamp | |
| updated_at | timestamp | |

### card_questions

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| card_id | uuid | FK -> learning_cards |
| type | varchar(30) | 'self_assessment', 'multiple_choice', 'fill_blank', 'short_answer' |
| order | integer | Display order |
| title | varchar(500) | Question title/stem |
| content | text | Extended content (markdown for short_answer) |
| options | jsonb | For multiple_choice: [{label, text}] |
| correct_answer | text | Standard answer (JSON for fill_blank: array of answers per blank) |
| score | integer | Points for this question (self_assessment: 0) |
| grading_prompt | text | Scoring prompt (fill_blank, short_answer only) |
| feedback_prompt | text | Personalized feedback prompt |
| created_at | timestamp | |

### student_answers

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| question_id | uuid | FK -> card_questions |
| student_id | uuid | FK -> students |
| answer | jsonb | Student's answer (varies by type) |
| score | integer | Awarded score (null before grading) |
| ai_feedback | text | AI-generated feedback text |
| submitted_at | timestamp | |
| device_type | varchar(20) | 'mobile', 'desktop', 'tablet' |

Unique constraint on (question_id, student_id).

### prompt_templates

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK -> teachers |
| question_type | varchar(30) | 'multiple_choice', 'fill_blank', 'short_answer' |
| template_kind | varchar(20) | 'scoring' or 'feedback' |
| content | text | Template with {} placeholders |
| created_at | timestamp | |
| updated_at | timestamp | |

Unique constraint on (teacher_id, question_type, template_kind) — one template per type per teacher.

## Environment Variables

Required environment variables (`.env.local`):
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `DIRECT_URL` — Supabase direct connection (for migrations)
- `JWT_SECRET` — Secret key for signing JWTs
- `NEXT_PUBLIC_APP_URL` — Application URL (for redirects)

## Authentication

### Teacher Auth
- Register with: name, college, major, phone, password
- Login with: phone + password
- Password hashed with bcryptjs, stored in `teachers.password_hash`
- On success: sign JWT with `jose`, set httpOnly cookie
- JWT payload: `{ id, role: 'teacher', name }`

### Student Auth
- Login with: student_no + name (no password)
- System verifies match in `students` table
- On success: sign JWT with `jose`, set httpOnly cookie
- JWT payload: `{ id, role: 'student', student_no, name }`

### Route Protection
- Next.js middleware reads JWT from cookie
- `/teacher/*` requires `role: 'teacher'`
- `/student/*` requires `role: 'student'`
- Unauthenticated requests redirect to login page
- Server Actions verify ownership (teacher_id matches JWT) before mutations

## Feature Modules

### 1. Teacher Profile Management

- Registration form: college, major, name, phone, password
- Profile edit page: update all fields except phone
- Server Action: `createTeacher`, `updateTeacher`

### 2. LLM Model Management

- Table listing all models for the current teacher
- CRUD dialog/form: display_name, model_name, base_url, api_key
- api_key shown as `****` after save (only editable, not viewable)
- "Set as default" button per row; current default highlighted
- Server Actions: `createModel`, `updateModel`, `deleteModel`, `setDefaultModel`

### 3. Course Management

- Card/table list of courses
- Create/edit form: year, semester, name, student_count, class_composition
- Teacher auto-filled from session
- Only the creating teacher can manage
- Server Actions: `createCourse`, `updateCourse`, `deleteCourse`, `getCourses`

### 4. Student Management

- Accessed within a course context (`/teacher/courses/[courseId]/students`)
- Excel import workflow:
  1. Teacher uploads `.xlsx` file
  2. Client-side SheetJS parses the file
  3. Preview table shown for confirmation
  4. On confirm, Server Action batch-upserts:
     - Existing students (by student_no): skip insert, create course_students link
     - New students: insert into students + create course_students link
- Individual student CRUD
- Search and filter in student list
- Server Actions: `importStudents`, `addStudent`, `updateStudent`, `removeStudentFromCourse`

### 5. Classroom Management

- Accessed within a course context (`/teacher/courses/[courseId]/classrooms`)
- List of classrooms for the course
- Create/edit form: date (required), time (required), name, room, instructor (default: teacher name), notes
- Server Actions: `createClassroom`, `updateClassroom`, `deleteClassroom`

### 6. Learning Card Management (Core)

**Card List Page** (`/teacher/.../cards`):
- Lists all cards for a classroom
- Status badge: draft / published
- Action buttons: edit (draft only), publish, analysis

**Card Editor Page** (`/teacher/.../cards/[cardId]/edit`):
- Top: card name input (default: classroom name)
- Questions listed in order, drag-and-drop reordering via @dnd-kit
- "Add Question" button with type selector
- Per-type editor forms:
  - **Self-assessment**: learning content name input
  - **Multiple-choice**: score, stem, dynamic options (add/remove), check correct answers, feedback prompt (pre-filled from template, editable)
  - **Fill-in-the-blank**: score, stem (with `___` markers), answer per blank, feedback prompt
  - **Short-answer**: score, stem, standard answer, feedback prompt
- Bottom: auto-calculated total score display
- Save as draft (auto-save or explicit save button)

**Publishing**:
- Confirm dialog from card list page
- Sets status to 'published', card becomes read-only
- Server Action: `publishCard`

### 7. Student Answering Interface

**Course/Card List** (`/student/courses`):
- Cards grouped by course
- Only published cards visible
- Status indicators (answered/unanswered)

**Answer Page** (`/student/cards/[cardId]`):
- On page load: query all `student_answers` for this student + card. For previously submitted questions, pre-populate the answer, display the score, render inputs in disabled/read-only state. Only unanswered questions show active inputs.
- Each question rendered with its own submit button
- Per-type behavior:
  - **Self-assessment**: star rating (0-5, auto-submit on click) + text area (submit button)
  - **Multiple-choice**: checkboxes for options + submit button → instant comparison with correct answer. Scoring: all-or-nothing (full points if all correct options selected and no incorrect ones, 0 otherwise).
  - **Fill-in-the-blank**: input fields per blank + submit button → AI scoring
  - **Short-answer**: textarea (markdown) + submit button → AI scoring
- After submission: question locked (disabled inputs, no submit button), score displayed, previously submitted answers shown
- AI feedback streams in below the question via Vercel AI SDK
- Submission lock is server-enforced: Server Action checks for existing `student_answers` record before accepting a new submission. The unique constraint on `(question_id, student_id)` is the final safeguard.

### 8. AI Scoring and Feedback

**Scoring flow** (fill-in-the-blank & short-answer):
```
Student submits answer
→ Server Action saves to student_answers
→ POST /api/ai/score (Edge Runtime)
→ Load grading_prompt template from card_questions
→ Replace placeholders: {题干} {标准答案} {学生答案}
→ Call teacher's default LLM (base_url + api_key + model_name)
→ Parse integer response (0-10)
→ Scale to question points: awarded = round(llm_score / 10 * question.score)
→ Update student_answers.score with the awarded points
→ Return score to client
```

**Feedback flow** (streaming, all scored types):
```
After scoring completes
→ POST /api/ai/feedback (Edge Runtime, streaming)
→ Load feedback_prompt from card_questions
→ Replace placeholders: {题干} {标准答案} {学生答案} {得分}
→ streamText() via Vercel AI SDK with OpenAI-compatible provider
→ Client renders streaming text with useChat/useCompletion
→ Save completed feedback to student_answers.ai_feedback
```

**Multiple-choice**: auto-graded client-side against correct_answer. No LLM call for scoring. Scoring is all-or-nothing: full points if all correct options are selected and no incorrect ones, 0 points otherwise. Feedback prompt is still sent to LLM for personalized explanation. Note: the requirements doc says "应用大语言模型自动批改多选题" — we interpret "批改" as generating personalized feedback/explanation, not scoring. Scoring is deterministic comparison against the standard answer.

**Self-assessment**: no scoring or AI feedback. Star rating and text saved directly.

### 9. Learning Card Analysis (Teacher)

**Analysis Page** (`/teacher/.../cards/[cardId]/analysis`):
- Shows all question stems (no answers visible by default)
- Each question has an "Analyze" button
- Per-type analysis on click:
  - **Multiple-choice**: display question info, correct answer, bar chart (Recharts) showing selection percentage per option
  - **Fill-in-the-blank**: display question info, correct answer, word cloud of student answers
  - **Short-answer**: display question info, correct answer, scrolling marquee/danmaku of student answers

### 10. Prompt Template Management

- Teacher edits global templates per question type
- Two template kinds per type: scoring template + feedback template
- Templates use `{}` placeholders replaced at runtime
- Default templates pre-seeded from requirements:

**Fill-in-the-blank scoring template**:
```
题目（含空格）{题干}

标准答案是:每个空的{标准答案}
学生答案是：学生每个空的{学生答案}

你是一位生成式人工智能的专业课程教师，请根据以上信息，为该题目进行打分，要考虑专业知识和语义相似度，分值在0-10分之间，你的输出仅能是一个整数
```

**Short-answer scoring template**:
```
题目：{题干}

标准答案是:{标准答案}
学生答案是：{学生答案}

你是一位生成式人工智能的专业课程教师，请根据以上信息，为该题目进行打分，要考虑专业知识和语义相似度，分值在0-10分之间，你的输出仅能是一个整数
```

**Multiple-choice feedback template**:
```
题目{题干}
所有{选项}

标准答案是:{标准答案}
学生答案是：{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。
```

**Fill-in-the-blank feedback template**:
```
题目（含空格）{题干}

标准答案是:每个空的{标准答案}
学生答案是：每个空的{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。
```

**Short-answer feedback template**:
```
题目{题干}

标准答案是:{标准答案}
学生答案是：{学生答案}

请给根据以上信息为学生解释标准答案的含义。
如果学生正确，给予鼓励！
如果学生错误，解释下学生的作答为何出错以及后续的注意问题。
```

## Mobile Responsiveness

- Mobile-first design throughout
- Student interface optimized for phone: card-based layout, large touch targets
- Teacher interface: sidebar + content area on desktop, collapsible sidebar on mobile
- Long streaming text: auto-wrap + scrollable containers
- All UI text in Simplified Chinese

## Implementation Phases

1. **Phase 1 — Foundation**: Project init (Next.js + Tailwind + Shadcn), Drizzle schema, DB migration, auth system (JWT + middleware), landing page with role selection
2. **Phase 2 — Teacher Core**: Teacher profile, LLM model management, course CRUD, student management with Excel import
3. **Phase 3 — Classroom & Cards**: Classroom CRUD, learning card editor (all question types + drag-and-drop), card publishing
4. **Phase 4 — Student Experience**: Student login, course/card listing, answer interface, AI scoring integration (Edge Runtime), streaming feedback
5. **Phase 5 — Analysis & Templates**: Card analysis page (charts, word cloud, danmaku), prompt template management
