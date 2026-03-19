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
In the self-assessment analysis section of `analysis-view.tsx`:
- Keep the star distribution chart (average + bar chart)
- Replace the static comment list with `ShortAnswerDanmaku` component
- Extract comment strings from self-assessment answers (`answer.comment`) and pass as the text array

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

### 3.2 Question Type Addition

`cardQuestions.type` gains value `"group_discussion"`.

Fields used:
- `title`: The discussion topic text
- `score`: Max score (default 10)

Fields unused (null): `content`, `options`, `correctAnswer`, `gradingPrompt`, `feedbackPrompt`.

### 3.3 Scoring Logic

Each student's score = average stars received from all raters × (maxScore / 5), rounded.

Example: maxScore = 10, student receives ratings of 4, 5, 3 stars → average = 4.0 → score = 4.0 × 10/5 = 8.

Score is stored in `studentAnswers.score` and recalculated each time a new rating is submitted for that student.

### 3.4 studentAnswers Usage

Each student who participates gets a `studentAnswers` record:
- `answer`: `{ memberIds: string[] }` — IDs of students they rated
- `score`: Their computed score (average of ratings received × maxScore/5)

### 3.5 Teacher Side — Editor

**`add-question-button.tsx`**: Add `"group_discussion"` to `QuestionType` union. Label: "分组讨论".

**New component `question-group-discussion.tsx`**:
- Title input (discussion topic)
- Score input (default 10)
- No options, correct answer, or AI prompt fields

**`card-editor/index.tsx`**: Add rendering branch for `group_discussion`, set default score to 10.

### 3.6 Teacher Side — Analysis

**New component `GroupDiscussionAnalysis`** in `components/teacher/analysis/`:

Two views:
1. **Group details**: For each student who received ratings, show: student name, student number, list of raters with their star ratings, and the computed average score.
2. **Class ranking**: All participating students sorted by score descending, showing name, student number, average stars, and final score.

### 3.7 Student Side — Answer Component

**New component `GroupDiscussionAnswer`** in `components/student/`:

UI flow:
1. Display discussion topic text (from question title)
2. **Search & add members**: Input field to search by student number or name (same course only, excludes self and already-added students). Dropdown shows matching results.
3. **Member list with ratings**: Each added member shows name + student number + 5-star rating. Clicking a star auto-saves the rating (like self-assessment auto-submit). Rating is locked after submission.
4. On re-entry, previously submitted ratings are restored from `group_ratings`.

### 3.8 Server Actions

**`searchCourseStudents(cardId, keyword)`**:
- Find the course via card → classroom → course
- Search `courseStudents` + `students` where studentNo or name matches keyword
- Exclude the current student
- Return `{ id, studentNo, name }[]`

**`submitGroupRating(questionId, targetStudentId, stars)`**:
1. Validate: current user is student, question exists and is `group_discussion` type
2. Insert into `group_ratings` (or error if duplicate)
3. Ensure both rater and target have `studentAnswers` records
4. Recalculate target student's score: `AVG(stars) × question.score / 5`, update `studentAnswers.score`
5. Return `{ success, newScore }`

**`getGroupRatings(questionId)`**:
- Return all ratings submitted by the current student for this question
- Used to restore UI state on page re-entry

### 3.9 Student Card Page Integration

**`answer-card.tsx`**: Add rendering branch for `group_discussion` type, passing `onScoreUpdate` callback.

**`student-card-content.tsx`**: No changes needed — score updates flow through existing `onScoreUpdate` mechanism.

---

## Files to Create

| File | Purpose |
|---|---|
| `components/teacher/card-editor/question-group-discussion.tsx` | Editor for group discussion question |
| `components/teacher/analysis/group-discussion-analysis.tsx` | Analysis view for group discussion |
| `components/student/group-discussion-answer.tsx` | Student answer component |
| `lib/actions/group-ratings.ts` | Server actions for group ratings |
| `lib/db/migrations/XXXX_add_group_ratings.sql` | Migration for new table |

## Files to Modify

| File | Change |
|---|---|
| `lib/db/schema.ts` | Add `groupRatings` table definition |
| `components/teacher/card-editor/add-question-button.tsx` | Add `group_discussion` type |
| `components/teacher/card-editor/index.tsx` | Add group discussion rendering branch + default question |
| `app/teacher/.../analysis/analysis-view.tsx` | Show full question content; self-assessment danmaku; group discussion analysis |
| `components/student/answer-card.tsx` | Add group discussion rendering branch |
| `lib/actions/student-data.ts` | Include group ratings in student data fetch |
