"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
} | null;

export function SelfAssessmentAnswer({
  questionId,
  existingAnswer,
}: {
  questionId: string;
  existingAnswer: ExistingAnswer;
}) {
  const existingData = existingAnswer?.answer as
    | { stars?: number; comment?: string }
    | undefined;

  const [stars, setStars] = useState(existingData?.stars ?? 0);
  const [comment, setComment] = useState(existingData?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingAnswer);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleStarClick(rating: number) {
    if (submitted || isPending) return;

    setStars(rating);
    // Auto-submit on star click (includes current comment if any)
    startTransition(async () => {
      const result = await submitAnswer(
        questionId,
        { stars: rating, comment: comment.trim() || undefined },
        getDeviceType()
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      toast.success("评分已提交");
    });
  }

  return (
    <div className="space-y-4">
      {/* Hint to type comment first */}
      {!submitted && (
        <p className="text-xs text-muted-foreground">
          （先填写自评学习评语再进行评级）
        </p>
      )}

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={submitted || isPending}
            className="p-1.5 touch-manipulation disabled:cursor-not-allowed transition-transform active:scale-110"
            onMouseEnter={() => !submitted && setHoveredStar(rating)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(rating)}
            aria-label={`${rating} 星`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                rating <= (hoveredStar || stars)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {stars} 星
          </span>
        )}
      </div>

      {/* Comment text area */}
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="写一些学习感想...（可选）"
        rows={3}
        disabled={submitted || isPending}
      />
    </div>
  );
}
