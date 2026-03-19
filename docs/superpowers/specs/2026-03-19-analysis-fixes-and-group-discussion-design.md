# Analysis Fixes & Group Discussion Feature Design

Date: 2026-03-19

## Overview

Three changes to iClassCard:
1. Fix analysis page to show full question content (options, answers) by default
2. Change self-assessment analysis to use danmaku for comments
3. New "group discussion" question type where students rate each other

---

## Part 1: Analysis Page — Show Full Question Content

### Problem
The analysis page only shows question title text. Options (for multiple-choice), correct answers (for fill-blank/short-answer), and content details are hidden until the "分析" button is clicked.

### Solution
In `analysis-view.tsx`, render full question content in each card by default:
- **Multiple-choice**: Show all options (A/B/C/D with text)
- **Fill-blank**: Show correct answers
- **Short-answer**: Show reference answer
- **Self-assessment**: Show learning content name

The analysis visualizations (charts, danmaku, etc.) remain toggled by the "分析" button.

---

## Part 2: Self-Assessment Analysis — Danmaku for Comments

### Problem
Self-assessment comments display as a static scrollable list. Should use danmaku like short-answer questions.

### Solution
The existing `ShortAnswerDanmaku` component accepts `{ correctAnswer, answers: AnalysisAnswer[] }` and extracts text by reading `ans.answer` as a string. Self-assessment answers are `{ stars, comment }` objects, so the component cannot be used directly.

**Approach**: Extract comment strings from self-assessment answers, wrap them as `AnalysisAnswer[]` objects (setting `answer` to the comment string), and pass to `ShortAnswerDanmaku` with `correctAnswer: null`. This avoids modifying the existing component.

In the self-assessment analysis section of `analysis-view.tsx`:
- Keep the star distribution chart (average + bar chart)
- Extract comments: `answers.filter(a => a.answer?.comment).map(a => ({ ...a, answer: a.answer.comment }))`
- Pass adapted array to `ShortAnswerDanmaku` with `correctAnswer: null`

---

## Part 3: Group Discussion Question Type

### 3.1 New Database Table

**`group_ratings`**:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Primary key |
| questionId | uuid FK → card_questions | The group discussion question |
| raterId | uuid FK → students | Student giving the rating |
| targetStudentId | uuid FK → students | Student receiving the rating |
| stars | integer NOT NULL | Star rating (1-5) |
| createdAt | timestamp | When rating was submitted |

Unique constraint: `(questionId, raterId, targetStudentId)` — one rating per pair per question.

Duplicate submissions: If a student taps a star twice, the server action returns the existing rating silently (upsert behavior) instead of erroring.

### 3.2 Question Type Addition

`cardQuestions.type` gains value `"group_discussion"`.

Fields used:
- `title`: The discussion topic text
- `score`: Max score (default 10)

Fields unused (null): `content`, `options`, `correctAnswer`, `gradingPrompt`, `feedbackPrompt`.

### 3.3 Scoring Logic

Each student's score = `Math.round(averageStars × maxScore / 5)`.

Example: maxScore = 10, student receives ratings of 4, 5, 3 stars → average = 4.0 → score = Math.round(4.0 × 10 / 5) = 8.

Edge case: Student who participates (rates others) but receives zero ratings → `studentAnswers.score = null`.

Score is stored in `studentAnswers.score` and recalculated each time a new rating is submitted for that student.

### 3.4 studentAnswers Usage

Each student who participates gets a `studentAnswers` record:
- `answer`: `{}` — empty object (group membership is derived from `group_ratings` table)
- `score`: Their computed score, or `null` if no ratings received
- `deviceType`: Captured from the first rating submission

### 3.5 Teacher Side — Editor

**`add-question-button.tsx`**: Add `"group_discussion"` to `QuestionType` union. Label: "分组讨论".

**New component `question-group-discussion.tsx`**:
- Title input (discussion topic)
- Score input (default 10)
- No options, correct answer, or AI prompt fields

**`card-editor/index.tsx`**:
- Add `case "group_discussion"` in `createDefaultQuestion` with `{ score: 10 }`
- Add rendering branch in `SortableQuestionItem` for group discussion
- Add `"group_discussion"` to `TYPE_LABELS` ("分组讨论") and `TYPE_BADGE_VARIANTS` ("secondary")

