# Analysis Fixes & Group Discussion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix analysis page to show full question content, add danmaku for self-assessment comments, and implement a new group discussion question type with peer rating.

**Architecture:** Add `group_discussion` as a 5th question type following existing patterns. New `group_ratings` table stores individual peer ratings. Server actions handle search, rating submission with score recalculation, and analysis data fetching. Teacher editor and student answer components follow existing component patterns.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Supabase PostgreSQL, Shadcn UI, Tailwind CSS

---

### Task 1: Fix Analysis Page — Show Full Question Content

**Files:**
- Modify: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/analysis/analysis-view.tsx:189-190`

- [ ] **Step 1: Add question content display in QuestionAnalysis**

In `analysis-view.tsx`, replace line 190:
```tsx
<div className="text-sm">{question.title}</div>
```
with a block that shows full question content based on type:
```tsx
<div className="text-sm space-y-2">
  <div className="whitespace-pre-wrap">{question.title}</div>
  {question.type === "multiple_choice" && question.options && (
    <div className="space-y-1 pl-2">
      {(question.options as { label: string; text: string }[]).map((opt) => (
        <div key={opt.label} className="flex gap-2 text-muted-foreground">
          <span className="font-medium">{opt.label}.</span>
          <span>{opt.text}</span>
        </div>
      ))}
    </div>
  )}
  {(question.type === "fill_blank" || question.type === "short_answer") && question.correctAnswer && (
    <div className="text-xs text-muted-foreground">
      参考答案：{question.correctAnswer}
    </div>
  )}
</div>
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/\[cardId\]/analysis/analysis-view.tsx
git commit -m "fix: show full question content in analysis page by default"
```

---

### Task 2: Self-Assessment Analysis — Danmaku for Comments

**Files:**
- Modify: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/analysis/analysis-view.tsx:94-108`

- [ ] **Step 1: Import ShortAnswerDanmaku in SelfAssessmentStats**

The `ShortAnswerDanmaku` is already imported at line 17. No new import needed.

- [ ] **Step 2: Replace static comment list with danmaku**

In the `SelfAssessmentStats` function, replace lines 94-108 (the comments section):
```tsx
{comments.length > 0 && (
  <div className="space-y-1">
    <div className="text-sm font-medium">学生评语（{comments.length} 条）</div>
    <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2">
      {comments.map((comment, i) => (
        <div
          key={i}
          className="rounded bg-background px-2 py-1 text-sm"
        >
          {comment}
        </div>
      ))}
    </div>
  </div>
)}
```
with:
```tsx
{comments.length > 0 && (
  <div className="space-y-1">
    <div className="text-sm font-medium">学生评语（{comments.length} 条）</div>
    <ShortAnswerDanmaku
      correctAnswer={null}
      answers={answers
        .filter((a) => {
          const d = a.answer as { comment?: string } | null;
          return d && typeof d.comment === "string" && d.comment.trim();
        })
        .map((a) => ({
          ...a,
          answer: (a.answer as { comment: string }).comment.trim(),
        }))}
    />
  </div>
)}
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/\[cardId\]/analysis/analysis-view.tsx
git commit -m "feat: use danmaku for self-assessment comments in analysis"
```

---

### Task 3: Add `groupRatings` Table to Schema

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add groupRatings table definition**

Add after the `promptTemplates` table (after line 160 in `lib/db/schema.ts`):
```typescript
export const groupRatings = pgTable(
  "group_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => cardQuestions.id, { onDelete: "cascade" }),
    raterId: uuid("rater_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    targetStudentId: uuid("target_student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.questionId, t.raterId, t.targetStudentId)]
);
```

- [ ] **Step 2: Generate and apply migration**

