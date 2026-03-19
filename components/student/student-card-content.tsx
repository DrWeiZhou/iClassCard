"use client";

import { useState, useCallback, useMemo } from "react";
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

export function StudentCardContent({
  cardName,
  totalScore,
  questions,
  answerMap,
}: {
  cardName: string;
  totalScore: number;
  questions: Question[];
  answerMap: Map<string, ExistingAnswer>;
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

  return (
    <div>
      {/* Sticky total score bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b -mx-4 px-4 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold leading-tight">{cardName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              共 {questions.length} 题，已答 {answeredCount} 题
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">
              {currentScore}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {totalScore}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">当前得分</p>
          </div>
        </div>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">暂无题目</p>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <AnswerCard
              key={question.id}
              question={question}
              existingAnswer={answerMap.get(question.id) ?? null}
              onScoreUpdate={handleScoreUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