### 3.6 Teacher Side — Analysis

**New component `GroupDiscussionAnalysis`** in `components/teacher/analysis/`:

Data fetching: A dedicated server action `getGroupDiscussionAnalysis(questionId)` in `lib/actions/analysis.ts` fetches all `group_ratings` rows joined with student names, plus `studentAnswers` for computed scores.

Two views:
1. **Group details**: For each student who received ratings, show: student name, student number, list of raters with their star ratings, and the computed average score.
2. **Class ranking**: All participating students sorted by score descending, showing name, student number, average stars, and final score.

### 3.7 Student Side — Answer Component

**New component `GroupDiscussionAnswer`** in `components/student/`:

Props: `questionId`, `cardId` (for course-scoped search), `maxScore`, `existingAnswer`, `onScoreUpdate`.

UI flow:
1. Display discussion topic text (from question title)
2. **Search & add members**: Input field to search by student number or name (same course only, excludes self and already-added students). Dropdown shows matching results.
3. **Member list with ratings**: Each added member shows name + student number + 5-star rating. Clicking a star auto-saves the rating (like self-assessment auto-submit). Rating is locked after submission.
4. On re-entry, previously submitted ratings are restored from `group_ratings`.

### 3.8 Server Actions (in `lib/actions/group-ratings.ts`)

**`searchCourseStudents(cardId, keyword)`**:
- Authenticate via `getAuthUser()`, validate student role
- Find the course via card → classroom → course
- Search `courseStudents` + `students` where studentNo or name matches keyword (case-insensitive LIKE)
- Exclude the current student
- Return `{ id, studentNo, name }[]`

**`submitGroupRating(questionId, targetStudentId, stars)`**:
1. Authenticate via `getAuthUser()`, validate student role
2. Validate question exists and is `group_discussion` type
3. Validate `raterId !== targetStudentId` (prevent self-rating)
4. Validate target student is enrolled in the same course (via card → classroom → course → courseStudents)
5. Upsert into `group_ratings` (if duplicate, return existing rating silently)
6. Ensure both rater and target have `studentAnswers` records (upsert with `answer: {}`, `deviceType` from `getDeviceType()`)
7. Recalculate target student's score: `Math.round(AVG(stars) × question.score / 5)`, update `studentAnswers.score`
8. Return `{ success, score }` (the target student's new score)

**`getGroupRatings(questionId)`**:
- Authenticate via `getAuthUser()`, validate student role
- Query `group_ratings` joined with `students` where `raterId = currentStudent`
- Return `{ targetStudentId, targetStudentName, targetStudentNo, stars }[]`

### 3.9 Student Card Page Integration

**`answer-card.tsx`**:
- Add `"group_discussion"` to `TYPE_LABELS` ("分组讨论") and `TYPE_VARIANTS` ("secondary")
- Add rendering branch for `group_discussion` type, passing `questionId`, `cardId` (from `question.cardId`), `maxScore`, `existingAnswer`, and `onScoreUpdate`

**`student-card-content.tsx`**: No changes needed — score updates flow through existing `onScoreUpdate` mechanism.

---

## Files to Create

| File | Purpose |
|---|---|
| `components/teacher/card-editor/question-group-discussion.tsx` | Editor for group discussion question |
| `components/teacher/analysis/group-discussion-analysis.tsx` | Analysis view for group discussion |
| `components/student/group-discussion-answer.tsx` | Student answer component |
| `lib/actions/group-ratings.ts` | Server actions for group ratings |

## Files to Modify

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `groupRatings` table definition |
| `components/teacher/card-editor/add-question-button.tsx` | Add `group_discussion` to `QuestionType` union |
| `components/teacher/card-editor/index.tsx` | Add `createDefaultQuestion` case, rendering branch, TYPE_LABELS/BADGE_VARIANTS |
| `app/teacher/.../analysis/analysis-view.tsx` | Show full question content by default; self-assessment danmaku; group discussion branch; add TYPE_LABELS entry |
| `lib/actions/analysis.ts` | Add `getGroupDiscussionAnalysis(questionId)` server action |
| `components/student/answer-card.tsx` | Add group discussion rendering branch, TYPE_LABELS/TYPE_VARIANTS entries |
| `lib/actions/student-data.ts` | Include group ratings data in student card fetch |
