"use client";

import { useState, useTransition } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
  aiFeedback?: string | null;
} | null;

function countBlanks(title: string): number {
  const matches = title.match(/___/g);
  return matches ? matches.length : 1;
}

export function FillBlankAnswer({
  questionId,
  title,
  maxScore,
  existingAnswer,
  onScoreUpdate,
}: {
  questionId: string;
  title: string;
  maxScore: number;
  existingAnswer: ExistingAnswer;
  onScoreUpdate?: (questionId: string, score: number) => void;
}) {
  const blankCount = countBlanks(title);
  const existingValues = existingAnswer
    ? (existingAnswer.answer as string[])
    : [];

  const [answers, setAnswers] = useState<string[]>(
    existingValues.length > 0
      ? existingValues
      : Array(blankCount).fill("")
  );
  const [submitted, setSubmitted] = useState(!!existingAnswer);
  const [score, setScore] = useState<number | null>(
    existingAnswer?.score ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [isScoring, setIsScoring] = useState(false);
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

  function handleChange(index: number, value: string) {
    if (submitted) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function handleSubmit() {
    if (submitted || isPending) return;

    // Check at least one blank is filled
    if (answers.every((a) => !a.trim())) {
      toast.error("请至少填写一个空");
      return;
    }

    startTransition(async () => {
      const result = await submitAnswer(questionId, answers, getDeviceType());
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      setAnswerId(result.answerId!);
      toast.success("已提交");

      // Trigger AI scoring
      setIsScoring(true);
      try {
        const scoreRes = await fetch("/api/ai/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            answerId: result.answerId,
          }),
        });

        if (scoreRes.ok) {
          const scoreData = await scoreRes.json();
          setScore(scoreData.score);
          if (scoreData.score !== null && scoreData.score !== undefined) {
            onScoreUpdate?.(questionId, scoreData.score);
          }
        }
      } catch {
        // Score failed silently - student can still see submission
      } finally {
        setIsScoring(false);
      }

      // Trigger AI feedback streaming
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
        {answers.map((answer, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0 w-16">
              空 {index + 1}：
            </span>
            <Input
              value={answer}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={`填写第 ${index + 1} 个空`}
              disabled={submitted || isPending}
              className="min-h-[44px]"
            />
          </div>
        ))}
      </div>

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={answers.every((a) => !a.trim()) || isPending}
          className="w-full min-h-[44px]"
        >
          {isPending ? "提交中..." : "提交答案"}
        </Button>
      )}

      {submitted && isScoring && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI评分中...</span>
        </div>
      )}

      {submitted && !isScoring && score !== null && (
        <p className="text-sm">
          <span className="text-muted-foreground">AI评分：</span>
          <span className="font-semibold">{score}</span>
          <span className="text-muted-foreground"> / {maxScore}</span>
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
