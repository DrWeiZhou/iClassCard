"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { GripVertical, Trash2, ChevronDown, ChevronRight, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { saveQuestions } from "@/lib/actions/cards";
import { QuestionSelfAssessment } from "./question-self-assessment";
import { QuestionMultipleChoice } from "./question-multiple-choice";
import { QuestionFillBlank } from "./question-fill-blank";
import { QuestionShortAnswer } from "./question-short-answer";
import { AddQuestionButton, type QuestionType } from "./add-question-button";

// State shape for a question in the editor
export type QuestionState = {
  clientId: string;
  type: QuestionType;
  title: string;
  content?: string;
  options?: Array<{ label: string; text: string }>;
  correctAnswer?: string;
  score: number;
  gradingPrompt?: string;
  feedbackPrompt?: string;
};

type CardData = {
  id: string;
  classroomId: string;
  name: string;
  status: string;
  totalScore: number;
  questions: Array<{
    id: string;
    type: string;
    order: number;
    title: string;
    content: string | null;
    options: unknown;
    correctAnswer: string | null;
    score: number;
    gradingPrompt: string | null;
    feedbackPrompt: string | null;
  }>;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  self_assessment: "自我评测",
  multiple_choice: "多选题",
  fill_blank: "填空题",
  short_answer: "简述题",
};

const TYPE_BADGE_VARIANTS: Record<QuestionType, "default" | "secondary" | "outline"> = {
  self_assessment: "secondary",
  multiple_choice: "default",
  fill_blank: "outline",
  short_answer: "outline",
};

let clientIdCounter = 0;
function generateClientId() {
  return `q_${Date.now()}_${++clientIdCounter}`;
}

function createDefaultQuestion(type: QuestionType, defaultTemplates?: Record<string, Record<string, string>>): QuestionState {
  const base = {
    clientId: generateClientId(),
    type,
    title: "",
    score: 0,
  };

  switch (type) {
    case "self_assessment":
      return { ...base, score: 10 };
    case "multiple_choice":
      return {
        ...base,
        options: [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ],
        correctAnswer: "[]",
        score: 10,
        feedbackPrompt: defaultTemplates?.multiple_choice?.feedback ?? "",
      };
    case "fill_blank":
      return { ...base, correctAnswer: "[]", score: 10, gradingPrompt: defaultTemplates?.fill_blank?.scoring ?? "", feedbackPrompt: defaultTemplates?.fill_blank?.feedback ?? "" };
    case "short_answer":
      return { ...base, correctAnswer: "", score: 10, gradingPrompt: defaultTemplates?.short_answer?.scoring ?? "", feedbackPrompt: defaultTemplates?.short_answer?.feedback ?? "" };
  }
}

function cardDataToQuestions(card: CardData): QuestionState[] {
  return card.questions.map((q) => ({
    clientId: generateClientId(),
    type: q.type as QuestionType,
    title: q.title,
    content: q.content || undefined,
    options: (q.options as Array<{ label: string; text: string }>) || undefined,
    correctAnswer: q.correctAnswer || undefined,
    score: q.score,
    gradingPrompt: q.gradingPrompt || undefined,
    feedbackPrompt: q.feedbackPrompt || undefined,
  }));
}

// Sortable question wrapper
function SortableQuestionItem({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: QuestionState;
  index: number;
  onUpdate: (clientId: string, data: Partial<QuestionState>) => void;
  onDelete: (clientId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.clientId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleChange = useCallback(
    (data: Partial<QuestionState>) => {
      onUpdate(question.clientId, data);
    },
    [onUpdate, question.clientId]
  );

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <CardTitle className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {index + 1}.
              </span>
              <Badge variant={TYPE_BADGE_VARIANTS[question.type]}>
                {TYPE_LABELS[question.type]}
              </Badge>
              <span className="text-sm truncate max-w-[200px]">
                {question.title || "未命名题目"}
              </span>
            </CardTitle>
          </div>
          <CardAction>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">
                {question.score} 分
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(question.clientId)}
                title="删除题目"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        {!collapsed && (
          <CardContent>
            {question.type === "self_assessment" && (
              <QuestionSelfAssessment
                title={question.title}
                score={question.score}
                onChange={handleChange}
              />
            )}
            {question.type === "multiple_choice" && (
              <QuestionMultipleChoice
                title={question.title}
                score={question.score}
                options={
                  question.options || [
                    { label: "A", text: "" },
                    { label: "B", text: "" },
                  ]
                }
                correctAnswer={question.correctAnswer || "[]"}
                feedbackPrompt={question.feedbackPrompt || ""}
                onChange={handleChange}
              />
            )}
            {question.type === "fill_blank" && (
              <QuestionFillBlank
                title={question.title}
                score={question.score}
                correctAnswer={question.correctAnswer || "[]"}
                feedbackPrompt={question.feedbackPrompt || ""}
                onChange={handleChange}
              />
            )}
            {question.type === "short_answer" && (
              <QuestionShortAnswer
                title={question.title}
                score={question.score}
                correctAnswer={question.correctAnswer || ""}
                feedbackPrompt={question.feedbackPrompt || ""}
                onChange={handleChange}
              />
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export function CardEditor({
  card,
  courseId,
  classroomId,
  defaultTemplates,
}: {
  card: CardData;
  courseId: string;
  classroomId: string;
  defaultTemplates?: Record<string, Record<string, string>>;
}) {
  const router = useRouter();
  const [cardName, setCardName] = useState(card.name);
  const [questions, setQuestions] = useState<QuestionState[]>(() =>
    cardDataToQuestions(card)
  );
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalScore = useMemo(
    () => questions.reduce((sum, q) => sum + q.score, 0),
    [questions]
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((q) => q.clientId === active.id);
        const newIndex = items.findIndex((q) => q.clientId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleUpdateQuestion = useCallback(
    (clientId: string, data: Partial<QuestionState>) => {
      setQuestions((items) =>
        items.map((q) =>
          q.clientId === clientId ? { ...q, ...data } : q
        )
      );
    },
    []
  );

  const handleDeleteQuestion = useCallback((clientId: string) => {
    setQuestions((items) => items.filter((q) => q.clientId !== clientId));
  }, []);

  const handleAddQuestion = useCallback((type: QuestionType) => {
    setQuestions((items) => [...items, createDefaultQuestion(type, defaultTemplates)]);
  }, [defaultTemplates]);

  function handleSave() {
    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        toast.error(`第 ${i + 1} 题的题干不能为空`);
        return;
      }
    }

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
      }
    });
  }

  function handleBack() {
    router.push(
      `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium">编辑学习卡</h2>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-1 h-4 w-4" />
          {isPending ? "保存中..." : "保存"}
        </Button>
      </div>

      {/* Card name */}
      <div className="space-y-2">
        <Label htmlFor="card-name">学习卡名称</Label>
        <Input
          id="card-name"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          placeholder="请输入学习卡名称"
        />
      </div>

      {/* Sortable questions list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.clientId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {questions.map((question, index) => (
              <SortableQuestionItem
                key={question.clientId}
                question={question}
                index={index}
                onUpdate={handleUpdateQuestion}
                onDelete={handleDeleteQuestion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add question button */}
      <AddQuestionButton onAdd={handleAddQuestion} />

      {/* Total score display */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <span className="text-sm font-medium">总分</span>
        <span className="text-lg font-bold">
          {totalScore} 分
        </span>
      </div>
    </div>
  );
}