Run: `npx drizzle-kit generate` to create migration SQL.
Then apply in Supabase or via `npx drizzle-kit push`.

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "feat: add group_ratings table for peer rating"
```

---

### Task 4: Add `group_discussion` Question Type to Editor

**Files:**
- Modify: `components/teacher/card-editor/add-question-button.tsx:12-23`
- Create: `components/teacher/card-editor/question-group-discussion.tsx`
- Modify: `components/teacher/card-editor/index.tsx:75-87,94-123,229-270`

- [ ] **Step 1: Update QuestionType union and menu**

In `add-question-button.tsx`, change the type union (line 12-16):
```typescript
export type QuestionType =
  | "self_assessment"
  | "multiple_choice"
  | "fill_blank"
  | "short_answer"
  | "group_discussion";
```

Add to `QUESTION_TYPES` array (line 18-23):
```typescript
const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: "self_assessment", label: "自我评测" },
  { type: "multiple_choice", label: "多选题" },
  { type: "fill_blank", label: "填空题" },
  { type: "short_answer", label: "简述题" },
  { type: "group_discussion", label: "分组讨论" },
];
```

- [ ] **Step 2: Create question-group-discussion.tsx editor component**

Create `components/teacher/card-editor/question-group-discussion.tsx`:
```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GroupDiscussionData = {
  title: string;
  score: number;
};

export function QuestionGroupDiscussion({
  title,
  score,
  onChange,
}: {
  title: string;
  score: number;
  onChange: (data: Partial<GroupDiscussionData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>讨论题目</Label>
        <Input
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="请输入分组讨论的题目"
        />
      </div>
      <div className="space-y-2">
        <Label>分值</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) =>
            onChange({ score: Math.max(0, parseInt(e.target.value) || 0) })
          }
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          组员互评打星，得分按比例换算
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update card-editor/index.tsx**

Add import (after line 39):
```typescript
import { QuestionGroupDiscussion } from "./question-group-discussion";
```

Add to `TYPE_LABELS` (line 75-80):
```typescript
const TYPE_LABELS: Record<QuestionType, string> = {
  self_assessment: "自我评测",
  multiple_choice: "多选题",
  fill_blank: "填空题",
  short_answer: "简述题",
  group_discussion: "分组讨论",
};
```

Add to `TYPE_BADGE_VARIANTS` (line 82-87):
```typescript
const TYPE_BADGE_VARIANTS: Record<QuestionType, "default" | "secondary" | "outline"> = {
  self_assessment: "secondary",
  multiple_choice: "default",
  fill_blank: "outline",
  short_answer: "outline",
  group_discussion: "secondary",
};
```

Add case in `createDefaultQuestion` (after the `short_answer` case):
```typescript
case "group_discussion":
  return { ...base, score: 10 };
```

Add rendering branch in `SortableQuestionItem` (after the short_answer block, around line 268):
```tsx
{question.type === "group_discussion" && (
  <QuestionGroupDiscussion
    title={question.title}
    score={question.score}
    onChange={handleChange}
  />
)}
```

- [ ] **Step 4: Verify build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add components/teacher/card-editor/add-question-button.tsx components/teacher/card-editor/question-group-discussion.tsx components/teacher/card-editor/index.tsx
git commit -m "feat: add group_discussion question type to teacher editor"
```

---

### Task 5: Create Group Rating Server Actions

**Files:**
- Create: `lib/actions/group-ratings.ts`

- [ ] **Step 1: Create group-ratings.ts with all server actions**

Create `lib/actions/group-ratings.ts`:
```typescript
"use server";

import { db } from "@/lib/db";
import {
  groupRatings,
  cardQuestions,
  studentAnswers,
  students,
  courseStudents,
  learningCards,
  classrooms,
  courses,
} from "@/lib/db/schema";
import { eq, and, or, like, avg } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function searchCourseStudents(
  cardId: string,
  keyword: string
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];
  if (!keyword.trim()) return [];

  // Find course via card → classroom → course
  const cardResult = await db
    .select({ courseId: courses.id })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, cardId));

  if (cardResult.length === 0) return [];
  const courseId = cardResult[0].courseId;

  const searchPattern = `%${keyword.trim()}%`;
  const results = await db
    .select({
      id: students.id,
      studentNo: students.studentNo,
      name: students.name,
    })
    .from(courseStudents)
    .innerJoin(students, eq(courseStudents.studentId, students.id))
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        or(
          like(students.studentNo, searchPattern),
          like(students.name, searchPattern)
        )
      )
    )
    .limit(10);

  // Exclude self
  return results.filter((r) => r.id !== user.id);
}

