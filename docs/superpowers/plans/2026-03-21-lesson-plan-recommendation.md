# Personalized Lesson Plan Recommendation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers upload docx lesson plans per classroom; the system AI-matches self-assessment question titles to lesson plan headings; students scoring ≤3 stars are prompted to jump to the matched section.

**Architecture:** New `lesson_plans` and `lesson_plan_sections` DB tables. `mammoth` parses docx→HTML on upload (images kept as inline base64). AI matching via teacher's default LLM on question save. Student viewer page at `/student/lesson-plan/[id]` with anchor scrolling.

**Tech Stack:** mammoth (docx→HTML), sanitize-html (XSS prevention), Vercel AI SDK (LLM matching), Drizzle ORM (schema + queries), Next.js App Router (API routes + pages)

**Note:** Project does NOT use Supabase Storage SDK — only PostgreSQL via Drizzle. Images are kept as base64 data URIs inline in HTML to avoid adding new infrastructure.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install mammoth and sanitize-html**

```bash
npm install mammoth sanitize-html
```

- [ ] **Step 2: Install types for sanitize-html**

```bash
npm install -D @types/sanitize-html
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mammoth and sanitize-html dependencies"
```

---

### Task 2: Database schema changes

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add `lessonPlans` table to schema**

Add after the `classrooms` table definition in `lib/db/schema.ts`:

```typescript
export const lessonPlans = pgTable("lesson_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  classroomId: uuid("classroom_id")
    .notNull()
    .references(() => classrooms.id, { onDelete: "cascade" })
    .unique(),
  fileName: varchar("file_name", { length: 200 }).notNull(),
  htmlContent: text("html_content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add `lessonPlanSections` table to schema**

Add after `lessonPlans`:

```typescript
export const lessonPlanSections = pgTable("lesson_plan_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonPlanId: uuid("lesson_plan_id")
    .notNull()
    .references(() => lessonPlans.id, { onDelete: "cascade" }),
  headingLevel: integer("heading_level").notNull(),
  headingText: varchar("heading_text", { length: 500 }).notNull(),
  anchorId: varchar("anchor_id", { length: 200 }).notNull(),
  sectionOrder: integer("section_order").notNull(),
});
```

- [ ] **Step 3: Add `matchedSectionId` to `cardQuestions` table**

Add this field to the existing `cardQuestions` table definition, after `closedAt`:

```typescript
  matchedSectionId: uuid("matched_section_id")
    .references(() => lessonPlanSections.id, { onDelete: "set null" }),
```

Note: This requires importing `lessonPlanSections` to be defined before `cardQuestions` in the file, OR moving the tables. Since `lessonPlans` → `classrooms` and `cardQuestions` → `learningCards` → `classrooms`, put the new tables between `classrooms` and `learningCards` definitions. Actually, since Drizzle uses lazy references via arrow functions, order doesn't matter. Just add the new tables after all existing tables and add the field to `cardQuestions`.

- [ ] **Step 4: Generate and run migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration SQL generated and applied. New tables created, new column added.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add lesson_plans and lesson_plan_sections schema, add matched_section_id to card_questions"
```

---

### Task 3: Lesson plan server actions

**Files:**
- Create: `lib/actions/lesson-plans.ts`

- [ ] **Step 1: Create `lib/actions/lesson-plans.ts` with helper functions**

```typescript
"use server";

import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

// Verify teacher owns the classroom
export async function verifyClassroomOwnership(classroomId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;
  const result = await db
    .select({ courseId: courses.id, teacherId: courses.teacherId })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));
  return result.length > 0 ? { user, courseId: result[0].courseId } : null;
}

// Get lesson plan for a classroom
export async function getLessonPlan(classroomId: string) {
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.classroomId, classroomId));
  if (!plan) return null;

  const sections = await db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, plan.id))
    .orderBy(lessonPlanSections.sectionOrder);

  return { ...plan, sections };
}

// Get lesson plan by ID (for student viewer)
export async function getLessonPlanById(id: string) {
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.id, id));
  return plan ?? null;
}

// Get sections for a lesson plan
export async function getLessonPlanSections(lessonPlanId: string) {
  return db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, lessonPlanId))
    .orderBy(lessonPlanSections.sectionOrder);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/lesson-plans.ts
git commit -m "feat: add lesson plan server actions"
```

