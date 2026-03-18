"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
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
}: {
  questionId: string;
  title: string;
  maxScore: number;
  existingAnswer: ExistingAnswer;
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
      setScore(result.score ?? null);
      toast.success("已提交");
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