export async function submitGroupRating(
  questionId: string,
  targetStudentId: string,
  stars: number
) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return { error: "未授权" };

  // Validate stars
  if (stars < 1 || stars > 5) return { error: "评分无效" };

  // Validate question
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question || question.type !== "group_discussion")
    return { error: "题目不存在" };

  // Prevent self-rating
  if (user.id === targetStudentId)
    return { error: "不能给自己打分" };

  // Validate target student is in same course
  const courseCheck = await db
    .select({ courseId: courses.id })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(eq(learningCards.id, question.cardId));

  if (courseCheck.length === 0) return { error: "课程不存在" };
  const courseId = courseCheck[0].courseId;

  const [targetEnrolled] = await db
    .select()
    .from(courseStudents)
    .where(
      and(
        eq(courseStudents.courseId, courseId),
        eq(courseStudents.studentId, targetStudentId)
      )
    );
  if (!targetEnrolled) return { error: "该学生不在本课程中" };

  // Check for existing rating (upsert behavior)
  const [existing] = await db
    .select()
    .from(groupRatings)
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.raterId, user.id),
        eq(groupRatings.targetStudentId, targetStudentId)
      )
    );

  if (existing) {
    // Already rated, return silently
    return { success: true, score: existing.stars };
  }

  // Insert rating
  await db.insert(groupRatings).values({
    questionId,
    raterId: user.id,
    targetStudentId,
    stars,
  });

  // Ensure rater has a studentAnswers record
  const [raterAnswer] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, user.id)
      )
    );
  if (!raterAnswer) {
    await db.insert(studentAnswers).values({
      questionId,
      studentId: user.id,
      answer: {},
      score: null,
    });
  }

  // Recalculate target student's score
  const avgResult = await db
    .select({ avgStars: avg(groupRatings.stars) })
    .from(groupRatings)
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.targetStudentId, targetStudentId)
      )
    );

  const avgStars = avgResult[0]?.avgStars
    ? parseFloat(avgResult[0].avgStars)
    : 0;
  const newScore = Math.round(avgStars * (question.score / 5));

  // Upsert target student's answer record with new score
  const [targetAnswer] = await db
    .select()
    .from(studentAnswers)
    .where(
      and(
        eq(studentAnswers.questionId, questionId),
        eq(studentAnswers.studentId, targetStudentId)
      )
    );

  if (targetAnswer) {
    await db
      .update(studentAnswers)
      .set({ score: newScore })
      .where(eq(studentAnswers.id, targetAnswer.id));
  } else {
    await db.insert(studentAnswers).values({
      questionId,
      studentId: targetStudentId,
      answer: {},
      score: newScore,
    });
  }

  return { success: true, score: newScore };
}

export async function getGroupRatings(questionId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "student") return [];

  const ratings = await db
    .select({
      targetStudentId: groupRatings.targetStudentId,
      targetStudentName: students.name,
      targetStudentNo: students.studentNo,
      stars: groupRatings.stars,
    })
    .from(groupRatings)
    .innerJoin(students, eq(groupRatings.targetStudentId, students.id))
    .where(
      and(
        eq(groupRatings.questionId, questionId),
        eq(groupRatings.raterId, user.id)
      )
    );

  return ratings;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/actions/group-ratings.ts
git commit -m "feat: add server actions for group discussion ratings"
```

---

### Task 6: Create Student Group Discussion Answer Component

**Files:**
- Create: `components/student/group-discussion-answer.tsx`
- Modify: `components/student/answer-card.tsx:35-47,80-118`

- [ ] **Step 1: Create group-discussion-answer.tsx**

Create `components/student/group-discussion-answer.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  searchCourseStudents,
  submitGroupRating,
  getGroupRatings,
} from "@/lib/actions/group-ratings";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
} | null;

