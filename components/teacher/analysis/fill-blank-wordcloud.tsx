"use client";

import { useMemo } from "react";
import type { AnalysisAnswer } from "@/lib/actions/analysis";

type Props = {
  correctAnswer: string | null;
  answers: AnalysisAnswer[];
};

type WordItem = {
  text: string;
  count: number;
};

// CSS-based word cloud implementation (compatible with React 19)
export function FillBlankWordCloud({ correctAnswer, answers }: Props) {
  const words = useMemo(() => {
    const freq: Record<string, number> = {};

    for (const ans of answers) {
      const answerData = ans.answer;
      if (Array.isArray(answerData)) {
        // Fill-in-the-blank: array of answers for each blank
        for (const text of answerData) {
          if (typeof text === "string" && text.trim()) {
            const normalized = text.trim();
            freq[normalized] = (freq[normalized] || 0) + 1;
          }
        }
      } else if (typeof answerData === "string" && answerData.trim()) {
        const normalized = answerData.trim();
        freq[normalized] = (freq[normalized] || 0) + 1;
      }
    }

    const items: WordItem[] = Object.entries(freq)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count);

    return items;
  }, [answers]);

  if (answers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生作答
      </div>
    );
  }

  const maxCount = words.length > 0 ? words[0].count : 1;

  // Color palette for variety
  const colors = [
    "text-blue-600 dark:text-blue-400",
    "text-purple-600 dark:text-purple-400",
    "text-pink-600 dark:text-pink-400",
    "text-orange-600 dark:text-orange-400",
    "text-teal-600 dark:text-teal-400",
    "text-indigo-600 dark:text-indigo-400",
    "text-cyan-600 dark:text-cyan-400",
    "text-red-600 dark:text-red-400",
  ];

  // Parse correct answer (may have multiple blanks separated by semicolons)
  const correctAnswers = correctAnswer
    ? correctAnswer.split(/[;；]/).map((s) => s.trim().toLowerCase())
    : [];

  return (
    <div className="space-y-3">
      {correctAnswer && (
        <div className="text-sm text-muted-foreground">
          参考答案：
          <span className="font-medium text-green-600 dark:text-green-400">
            {correctAnswer}
          </span>
        </div>
      )}
      <div className="text-sm text-muted-foreground">
        共 {answers.length} 人作答
      </div>
      <div className="flex min-h-[120px] flex-wrap items-center justify-center gap-2 rounded-lg border bg-muted/30 p-4">
        {words.slice(0, 50).map((word, i) => {
          // Scale font size based on frequency (14px to 36px)
          const ratio = maxCount > 1 ? word.count / maxCount : 1;
          const fontSize = Math.round(14 + ratio * 22);
          const isCorrect = correctAnswers.includes(word.text.toLowerCase());

          return (
            <span
              key={word.text}
              className={`inline-block cursor-default transition-opacity hover:opacity-70 ${
                isCorrect
                  ? "font-bold text-green-600 dark:text-green-400"
                  : colors[i % colors.length]
              }`}
              style={{ fontSize: `${fontSize}px` }}
              title={`${word.text}: ${word.count} 人`}
            >
              {word.text}
              <sub className="ml-0.5 text-[10px] text-muted-foreground">
                {word.count}
              </sub>
            </span>
          );
        })}
        {words.length === 0 && (
          <span className="text-sm text-muted-foreground">暂无数据</span>
        )}
      </div>
    </div>
  );
}
