# 复制学习卡 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow teachers to copy a learning card (with all questions) to any of their own course classrooms via a dialog.

**Architecture:** Add a `copyCard` server action in `lib/actions/cards.ts` that duplicates a learningCard + its cardQuestions to a target classroom. Add a "复制" button + `CopyCardDialog` component in `card-list.tsx` with cascading course → classroom selects.

**Tech Stack:** Next.js Server Actions, Drizzle ORM, Shadcn UI (Dialog, Select), lucide-react (Copy icon)

---

### Task 1: Add `copyCard` server action

**Files:**
- Modify: `lib/actions/cards.ts`

- [ ] **Step 1: Add the `copyCard` server action**

Add at the bottom of `lib/actions/cards.ts`:

```typescript
// Copy a card (with all questions) to a target classroom
export async function copyCard(cardId: string, targetClassroomId: string) {
  // 1. Verify ownership of source card
  const ownership = await verifyCardOwnership(cardId);
  if (!ownership) return { error: "未授权" };

  // 2. Verify access to target classroom
  const targetAccess = await verifyCardAccess(targetClassroomId);
  if (!targetAccess) return { error: "目标课堂未授权" };

  const { card } = ownership;

  // 3. Query source questions
  const sourceQuestions = await db
    .select()
    .from(cardQuestions)
    .where(eq(cardQuestions.cardId, cardId))
    .orderBy(asc(cardQuestions.order));

  // 4. Insert new card
  const [newCard] = await db
    .insert(learningCards)
    .values({
      classroomId: targetClassroomId,
      name: card.name + "(副本)",
      status: "draft",
      totalScore: card.totalScore,
    })
    .returning({ id: learningCards.id });

  // 5. Batch insert questions
  if (sourceQuestions.length > 0) {
    await db.insert(cardQuestions).values(
      sourceQuestions.map((q) => ({
        cardId: newCard.id,
        type: q.type,
        order: q.order,
        title: q.title,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        score: q.score,
        gradingPrompt: q.gradingPrompt,
        feedbackPrompt: q.feedbackPrompt,
      }))
    );
  }

  // 6. Revalidate target classroom cards page
  revalidatePath(
    `/teacher/courses/${targetAccess.courseId}/classrooms/${targetClassroomId}/cards`
  );
  return { success: true };
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/cards.ts
git commit -m "feat: add copyCard server action for duplicating learning cards"
```

---

### Task 2: Add copy button and CopyCardDialog to card list

**Files:**
- Modify: `app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/card-list.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports in `card-list.tsx`:

- Add `Copy` to the lucide-react import
- Add `useEffect` to the react import
- Add `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`
- Add `getCourses` from `@/lib/actions/courses`
- Add `getClassrooms` from `@/lib/actions/classrooms`
- Add `copyCard` from `@/lib/actions/cards`

- [ ] **Step 2: Add "复制" button to CardItem**

In `CardItem`, add a copy button in the `flex flex-wrap gap-2` div, after the "统计" button:

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setCopyOpen(true)}
  disabled={isPending}
>
  <Copy className="mr-1.5 h-4 w-4" />
  复制
</Button>
```

Add state: `const [copyOpen, setCopyOpen] = useState(false);`

Add the dialog at the end of the CardItem return, right before `</Card>`:

```tsx
<CopyCardDialog
  cardId={card.id}
  cardName={card.name}
  open={copyOpen}
  onOpenChange={setCopyOpen}
/>
```

- [ ] **Step 3: Create CopyCardDialog component**

Add the `CopyCardDialog` function component at the bottom of `card-list.tsx`:

```tsx
function CopyCardDialog({
  cardId,
  cardName,
  open,
  onOpenChange,
}: {
  cardId: string;
  cardName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [classroomList, setClassroomList] = useState<Array<{ id: string; date: string; time: string; name: string | null }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  // Load courses when dialog opens
  useEffect(() => {
    if (open) {
      getCourses().then((data) => {
        setCourses(data.map((c) => ({ id: c.id, name: c.name })));
      });
      setSelectedCourseId("");
      setSelectedClassroomId("");
      setClassroomList([]);
    }
  }, [open]);

  // Load classrooms when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setClassroomList([]);
      setSelectedClassroomId("");
      return;
    }
    setLoading(true);
    setSelectedClassroomId("");
    getClassrooms(selectedCourseId).then((data) => {
      setClassroomList(data);
      setLoading(false);
    });
  }, [selectedCourseId]);

  function handleCopy() {
    if (!selectedClassroomId) return;
    startTransition(async () => {
      const result = await copyCard(cardId, selectedClassroomId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("学习卡已复制");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>复制学习卡</DialogTitle>
          <DialogDescription>
            将「{cardName}」复制到其他课堂（复制为草稿状态）
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>选择课程</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择课程" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>选择课堂</Label>
            <Select
              value={selectedClassroomId}
              onValueChange={setSelectedClassroomId}
              disabled={!selectedCourseId || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "加载中..." : "请选择课堂"} />
              </SelectTrigger>
              <SelectContent>
                {classroomList.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>
                    {cr.date} {cr.time}{cr.name ? ` - ${cr.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            取消
          </DialogClose>
          <Button
            onClick={handleCopy}
            disabled={!selectedClassroomId || isPending}
          >
            {isPending ? "复制中..." : "确认复制"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Verify the build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Manual test**

1. Open a classroom's card list page
2. Click "复制" on any card
3. Select a course → classrooms cascade loads
4. Select a classroom → click "确认复制"
5. Navigate to target classroom → verify the copied card exists as draft with all questions

- [ ] **Step 6: Commit**

```bash
git add app/teacher/courses/\[courseId\]/classrooms/\[classroomId\]/cards/card-list.tsx
git commit -m "feat: add copy button and dialog for learning cards"
```
