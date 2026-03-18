"use client";

import { useState, useTransition } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  text: string;
};

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
  aiFeedback?: string | null;
} | null;

export function MultipleChoiceAnswer({
  questionId,
  options,
  correctAnswer,
  maxScore,
  existingAnswer,
}: {
  questionId: string;
  options: Option[];
  correctAnswer: string | null;
  maxScore: number;
  existingAnswer: ExistingAnswer;
}) {
  const existingSelected = existingAnswer
    ? (existingAnswer.answer as string[])
    : [];
  const correctLabels: string[] = (() => {
    try {
      const parsed = JSON.parse(correctAnswer || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const [selected, setSelected] = useState<string[]>(existingSelected);
  const [submitted, setSubmitted] = useState(!!existingAnswer);
  const [score, setScore] = useState<number | null>(
    existingAnswer?.score ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [answerId, setAnswerId] = useState<string | null>(
    existingAnswer?.id ?? null
  );

  const {
    completion,
    complete,
    isLoading: isFeedbackLoading,
  } = useCompletion({
    api: "/api/ai/feedback",
    streamProtocol: "text",
    body: { questionId, answerId },
  });

  // Use existing feedback if available, otherwise use streamed completion
  const feedbackText = existingAnswer?.aiFeedback || completion;

  function toggleOption(label: string) {
    if (submitted || isPending) return;
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  }

  function handleSubmit() {
    if (submitted || selected.length === 0 || isPending) return;

    startTransition(async () => {
      const result = await submitAnswer(questionId, selected, getDeviceType());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      setScore(result.score ?? null);
      setAnswerId(result.answerId!);
      toast.success("已提交");

      // Trigger AI feedback streaming (scoring is already done server-side)
      try {
        await complete("", {
          body: { questionId, answerId: result.answerId },
        });
      } catch {
        // Feedback failed silently
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.label);
          const isCorrect = correctLabels.includes(option.label);
          const showResult = submitted;

          return (
            <button
              key={option.label}
              type="button"
              disabled={submitted || isPending}
              onClick={() => toggleOption(option.label)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors touch-manipulation",
                "min-h-[44px]",
                !submitted && isSelected && "border-primary bg-primary/5",
                !submitted && !isSelected && "border-border hover:bg-muted/50",
                submitted && isSelected && isCorrect && "border-green-500 bg-green-50 dark:bg-green-950/30",
                submitted && isSelected && !isCorrect && "border-red-500 bg-red-50 dark:bg-red-950/30",
                submitted && !isSelected && isCorrect && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
                submitted && !isSelected && !isCorrect && "border-border opacity-60",
                "disabled:cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-medium",
                  !submitted && isSelected && "border-primary bg-primary text-primary-foreground",
                  !submitted && !isSelected && "border-muted-foreground/30",
                  submitted && isCorrect && "border-green-500 bg-green-500 text-white",
                  submitted && isSelected && !isCorrect && "border-red-500 bg-red-500 text-white"
                )}
              >
                {submitted && isSelected && isCorrect && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {submitted && isSelected && !isCorrect && (
                  <X className="h-3.5 w-3.5" />
                )}
                {submitted && !isSelected && isCorrect && (
                  <Check className="h-3.5 w-3.5" />
                )}
                {!submitted && option.label}
                {submitted && !isCorrect && !isSelected && option.label}
              </span>
              <span className="flex-1 text-sm pt-0.5">{option.text}</span>
              {showResult && isCorrect && (
                <span className="text-xs text-green-600 dark:text-green-400 shrink-0 pt-0.5">
                  正确答案
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selected.length === 0 || isPending}
          className="w-full min-h-[44px]"
        >
          {isPending ? "提交中..." : "提交答案"}
        </Button>
      )}

      {submitted && score !== null && (
        <p className="text-sm text-muted-foreground">
          {score === maxScore ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              回答正确
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400 font-medium">
              回答错误
            </span>
          )}
        </p>
      )}

      {/* AI Feedback streaming */}
      {submitted && (isFeedbackLoading || feedbackText) && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium text-muted-foreground mb-1">
            {isFeedbackLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI 反馈生成中...
              </span>
            ) : (
              "AI 反馈："
            )}
          </p>
          {feedbackText && (
            <div className="whitespace-pre-wrap break-words overflow-y-auto max-h-[300px]">
              {feedbackText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