---

### Task 4: Docx upload API route

**Files:**
- Create: `app/api/lesson-plan/upload/route.ts`

- [ ] **Step 1: Create the upload API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  classrooms,
  courses,
  cardQuestions,
  learningCards,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

function processHtml(rawHtml: string): {
  html: string;
  sections: Array<{
    headingLevel: number;
    headingText: string;
    anchorId: string;
    sectionOrder: number;
  }>;
} {
  const sections: Array<{
    headingLevel: number;
    headingText: string;
    anchorId: string;
    sectionOrder: number;
  }> = [];

  let sectionIndex = 0;

  // Inject anchor IDs into headings and extract section info
  const processedHtml = rawHtml.replace(
    /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      const level = parseInt(tag.charAt(1));
      const anchorId = `section-${sectionIndex}`;
      // Strip HTML tags from heading text for storage
      const textContent = content.replace(/<[^>]*>/g, "").trim();

      if (textContent) {
        sections.push({
          headingLevel: level,
          headingText: textContent,
          anchorId,
          sectionOrder: sectionIndex,
        });
        sectionIndex++;
        return `<${tag}${attrs} id="${anchorId}">${content}</${tag}>`;
      }
      return match;
    }
  );

  // Sanitize HTML: allow standard tags, strip scripts and event handlers
  const sanitized = sanitizeHtml(processedHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "h3", "h4", "h5", "h6",
      "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption", "sup", "sub",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "width", "height", "style"],
      h1: ["id"], h2: ["id"], h3: ["id"],
      h4: ["id"], h5: ["id"], h6: ["id"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      "*": ["style"],
    },
    allowedSchemes: ["data", "https", "http"],
  });

  return { html: sanitized, sections };
}

