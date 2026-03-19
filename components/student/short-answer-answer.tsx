"use client";

import { useState, useTransition } from "react";
import { useCompletion } from "@ai-sdk/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
  aiFeedback?: string | null;
} | null;

export function ShortAnswerAnswer({
  questionId,
  maxScore,
  existingAnswer,
  onScoreUpdate,
}: {
  questionId: string;
  maxScore: number;
  existingAnswer: ExistingAnswer;
  onScoreUpdate?: (questionId: string, score: number) => void;
}) {
  const existingText = existingAnswer
    ? (existingAnswer.answer as string)
    : "";

  const [answer, setAnswer] = useState(existingText);
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

  function handleSubmit() {
    if (submitted || isPending) return;

    if (!answer.trim()) {
      toast.error("请输入答案");
      return;
    }

    startTransition(async () => {
      const result = await submitAnswer(
        questionId,
        answer.trim(),
        getDeviceType()
      );
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
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="请输入你的答案..."
        rows={4}
        disabled={submitted || isPending}
        className="min-h-[100px]"
        onFocus={(e) => {
          // Prevent mobile browser auto-scroll on focus
          e.preventDefault();
          e.target.scrollIntoView({ block: "nearest", behavior: "instant" });
        }}
      />

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim() || isPending}
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
            <Markdown>{feedbackText}</Markdown>
          )}
        </div>
      )}
    </div>
  );
}
