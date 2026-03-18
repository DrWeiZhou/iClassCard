"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelfAssessmentAnswer } from "./self-assessment-answer";
import { MultipleChoiceAnswer } from "./multiple-choice-answer";
import { FillBlankAnswer } from "./fill-blank-answer";
import { ShortAnswerAnswer } from "./short-answer-answer";

type Question = {
  id: string;
  cardId: string;
  type: string;
  order: number;
  title: string;
  content: string | null;
  options: unknown;
  correctAnswer: string | null;
  score: number;
  gradingPrompt: string | null;
  feedbackPrompt: string | null;
};

type ExistingAnswer = {
  id: string;
  questionId: string;
  studentId: string;
  answer: unknown;
  score: number | null;
  aiFeedback: string | null;
  submittedAt: Date;
  deviceType: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  self_assessment: "自我评测",
  multiple_choice: "选择题",
  fill_blank: "填空题",
  short_answer: "简答题",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  self_assessment: "secondary",
  multiple_choice: "default",
  fill_blank: "outline",
  short_answer: "outline",
};

export function AnswerCard({
  question,
  existingAnswer,
}: {
  question: Question;
  existingAnswer: ExistingAnswer | null;
}) {
  const isAnswered = existingAnswer !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">
            第 {question.order} 题
          </CardTitle>
          <Badge variant={TYPE_VARIANTS[question.type] ?? "secondary"}>
            {TYPE_LABELS[question.type] ?? question.type}
          </Badge>
          {question.type !== "self_assessment" && question.score > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {question.score} 分
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm whitespace-pre-wrap">{question.title}</div>

        {question.type === "self_assessment" && (
          <SelfAssessmentAnswer
            questionId={question.id}
            existingAnswer={existingAnswer}
          />
        )}

        {question.type === "multiple_choice" && (
          <MultipleChoiceAnswer
            questionId={question.id}
            options={
              (question.options as { label: string; text: string }[]) ?? []
            }
            correctAnswer={question.correctAnswer}
            maxScore={question.score}
            existingAnswer={existingAnswer}
          />
        )}

        {question.type === "fill_blank" && (
          <FillBlankAnswer
            questionId={question.id}
            title={question.title}
            maxScore={question.score}
            existingAnswer={existingAnswer}
          />
        )}

        {question.type === "short_answer" && (
          <ShortAnswerAnswer
            questionId={question.id}
            maxScore={question.score}
            existingAnswer={existingAnswer}
          />
        )}

        {/* Score display for answered questions */}
        {isAnswered && existingAnswer.score !== null && (
          <div className="flex items-center gap-2 pt-2 border-t text-sm">
            <span className="text-muted-foreground">得分：</span>
            <span className="font-semibold">
              {existingAnswer.score}
              {question.type !== "self_assessment" && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  / {question.score}
                </span>
              )}
            </span>
          </div>
        )}

        {/* AI feedback display */}
        {isAnswered && existingAnswer.aiFeedback && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium text-muted-foreground mb-1">AI 反馈：</p>
            <div className="whitespace-pre-wrap break-words">
              {existingAnswer.aiFeedback}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
