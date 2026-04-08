# 复制学习卡功能设计

## 概述

在学习卡列表的每张卡片按钮区添加"复制"按钮，点击后弹窗选择目标课程和课堂，一键复制学习卡（含所有题目）到目标课堂，复制结果始终为草稿状态。

## 约束

- 复制目标仅限当前教师自己的课程和课堂
- 复制出的卡始终为 draft 状态
- 复制包含所有 cardQuestions 的核心字段
- 不复制：`matchedSectionId`、`matchedLessonPlanUrl`、`closedAt`（课件匹配与目标课堂无关）
- 不复制学生答题数据（studentAnswers）

## Server Action

文件：`lib/actions/cards.ts`

新增 `copyCard(cardId: string, targetClassroomId: string)`：

1. 验证教师对源卡的所有权（`verifyCardOwnership(cardId)`）
2. 验证教师对目标课堂的所有权（`verifyCardAccess(targetClassroomId)`）
3. 查询源卡的所有 cardQuestions
4. 在数据库中：
   - 插入新 learningCard：`name` = 源卡名 + "(副本)"，`status` = "draft"，`totalScore` = 源卡 totalScore
   - 批量插入 cardQuestions：复制 `type, order, title, content, options, correctAnswer, score, gradingPrompt, feedbackPrompt`
5. `revalidatePath` 目标课堂的 cards 页面
6. 返回 `{ success: true }` 或 `{ error: string }`

## UI 组件

文件：`app/teacher/courses/[courseId]/classrooms/[classroomId]/cards/card-list.tsx`

### 复制按钮

在 `CardItem` 的按钮区（与编辑、发放、删除、分析、统计并列）添加"复制"按钮，使用 `Copy` 图标（lucide-react）。

### CopyCardDialog

弹窗组件，包含：

1. **课程下拉**：调用 `getCourses()` 获取当前教师所有课程，渲染为 Select
2. **课堂下拉**：选择课程后调用 `getClassrooms(courseId)` 获取课堂列表，渲染为 Select。课堂显示格式：`日期 时间 - 名称`
3. **确认按钮**：调用 `copyCard(cardId, targetClassroomId)`
4. 成功后 toast "学习卡已复制" 并关闭弹窗

### 数据流

```
点击复制 → 打开 Dialog → 选课程 → 加载课堂列表 → 选课堂 → 确认复制
  → copyCard(cardId, targetClassroomId)
  → insert learningCard + insert cardQuestions
  → revalidatePath + toast 成功
```

## 涉及文件

| 文件 | 变更 |
|------|------|
| `lib/actions/cards.ts` | 新增 `copyCard` server action |
| `app/teacher/.../cards/card-list.tsx` | 添加复制按钮 + CopyCardDialog 组件 |