type Member = {
  id: string;
  studentNo: string;
  name: string;
  stars: number;
  submitted: boolean;
};

type SearchResult = {
  id: string;
  studentNo: string;
  name: string;
};

export function GroupDiscussionAnswer({
  questionId,
  cardId,
  maxScore,
  existingAnswer,
  onScoreUpdate,
}: {
  questionId: string;
  cardId: string;
  maxScore: number;
  existingAnswer: ExistingAnswer;
  onScoreUpdate?: (questionId: string, score: number) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [loaded, setLoaded] = useState(false);

  // Load existing ratings on first render
  if (!loaded) {
    setLoaded(true);
    getGroupRatings(questionId).then((ratings) => {
      if (ratings.length > 0) {
        setMembers(
          ratings.map((r) => ({
            id: r.targetStudentId,
            studentNo: r.targetStudentNo,
            name: r.targetStudentName,
            stars: r.stars,
            submitted: true,
          }))
        );
      }
    });
  }

  function handleSearch(keyword: string) {
    setSearchText(keyword);
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    startSearch(async () => {
      const results = await searchCourseStudents(cardId, keyword);
      // Filter out already-added members
      const memberIds = new Set(members.map((m) => m.id));
      setSearchResults(results.filter((r) => !memberIds.has(r.id)));
    });
  }

  function handleAddMember(student: SearchResult) {
    setMembers((prev) => [
      ...prev,
      { ...student, stars: 0, submitted: false },
    ]);
    setSearchText("");
    setSearchResults([]);
  }

  function handleStarClick(memberId: string, stars: number) {
    const member = members.find((m) => m.id === memberId);
    if (!member || member.submitted) return;

    // Update stars in UI immediately
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, stars } : m))
    );

    // Submit rating
    startSubmit(async () => {
      const result = await submitGroupRating(questionId, memberId, stars);
      if (result.error) {
        toast.error(result.error);
        // Revert stars
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, stars: 0 } : m))
        );
        return;
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, stars, submitted: true } : m
        )
      );
      toast.success("评分已保存");
      if (result.score !== null && result.score !== undefined) {
        onScoreUpdate?.(questionId, result.score);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Search and add members */}
      <div className="relative">
        <Input
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="输入学号或姓名搜索组员"
          className="min-h-[44px]"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border bg-background shadow-lg max-h-[200px] overflow-y-auto">
            {searchResults.map((student) => (
              <button
                key={student.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors touch-manipulation"
                onClick={() => handleAddMember(student)}
              >
                <span className="font-medium">{student.name}</span>
                <span className="text-muted-foreground">
                  {student.studentNo}
                </span>
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            搜索中...
          </div>
        )}
      </div>

      {/* Member list with ratings */}
      {members.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            组员列表（{members.length} 人）
          </div>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">{member.name}</div>
                <div className="text-xs text-muted-foreground">
                  {member.studentNo}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={member.submitted || isSubmitting}
                    className="p-1 touch-manipulation disabled:cursor-not-allowed transition-transform active:scale-110"
                    onClick={() => handleStarClick(member.id, rating)}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        rating <= member.stars
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
                {member.submitted && (
                  <span className="ml-2 text-xs text-green-600">已评</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update answer-card.tsx**

Add import (after line 9):
```typescript
import { GroupDiscussionAnswer } from "./group-discussion-answer";
```

Add to `TYPE_LABELS` (line 35-40):
```typescript
const TYPE_LABELS: Record<string, string> = {
  self_assessment: "自我评测",
  multiple_choice: "选择题",
  fill_blank: "填空题",
  short_answer: "简答题",
  group_discussion: "分组讨论",
};
```

Add to `TYPE_VARIANTS` (line 42-47):
```typescript
const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  self_assessment: "secondary",
  multiple_choice: "default",
  fill_blank: "outline",
  short_answer: "outline",
  group_discussion: "secondary",
};
```

Add rendering branch (after the short_answer block, around line 117):
```tsx
{question.type === "group_discussion" && (
  <GroupDiscussionAnswer
    questionId={question.id}
    cardId={question.cardId}
    maxScore={question.score}
    existingAnswer={existingAnswer}
    onScoreUpdate={onScoreUpdate}
  />
)}
```

- [ ] **Step 3: Verify build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add components/student/group-discussion-answer.tsx components/student/answer-card.tsx
git commit -m "feat: add student-side group discussion answer component"
```

---

### Task 7: Add Group Discussion Analysis

**Files:**
- Create: `components/teacher/analysis/group-discussion-analysis.tsx`
- Modify: `lib/actions/analysis.ts`
- Modify: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/[cardId]/analysis/analysis-view.tsx:21-26,138-171`

- [ ] **Step 1: Add getGroupDiscussionAnalysis server action**

Add to `lib/actions/analysis.ts`, importing `groupRatings` and `students` from schema:

```typescript
// Add to imports at top:
import { ..., groupRatings, students } from "@/lib/db/schema";
```

Add function at end of file:
```typescript
export type GroupRatingDetail = {
  targetStudentId: string;
  targetStudentName: string;
  targetStudentNo: string;
  raterId: string;
  raterName: string;
  raterStudentNo: string;
  stars: number;
};

export async function getGroupDiscussionAnalysis(questionId: string) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") return null;

  // Verify ownership
  const [question] = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.id, questionId));
  if (!question) return null;

  const ownerCheck = await db
    .select({ teacherId: courses.teacherId })
    .from(learningCards)
    .innerJoin(classrooms, eq(learningCards.classroomId, classrooms.id))
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(
      and(eq(learningCards.id, question.cardId), eq(courses.teacherId, user.id))
    );
  if (ownerCheck.length === 0) return null;

  // Get all ratings with student names
  // We need to alias the students table for rater and target
  const ratings = await db
    .select({
      targetStudentId: groupRatings.targetStudentId,
      raterId: groupRatings.raterId,
      stars: groupRatings.stars,
    })
    .from(groupRatings)
    .where(eq(groupRatings.questionId, questionId));

  // Collect all student IDs
  const studentIds = new Set<string>();
  for (const r of ratings) {
    studentIds.add(r.targetStudentId);
    studentIds.add(r.raterId);
  }

  // Fetch student info
  const studentList =
    studentIds.size > 0
      ? await db
          .select({ id: students.id, name: students.name, studentNo: students.studentNo })
          .from(students)
          .where(inArray(students.id, Array.from(studentIds)))
      : [];
  const studentMap = new Map(studentList.map((s) => [s.id, s]));

  const details: GroupRatingDetail[] = ratings.map((r) => ({
    targetStudentId: r.targetStudentId,
    targetStudentName: studentMap.get(r.targetStudentId)?.name ?? "未知",
    targetStudentNo: studentMap.get(r.targetStudentId)?.studentNo ?? "",
    raterId: r.raterId,
    raterName: studentMap.get(r.raterId)?.name ?? "未知",
    raterStudentNo: studentMap.get(r.raterId)?.studentNo ?? "",
    stars: r.stars,
  }));

  return { question, details };
}
```

Also add `inArray` to the drizzle-orm imports at the top.

- [ ] **Step 2: Create group-discussion-analysis.tsx**

Create `components/teacher/analysis/group-discussion-analysis.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronUp } from "lucide-react";
import { getGroupDiscussionAnalysis, type GroupRatingDetail } from "@/lib/actions/analysis";

export function GroupDiscussionAnalysis({
  questionId,
  maxScore,
}: {
  questionId: string;
  maxScore: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<GroupRatingDetail[] | null>(null);
  const [isLoading, startLoading] = useTransition();

  const handleToggle = () => {
    if (!expanded) {
      startLoading(async () => {
        const result = await getGroupDiscussionAnalysis(questionId);
        if (result) {
          setData(result.details);
        }
      });
    }
    setExpanded(!expanded);
  };

  // Group ratings by target student
  const grouped = data
    ? (() => {
        const map = new Map<
          string,
          {
            name: string;
            studentNo: string;
            ratings: { raterName: string; stars: number }[];
          }
        >();
        for (const d of data) {
          if (!map.has(d.targetStudentId)) {
            map.set(d.targetStudentId, {
              name: d.targetStudentName,
              studentNo: d.targetStudentNo,
              ratings: [],
            });
          }
          map
            .get(d.targetStudentId)!
            .ratings.push({ raterName: d.raterName, stars: d.stars });
        }
        return Array.from(map.entries()).map(([id, info]) => {
          const avg =
            info.ratings.reduce((s, r) => s + r.stars, 0) /
            info.ratings.length;
          const score = Math.round(avg * (maxScore / 5));
          return { id, ...info, avg, score };
        });
      })()
    : [];

  const ranked = [...grouped].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
        className="w-full"
      >
        {expanded ? (
          <>
            <ChevronUp className="mr-1.5 h-4 w-4" />
            收起分析
          </>
        ) : isLoading ? (
          "加载中..."
        ) : (
          <>
            <BarChart3 className="mr-1.5 h-4 w-4" />
            分析
          </>
        )}
      </Button>

      {expanded && data !== null && (
        <div className="rounded-lg border bg-muted/10 p-4 space-y-6">
          {grouped.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              暂无学生互评数据
            </div>
          ) : (
            <>
              {/* Group details */}
              <div className="space-y-3">
                <div className="text-sm font-medium">分组详情</div>
                {grouped.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {student.name}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {student.studentNo}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="font-bold">{student.score}</span>
                        <span className="text-muted-foreground">
                          /{maxScore} 分
                        </span>
                        <span className="ml-2 text-yellow-500">
                          ★ {student.avg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {student.ratings.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {r.raterName}
                          <span className="text-yellow-500">
                            {"★".repeat(r.stars)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Class ranking */}
              <div className="space-y-2">
                <div className="text-sm font-medium">全班排名</div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">
                          排名
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          姓名
                        </th>
                        <th className="px-3 py-2 text-left font-medium">
                          学号
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          平均星级
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          得分
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((student, i) => (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">
                            {student.name}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {student.studentNo}
                          </td>
                          <td className="px-3 py-2 text-right text-yellow-500">
                            ★ {student.avg.toFixed(1)}
                          </td>
                          <td className="px-3 py-2 text-right font-bold">
                            {student.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update analysis-view.tsx for group_discussion**

Add import:
```typescript
import { GroupDiscussionAnalysis } from "@/components/teacher/analysis/group-discussion-analysis";
```

Add to `TYPE_LABELS`:
```typescript
group_discussion: "分组讨论",
```

In `renderAnalysis()`, add case before `default`:
```typescript
case "group_discussion":
  return null; // Handled separately below
```

In the `QuestionAnalysis` component JSX (around line 213-218), change the expanded block to handle group_discussion separately:
```tsx
{expanded && question.type === "group_discussion" ? (
  <GroupDiscussionAnalysis
    questionId={question.id}
    maxScore={question.score}
  />
) : expanded ? (
  <div className="rounded-lg border bg-muted/10 p-4">
    {renderAnalysis()}
  </div>
) : null}
```

Wait — `GroupDiscussionAnalysis` already has its own expand/collapse. For group discussion, we should render it inline and let its own button handle expand. Actually, looking more carefully, the `QuestionAnalysis` component already has an expand button and calls `renderAnalysis()`. For group_discussion, we should render the `GroupDiscussionAnalysis` component directly as the analysis content (it manages its own data fetching internally, which is different from other types that use the `data` state).

Better approach: just render `GroupDiscussionAnalysis` inside the existing expanded block. Since `GroupDiscussionAnalysis` already has its own data fetching, we don't need the parent's fresh data mechanism for it.

Actually, let me simplify. The `GroupDiscussionAnalysis` component should NOT have its own expand/collapse button. It should just be the content. The parent `QuestionAnalysis` already handles expand/collapse. Let me revise:

Simplify `GroupDiscussionAnalysis` to just render the analysis content (remove the button), and have `renderAnalysis()` return it:

In `renderAnalysis()`, add:
```typescript
case "group_discussion":
  return (
    <GroupDiscussionAnalysis
      questionId={question.id}
      maxScore={question.score}
    />
  );
```

And modify `GroupDiscussionAnalysis` to auto-load data on mount instead of having its own toggle (see revised component in Step 2).

Let me revise Step 2 — the `GroupDiscussionAnalysis` should auto-load and just render content:

**REVISED Step 2**: Create `components/teacher/analysis/group-discussion-analysis.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getGroupDiscussionAnalysis, type GroupRatingDetail } from "@/lib/actions/analysis";

export function GroupDiscussionAnalysis({
  questionId,
  maxScore,
}: {
  questionId: string;
  maxScore: number;
}) {
  const [data, setData] = useState<GroupRatingDetail[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroupDiscussionAnalysis(questionId).then((result) => {
      setData(result?.details ?? []);
      setLoading(false);
    });
  }, [questionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生互评数据
      </div>
    );
  }

  // Group ratings by target student
  const groupedMap = new Map<
    string,
    {
      name: string;
      studentNo: string;
      ratings: { raterName: string; stars: number }[];
    }
  >();
  for (const d of data) {
    if (!groupedMap.has(d.targetStudentId)) {
      groupedMap.set(d.targetStudentId, {
        name: d.targetStudentName,
        studentNo: d.targetStudentNo,
        ratings: [],
      });
    }
    groupedMap
      .get(d.targetStudentId)!
      .ratings.push({ raterName: d.raterName, stars: d.stars });
  }

  const grouped = Array.from(groupedMap.entries()).map(([id, info]) => {
    const avg =
      info.ratings.reduce((s, r) => s + r.stars, 0) / info.ratings.length;
    const score = Math.round(avg * (maxScore / 5));
    return { id, ...info, avg, score };
  });

  const ranked = [...grouped].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      {/* Group details */}
      <div className="space-y-3">
        <div className="text-sm font-medium">分组详情</div>
        {grouped.map((student) => (
          <div key={student.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{student.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {student.studentNo}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-bold">{student.score}</span>
                <span className="text-muted-foreground">/{maxScore} 分</span>
                <span className="ml-2 text-yellow-500">
                  ★ {student.avg.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {student.ratings.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {r.raterName}
                  <span className="text-yellow-500">{"★".repeat(r.stars)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Class ranking */}
      <div className="space-y-2">
        <div className="text-sm font-medium">全班排名</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">排名</th>
                <th className="px-3 py-2 text-left font-medium">姓名</th>
                <th className="px-3 py-2 text-left font-medium">学号</th>
                <th className="px-3 py-2 text-right font-medium">平均星级</th>
                <th className="px-3 py-2 text-right font-medium">得分</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((student, i) => (
                <tr key={student.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{student.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {student.studentNo}
                  </td>
                  <td className="px-3 py-2 text-right text-yellow-500">
                    ★ {student.avg.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    {student.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update analysis-view.tsx**

Add import at top:
```typescript
import { GroupDiscussionAnalysis } from "@/components/teacher/analysis/group-discussion-analysis";
```

Add `group_discussion: "分组讨论"` to `TYPE_LABELS`.

Add case in `renderAnalysis()`:
```typescript
case "group_discussion":
  return (
    <GroupDiscussionAnalysis
      questionId={question.id}
      maxScore={question.score}
    />
  );
```

- [ ] **Step 5: Verify build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add components/teacher/analysis/group-discussion-analysis.tsx lib/actions/analysis.ts app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/\[cardId\]/analysis/analysis-view.tsx
git commit -m "feat: add group discussion analysis with details and ranking views"
```

---

### Task 8: Final Integration and Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Full lint and build check**

Run: `npm run lint && npm run build`
Expected: Clean build, no new errors

- [ ] **Step 2: Verify the group branch has all changes**

Run: `git log --oneline` to confirm all commits are present.

- [ ] **Step 3: Push branch**

```bash
git push -u origin group
```
