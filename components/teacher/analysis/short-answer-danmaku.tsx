"use client";

import { useMemo } from "react";
import type { AnalysisAnswer } from "@/lib/actions/analysis";

type Props = {
  correctAnswer: string | null;
  answers: AnalysisAnswer[];
};

// Danmaku (scrolling text) effect using CSS animations
export function ShortAnswerDanmaku({ correctAnswer, answers }: Props) {
  const texts = useMemo(() => {
    return answers
      .map((ans) => {
        if (typeof ans.answer === "string" && ans.answer.trim()) {
          return ans.answer.trim();
        }
        return null;
      })
      .filter((t): t is string => t !== null);
  }, [answers]);

  if (answers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生作答
      </div>
    );
  }

  // Distribute texts across multiple rows for visual variety
  const rowCount = Math.min(4, Math.max(2, Math.ceil(texts.length / 3)));
  const rows: string[][] = Array.from({ length: rowCount }, () => []);
  texts.forEach((text, i) => {
    rows[i % rowCount].push(text);
  });

  // Different animation durations per row for variety
  const durations = [20, 15, 25, 18];
  // Different color classes per row
  const rowColors = [
    "text-blue-700 dark:text-blue-300",
    "text-purple-700 dark:text-purple-300",
    "text-teal-700 dark:text-teal-300",
    "text-orange-700 dark:text-orange-300",
  ];

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
      <div className="relative overflow-hidden rounded-lg border bg-muted/30 p-2">
        <style>{`
          @keyframes danmaku-scroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .danmaku-row {
            display: flex;
            white-space: nowrap;
            animation: danmaku-scroll var(--duration) linear infinite;
          }
          .danmaku-row:hover {
            animation-play-state: paused;
          }
        `}</style>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="overflow-hidden py-1.5">
            <div
              className="danmaku-row"
              style={
                {
                  "--duration": `${durations[rowIndex % durations.length]}s`,
                  animationDelay: `${rowIndex * -3}s`,
                } as React.CSSProperties
              }
            >
              {row.map((text, textIndex) => (
                <span
                  key={textIndex}
                  className={`mx-4 inline-block rounded-full bg-background px-3 py-1 text-sm shadow-sm ${
                    rowColors[rowIndex % rowColors.length]
                  }`}
                >
                  {text}
                </span>
              ))}
              {/* Repeat for continuous scrolling effect */}
              {row.map((text, textIndex) => (
                <span
                  key={`repeat-${textIndex}`}
                  className={`mx-4 inline-block rounded-full bg-background px-3 py-1 text-sm shadow-sm ${
                    rowColors[rowIndex % rowColors.length]
                  }`}
                >
                  {text}
                </span>
              ))}
            </div>
          </div>
        ))}
        {texts.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            暂无数据
          </div>
        )}
      </div>
    </div>
  );
}