export async function POST(request: NextRequest) {
  // Auth check
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const classroomId = formData.get("classroomId") as string | null;

  if (!file || !classroomId) {
    return NextResponse.json({ error: "缺少文件或课堂ID" }, { status: 400 });
  }

  // Verify teacher owns this classroom
  const authResult = await db
    .select({ courseId: courses.id })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(and(eq(classrooms.id, classroomId), eq(courses.teacherId, user.id)));

  if (authResult.length === 0) {
    return NextResponse.json({ error: "未授权" }, { status: 403 });
  }

  try {
    // Convert docx to HTML using mammoth
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(arrayBuffer) },
      {
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read("base64").then(function (imageBuffer) {
            const contentType = image.contentType || "image/png";
            return { src: `data:${contentType};base64,${imageBuffer}` };
          });
        }),
      }
    );

    const { html, sections } = processHtml(result.value);

    // Database transaction: delete old, insert new
    await db.transaction(async (tx) => {
      // Delete existing lesson plan for this classroom (cascade deletes sections)
      await tx
        .delete(lessonPlans)
        .where(eq(lessonPlans.classroomId, classroomId));

      // Insert new lesson plan
      const [newPlan] = await tx
        .insert(lessonPlans)
        .values({
          classroomId,
          fileName: file.name,
          htmlContent: html,
        })
        .returning();

      // Insert sections
      if (sections.length > 0) {
        await tx.insert(lessonPlanSections).values(
          sections.map((s) => ({
            lessonPlanId: newPlan.id,
            ...s,
          }))
        );
      }
    });

    // Get the newly created lesson plan for response
    const [newPlan] = await db
      .select({ id: lessonPlans.id })
      .from(lessonPlans)
      .where(eq(lessonPlans.classroomId, classroomId));

    return NextResponse.json({
      success: true,
      lessonPlanId: newPlan.id,
      sectionCount: sections.length,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Lesson plan upload error:", error);
    return NextResponse.json({ error: "教案解析失败" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/lesson-plan/upload/route.ts
git commit -m "feat: add docx lesson plan upload API route"
```

---

### Task 5: AI matching API route

**Files:**
- Create: `app/api/lesson-plan/match/route.ts`

- [ ] **Step 1: Create the AI matching API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { db } from "@/lib/db";
import {
  lessonPlans,
  lessonPlanSections,
  cardQuestions,
  classrooms,
  courses,
  llmModels,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  if (!token) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const user = await verifyToken(token);
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { questionTitle, classroomId, questionId } = await request.json();

  if (!questionTitle || !classroomId || !questionId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // Get lesson plan sections for this classroom
  const [plan] = await db
    .select()
    .from(lessonPlans)
    .where(eq(lessonPlans.classroomId, classroomId));

  if (!plan) {
    return NextResponse.json({ error: "该课堂未上传教案" }, { status: 404 });
  }

  const sections = await db
    .select()
    .from(lessonPlanSections)
    .where(eq(lessonPlanSections.lessonPlanId, plan.id))
    .orderBy(lessonPlanSections.sectionOrder);

  if (sections.length === 0) {
    return NextResponse.json({ error: "教案中未找到标题" }, { status: 404 });
  }

  // Resolve teacher's default LLM: classrooms → courses → llm_models
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, classroomId));
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, classroom.courseId));
  const [model] = await db
    .select()
    .from(llmModels)
    .where(
      and(eq(llmModels.teacherId, course.teacherId), eq(llmModels.isDefault, true))
    );

  if (!model) {
    return NextResponse.json({ error: "请先配置默认AI模型" }, { status: 400 });
  }

  // Build the matching prompt
  const headingList = sections
    .map((s, i) => `${i + 1}. ${s.headingText}`)
    .join("\n");

  const prompt = `你是一个教案标题匹配助手。给定一个学习内容名称和一组教案标题，找出最匹配的标题。

学习内容名称：${questionTitle}

教案标题列表：
${headingList}

请返回最匹配标题的序号(从1开始)。如果没有合适的匹配，返回0。只返回数字。`;

  try {
    const openai = createOpenAI({ baseURL: model.baseUrl, apiKey: model.apiKey });
    const { text } = await generateText({
      model: openai(model.modelName),
      prompt,
    });

    // Parse the response — extract first integer
    const match = text.trim().match(/\d+/);
    const index = match ? parseInt(match[0]) : 0;

    let matchedSectionId: string | null = null;
    let matchedHeadingText: string | null = null;

    if (index > 0 && index <= sections.length) {
      matchedSectionId = sections[index - 1].id;
      matchedHeadingText = sections[index - 1].headingText;
    }

    // Update the question's matched_section_id
    await db
      .update(cardQuestions)
      .set({ matchedSectionId })
      .where(eq(cardQuestions.id, questionId));

    return NextResponse.json({
      success: true,
      matchedSectionId,
      matchedHeadingText,
    });
  } catch (error) {
    console.error("AI matching error:", error);

    // Set matched_section_id to null on failure
    await db
      .update(cardQuestions)
      .set({ matchedSectionId: null })
      .where(eq(cardQuestions.id, questionId));

    return NextResponse.json({ error: "AI匹配失败" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/lesson-plan/match/route.ts
git commit -m "feat: add AI lesson plan heading matching API route"
```

---

### Task 6: Teacher UI — lesson plan upload component

**Files:**
- Create: `components/teacher/lesson-plan-upload.tsx`

- [ ] **Step 1: Create the upload component**

```typescript
"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type LessonPlanInfo = {
  id: string;
  fileName: string;
  sectionCount: number;
} | null;

export function LessonPlanUpload({
  classroomId,
  existingPlan,
}: {
  classroomId: string;
  existingPlan: LessonPlanInfo;
}) {
  const [plan, setPlan] = useState<LessonPlanInfo>(existingPlan);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error("请上传 .docx 格式的文件");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("classroomId", classroomId);

      const response = await fetch("/api/lesson-plan/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "上传失败");
        return;
      }

      setPlan({
        id: data.lessonPlanId,
        fileName: data.fileName,
        sectionCount: data.sectionCount,
      });
      toast.success(`教案上传成功，识别到 ${data.sectionCount} 个标题`);
    });

    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="hidden"
        onChange={handleFileChange}
      />

      {plan ? (
        <>
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{plan.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {plan.sectionCount} 个标题章节
            </p>
          </div>
          <Link href={`/student/lesson-plan/${plan.id}`} target="_blank">
            <Button variant="ghost" size="sm" title="预览教案">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            disabled={isPending}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            {isPending ? "上传中..." : "重新上传"}
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-sm text-muted-foreground">
            上传教案（.docx）可为自评题自动匹配精准教案章节
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpload}
            disabled={isPending}
          >
            <Upload className="mr-1 h-3 w-3" />
            {isPending ? "上传中..." : "上传教案"}
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/teacher/lesson-plan-upload.tsx
git commit -m "feat: add lesson plan upload UI component"
```

---

### Task 7: Integrate upload component into cards page

**Files:**
- Modify: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/page.tsx`

- [ ] **Step 1: Update the cards page to fetch and display lesson plan info**

Add imports and fetch lesson plan data in the server component, then pass to `CardList`:

```typescript
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCards } from "@/lib/actions/cards";
import { getLessonPlan } from "@/lib/actions/lesson-plans";
import { db } from "@/lib/db";
import { classrooms, courses, lessonPlanSections } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { CardList } from "./card-list";
import { LessonPlanUpload } from "@/components/teacher/lesson-plan-upload";

async function getClassroom(classroomId: string, teacherId: string) {
  const result = await db
    .select({ classroom: classrooms })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(
      and(eq(classrooms.id, classroomId), eq(courses.teacherId, teacherId))
    );
  return result.length > 0 ? result[0].classroom : null;
}

export default async function CardsPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId, classroomId } = await params;
  const classroom = await getClassroom(classroomId, user.id);

  if (!classroom) {
    redirect(`/teacher/courses/${courseId}/classrooms`);
  }

  const cards = await getCards(classroomId);
  const classroomDisplayName =
    classroom.name || `${classroom.date} 课堂`;

  // Fetch lesson plan info
  const lessonPlan = await getLessonPlan(classroomId);
  const lessonPlanInfo = lessonPlan
    ? {
        id: lessonPlan.id,
        fileName: lessonPlan.fileName,
        sectionCount: lessonPlan.sections.length,
      }
    : null;

  return (
    <div className="space-y-4">
      <LessonPlanUpload
        classroomId={classroomId}
        existingPlan={lessonPlanInfo}
      />
      <CardList
        cards={cards}
        courseId={courseId}
        classroomId={classroomId}
        classroomName={classroomDisplayName}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/page.tsx
git commit -m "feat: integrate lesson plan upload into classroom cards page"
```

---

### Task 8: Trigger AI matching on card save

**Files:**
- Modify: `lib/actions/cards.ts`

- [ ] **Step 1: Update `saveQuestions` to return question IDs**

In `lib/actions/cards.ts`, modify the `saveQuestions` function. Change the insert to return the new question IDs, and return them along with the classroomId for the client to trigger matching:

Replace the insert block and return:

```typescript
  // Insert new questions and get their IDs
  let insertedQuestions: Array<{ id: string; type: string; title: string }> = [];
  if (questions.length > 0) {
    insertedQuestions = await db.insert(cardQuestions).values(
      questions.map((q) => ({
        cardId,
        type: q.type,
        order: q.order,
        title: q.title,
        content: q.content || null,
        options: q.options || null,
        correctAnswer: q.correctAnswer || null,
        score: q.score,
        gradingPrompt: q.gradingPrompt || null,
        feedbackPrompt: q.feedbackPrompt || null,
      }))
    ).returning({ id: cardQuestions.id, type: cardQuestions.type, title: cardQuestions.title });
  }

  // Update totalScore on the card
  await db
    .update(learningCards)
    .set({ name: cardName.trim(), totalScore, updatedAt: new Date() })
    .where(eq(learningCards.id, cardId));

  revalidatePath(
    `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
  );

  // Return self-assessment question info for AI matching
  const selfAssessmentQuestions = insertedQuestions
    .filter((q) => q.type === "self_assessment")
    .map((q) => ({ id: q.id, title: q.title }));

  return { success: true, classroomId, selfAssessmentQuestions };
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/cards.ts
git commit -m "feat: return self-assessment question info from saveQuestions for AI matching"
```

---

### Task 9: Card editor — trigger AI matching after save

**Files:**
- Modify: `components/teacher/card-editor/index.tsx`

- [ ] **Step 1: Add AI matching after save in CardEditor**

In the `handleSave` function inside `CardEditor`, after the successful save, trigger AI matching for each self-assessment question:

Replace the existing `handleSave` function body (the `startTransition` callback) with:

```typescript
    startTransition(async () => {
      const result = await saveQuestions(
        card.id,
        cardName,
        questions.map((q, index) => ({
          type: q.type,
          order: index,
          title: q.title,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          score: q.score,
          gradingPrompt: q.gradingPrompt,
          feedbackPrompt: q.feedbackPrompt,
        }))
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("保存成功");
        router.refresh();

        // Trigger AI matching for self-assessment questions
        if (result.selfAssessmentQuestions && result.selfAssessmentQuestions.length > 0 && result.classroomId) {
          for (const q of result.selfAssessmentQuestions) {
            if (q.title.trim()) {
              fetch("/api/lesson-plan/match", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  questionTitle: q.title,
                  classroomId: result.classroomId,
                  questionId: q.id,
                }),
              }).then(async (res) => {
                const data = await res.json();
                if (res.ok && data.matchedHeadingText) {
                  toast.success(`已匹配教案: ${data.matchedHeadingText}`);
                }
              }).catch(() => {
                // Silently ignore matching errors — non-critical
              });
            }
          }
        }
      }
    });
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/teacher/card-editor/index.tsx
git commit -m "feat: trigger AI lesson plan matching after saving self-assessment questions"
```

---

### Task 10: Student data — include lesson plan info

**Files:**
- Modify: `lib/actions/student-data.ts`

- [ ] **Step 1: Extend `getCardForStudent` to return lesson plan link data**

Add imports and query lesson plan matching info. After the existing `cardAnswers` query, add:

```typescript
import {
  courseStudents, courses, classrooms, learningCards,
  cardQuestions, studentAnswers, lessonPlans, lessonPlanSections,
} from "@/lib/db/schema";
```

And before the return statement in `getCardForStudent`, add:

```typescript
  // Build lesson plan link map for self-assessment questions
  const selfAssessmentQuestions = questions.filter(
    (q) => q.type === "self_assessment" && q.matchedSectionId
  );

  const lessonPlanLinks: Record<
    string,
    { lessonPlanId: string; anchorId: string; headingText: string }
  > = {};

  for (const q of selfAssessmentQuestions) {
    if (!q.matchedSectionId) continue;
    const [section] = await db
      .select({
        lessonPlanId: lessonPlanSections.lessonPlanId,
        anchorId: lessonPlanSections.anchorId,
        headingText: lessonPlanSections.headingText,
      })
      .from(lessonPlanSections)
      .where(eq(lessonPlanSections.id, q.matchedSectionId));
    if (section) {
      lessonPlanLinks[q.id] = section;
    }
  }
```

And update the return to include `lessonPlanLinks`:

```typescript
  return {
    card,
    questions,
    existingAnswers: cardAnswers,
    ratingSettings,
    lessonPlanLinks,
  };
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/student-data.ts
git commit -m "feat: include lesson plan link data in student card query"
```

---

### Task 11: Student UI — pass lesson plan data through component chain

**Files:**
- Modify: `app/student/cards/[cardId]/page.tsx`
- Modify: `components/student/student-card-content.tsx`
- Modify: `components/student/answer-card.tsx`

- [ ] **Step 1: Update student card page to pass lessonPlanLinks**

In `app/student/cards/[cardId]/page.tsx`, pass the new data to `StudentCardContent`:

```typescript
  const { card, questions, existingAnswers, ratingSettings, lessonPlanLinks } = data;
```

And add the prop:

```tsx
      <StudentCardContent
        cardName={card.name}
        totalScore={card.totalScore}
        questions={questions}
        answerMap={answerMap}
        ratingSettings={{
          high: ratingSettings.cardHigh,
          mid: ratingSettings.cardMid,
          low: ratingSettings.cardLow,
        }}
        lessonPlanLinks={lessonPlanLinks}
      />
```

- [ ] **Step 2: Update `StudentCardContent` to accept and pass `lessonPlanLinks`**

In `components/student/student-card-content.tsx`:

Add prop type:

```typescript
  lessonPlanLinks?: Record<
    string,
    { lessonPlanId: string; anchorId: string; headingText: string }
  >;
```

Pass to `AnswerCard`:

```tsx
            <AnswerCard
              key={question.id}
              question={question}
              existingAnswer={answerMap.get(question.id) ?? null}
              onScoreUpdate={handleScoreUpdate}
              lessonPlanLink={lessonPlanLinks?.[question.id] ?? null}
            />
```

- [ ] **Step 3: Update `AnswerCard` to accept and pass `lessonPlanLink`**

In `components/student/answer-card.tsx`:

Add prop:

```typescript
  lessonPlanLink?: { lessonPlanId: string; anchorId: string; headingText: string } | null;
```

Pass to `SelfAssessmentAnswer`:

```tsx
              <SelfAssessmentAnswer
                questionId={question.id}
                existingAnswer={existingAnswer}
                onScoreUpdate={onScoreUpdate}
                lessonPlanLink={lessonPlanLink}
              />
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/student/cards/\[cardId\]/page.tsx components/student/student-card-content.tsx components/student/answer-card.tsx
git commit -m "feat: pass lesson plan link data through student component chain"
```

---

### Task 12: Student UI — self-assessment dialog and link

**Files:**
- Modify: `components/student/self-assessment-answer.tsx`

- [ ] **Step 1: Add lesson plan dialog and link to SelfAssessmentAnswer**

Rewrite `components/student/self-assessment-answer.tsx` to add:
1. A `lessonPlanLink` prop
2. After submission with stars ≤ 3: show a dialog asking if student wants to view the lesson plan
3. After submission: always show a "精准教案" link if `lessonPlanLink` exists

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
} | null;

type LessonPlanLink = {
  lessonPlanId: string;
  anchorId: string;
  headingText: string;
} | null;

export function SelfAssessmentAnswer({
  questionId,
  existingAnswer,
  onScoreUpdate,
  lessonPlanLink,
}: {
  questionId: string;
  existingAnswer: ExistingAnswer;
  onScoreUpdate?: (questionId: string, score: number) => void;
  lessonPlanLink?: LessonPlanLink;
}) {
  const router = useRouter();
  const existingData = existingAnswer?.answer as
    | { stars?: number; comment?: string }
    | undefined;

  const [stars, setStars] = useState(existingData?.stars ?? 0);
  const [comment, setComment] = useState(existingData?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingAnswer);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);

  function handleStarClick(rating: number) {
    if (submitted || isPending) return;

    setStars(rating);
    // Auto-submit on star click (includes current comment if any)
    startTransition(async () => {
      const result = await submitAnswer(
        questionId,
        { stars: rating, comment: comment.trim() || undefined },
        getDeviceType()
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      toast.success("评分已提交");
      if (result.score !== null && result.score !== undefined) {
        onScoreUpdate?.(questionId, result.score);
      }

      // Show dialog for low ratings if lesson plan link exists
      if (rating <= 3 && lessonPlanLink) {
        setShowDialog(true);
      }
    });
  }

  function handleNavigateToLessonPlan() {
    if (lessonPlanLink) {
      router.push(
        `/student/lesson-plan/${lessonPlanLink.lessonPlanId}#${lessonPlanLink.anchorId}`
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Hint to type comment first */}
      {!submitted && (
        <p className="text-xs text-muted-foreground">
          （先填写自评学习评语再进行评级）
        </p>
      )}

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={submitted || isPending}
            className="p-1.5 touch-manipulation disabled:cursor-not-allowed transition-transform active:scale-110"
            onMouseEnter={() => !submitted && setHoveredStar(rating)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(rating)}
            aria-label={`${rating} 星`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                rating <= (hoveredStar || stars)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {stars} 星
          </span>
        )}
      </div>

      {/* Comment text area */}
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="写一些学习感想...（可选）"
        rows={3}
        disabled={submitted || isPending}
      />

      {/* Lesson plan link — shown after submission if matched */}
      {submitted && lessonPlanLink && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNavigateToLessonPlan}
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <BookOpen className="mr-1.5 h-4 w-4" />
          精准教案: {lessonPlanLink.headingText}
        </Button>
      )}

      {/* Low score dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>学习建议</AlertDialogTitle>
            <AlertDialogDescription>
              似乎没学太明白，是否需要瞄一眼教案内容充个电？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>否</AlertDialogCancel>
            <AlertDialogAction onClick={handleNavigateToLessonPlan}>
              是
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/student/self-assessment-answer.tsx
git commit -m "feat: add lesson plan dialog and link to self-assessment answer"
```

---

### Task 13: Lesson plan viewer page

**Files:**
- Create: `app/student/lesson-plan/[id]/page.tsx`

- [ ] **Step 1: Create the lesson plan viewer page**

```typescript
import { notFound } from "next/navigation";
import { getLessonPlanById } from "@/lib/actions/lesson-plans";
import { LessonPlanViewer } from "./lesson-plan-viewer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function LessonPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getLessonPlanById(id);

  if (!plan) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/student/courses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Link>
      </div>

      <h1 className="text-xl font-semibold">{plan.fileName}</h1>

      <LessonPlanViewer htmlContent={plan.htmlContent} />
    </div>
  );
}
```

- [ ] **Step 2: Create the client-side viewer component with anchor scrolling**

Create `app/student/lesson-plan/[id]/lesson-plan-viewer.tsx`:

```typescript
"use client";

import { useEffect } from "react";

export function LessonPlanViewer({ htmlContent }: { htmlContent: string }) {
  useEffect(() => {
    // Scroll to anchor after render
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure layout is complete
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  return (
    <div
      className="prose prose-sm max-w-none
        prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg
        prose-table:border prose-td:border prose-td:p-2 prose-th:border prose-th:p-2
        prose-headings:scroll-mt-4"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/student/lesson-plan/
git commit -m "feat: add lesson plan viewer page with anchor scrolling"
```

---

### Task 14: End-to-end verification

- [ ] **Step 1: Start dev server and test upload flow**

```bash
npm run dev
```

Manual test:
1. Login as teacher
2. Navigate to a classroom → cards page
3. See "上传教案" section
4. Upload a .docx file
5. Verify it shows filename and section count

- [ ] **Step 2: Test AI matching flow**

1. Create a learning card with a self-assessment question
2. Set the "学习内容名称" to a topic that matches a heading in the uploaded lesson plan
3. Save the card
4. Check for toast message confirming match

- [ ] **Step 3: Test student experience**

1. Login as student
2. Navigate to a published learning card with a matched self-assessment question
3. Rate with ≤3 stars → verify dialog appears
4. Click "是" → verify navigation to lesson plan page at correct anchor
5. Rate with >3 stars on another question → verify no dialog, but "精准教案" link visible

- [ ] **Step 4: Test lesson plan viewer**

1. Verify lesson plan page renders correctly
2. Verify anchor scrolling works
3. Verify images display (inline base64)
4. Verify responsive layout on mobile viewport

- [ ] **Step 5: Verify production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete personalized lesson plan recommendation feature"
```
