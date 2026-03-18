"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
} | null;

export function ShortAnswerAnswer({
  questionId,
  maxScore,
  existingAnswer,
}: {
  questionId: string;
  maxScore: number;
  existingAnswer: ExistingAnswer;
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
      setScore(result.score ?? null);
      toast.success("已提交");
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

      {submitted && score !== null && (
        <p className="text-sm">
          <span className="text-muted-foreground">AI评分：</span>
          <span className="font-semibold">{score}</span>
          <span className="text-muted-foreground"> / {maxScore}</span>
        </p>
      )}

      {submitted && score === null && (
        <p className="text-sm text-muted-foreground">
          已提交，等待AI评分...
        </p>
      )}
    </div>
  );
}
