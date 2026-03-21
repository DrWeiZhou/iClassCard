"use client";

import { useState, useTransition } from "react";
import { Star, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { submitAnswer } from "@/lib/actions/answers";
import { getDeviceType } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

type ExistingAnswer = {
  id: string;
  answer: unknown;
  score: number | null;
} | null;

type LessonPlanLink = {
  lessonPlanId: string;
  anchorId: string;
  headingText: string;
} | null;

export function SelfAssessmentAnswer({
  questionId,
  existingAnswer,
  onScoreUpdate,
  lessonPlanLink,
}: {
  questionId: string;
  existingAnswer: ExistingAnswer;
  onScoreUpdate?: (questionId: string, score: number) => void;
  lessonPlanLink?: LessonPlanLink;
}) {
  const existingData = existingAnswer?.answer as
    | { stars?: number; comment?: string }
    | undefined;

  const [stars, setStars] = useState(existingData?.stars ?? 0);
  const [comment, setComment] = useState(existingData?.comment ?? "");
  const [submitted, setSubmitted] = useState(!!existingAnswer);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);

  const lessonPlanUrl = lessonPlanLink
    ? `/lesson-plan/${lessonPlanLink.lessonPlanId}#${lessonPlanLink.anchorId}`
    : null;

  function handleStarClick(rating: number) {
    if (submitted || isPending) return;

    setStars(rating);
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
      if (result.score !== null && result.score !== undefined) {
        onScoreUpdate?.(questionId, result.score);
      }

      if (rating <= 3 && lessonPlanLink) {
        setShowDialog(true);
      }
    });
  }

  return (
    <div className="space-y-4">
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

      {/* Lesson plan link — shown after submission if matched */}
      {submitted && lessonPlanUrl && (
        <Link
          href={lessonPlanUrl}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          精准教案: {lessonPlanLink!.headingText}
        </Link>
      )}

      {/* Low score dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>学习建议</AlertDialogTitle>
            <AlertDialogDescription>
              似乎没学太明白，是否需要瞄一眼教案内容充个电？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>否</AlertDialogCancel>
            {lessonPlanUrl && (
              <AlertDialogAction
                onClick={() => {
                  setShowDialog(false);
                  window.location.href = lessonPlanUrl;
                }}
              >
                是
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
