"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { AnswerCard } from "./answer-card";

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
  closedAt: Date | null;
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

function getRecommendation(
  scorePercent: number,
  settings?: { high: [number, number]; mid: [number, number]; low: [number, number] }
): string | null {
  if (!settings) return null;
  if (scorePercent >= settings.high[0] && scorePercent <= settings.high[1]) return "高级";
  if (scorePercent >= settings.mid[0] && scorePercent <= settings.mid[1]) return "中级";
  if (scorePercent >= settings.low[0] && scorePercent <= settings.low[1]) return "初级";
  return null;
}

export function StudentCardContent({
  cardName,
  totalScore,
  questions,
  answerMap,
  ratingSettings,
  lessonPlanLinks,
}: {
  cardName: string;
  totalScore: number;
  questions: Question[];
  answerMap: Map<string, ExistingAnswer>;
  ratingSettings?: { high: [number, number]; mid: [number, number]; low: [number, number] };
  lessonPlanLinks?: Record<string, { url: string; headingText: string }>;
}) {
  // Initialize scores from existing answers
  const [scores, setScores] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const [questionId, answer] of answerMap) {
      if (answer.score !== null) {
        map.set(questionId, answer.score);
      }
    }
    return map;
  });

  const handleScoreUpdate = useCallback(
    (questionId: string, score: number) => {
      setScores((prev) => {
        const next = new Map(prev);
        next.set(questionId, score);
        return next;
      });
    },
    []
  );

  const currentScore = useMemo(
    () => Array.from(scores.values()).reduce((sum, s) => sum + s, 0),
    [scores]
  );

  const answeredCount = scores.size;

  const scorePercent = totalScore > 0 ? Math.round((currentScore / totalScore) * 100) : 0;
  const recommendation = answeredCount > 0 ? getRecommendation(scorePercent, ratingSettings) : null;

  // Hide fixed bottom bar when keyboard is open (for WeChat/QQ WebView compatibility)
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setKeyboardOpen(false);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return (
    <div className="relative">
      {/* Card header - static, not sticky */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{cardName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          共 {questions.length} 题，总分 {totalScore} 分
        </p>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">暂无题目</p>
      ) : (
        <div className="space-y-4 pb-24">
          {questions.map((question) => (
            <AnswerCard
              key={question.id}
              question={question}
              existingAnswer={answerMap.get(question.id) ?? null}
              onScoreUpdate={handleScoreUpdate}
              lessonPlanLink={lessonPlanLinks?.[question.id] ?? null}
            />
          ))}
        </div>
      )}

      {/* Floating score card - hidden when keyboard is open (WeChat/QQ WebView fix) */}
      {!keyboardOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t shadow-lg">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">已答 </span>
                <span className="font-semibold">{answeredCount}</span>
                <span className="text-muted-foreground"> / {questions.length} 题</span>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-muted-foreground text-sm">得分</span>
                  <span className="text-2xl font-bold tabular-nums">{currentScore}</span>
                  <span className="text-sm text-muted-foreground">/ {totalScore}</span>
                </div>
                {recommendation && (
                  <p className="text-xs font-medium text-green-600 mt-0.5">
                    建议完成{recommendation}个性化测试
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
