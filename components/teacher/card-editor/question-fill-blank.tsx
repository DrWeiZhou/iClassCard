"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FillBlankData = {
  title: string;
  score: number;
  correctAnswer: string; // JSON array of answers per blank
  feedbackPrompt: string;
};

export function QuestionFillBlank({
  title,
  score,
  correctAnswer,
  feedbackPrompt,
  onChange,
}: {
  title: string;
  score: number;
  correctAnswer: string;
  feedbackPrompt: string;
  onChange: (data: Partial<FillBlankData>) => void;
}) {
  // Count blanks (___) in the title
  const blankCount = useMemo(() => {
    const matches = title.match(/___/g);
    return matches ? matches.length : 0;
  }, [title]);

  // Parse answers from JSON string
  const answers: string[] = useMemo(() => {
    try {
      const parsed = JSON.parse(correctAnswer);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [correctAnswer]);

  // Ensure answers array matches blank count
  const normalizedAnswers = useMemo(() => {
    const result = [...answers];
    while (result.length < blankCount) {
      result.push("");
    }
    return result.slice(0, blankCount);
  }, [answers, blankCount]);

  function handleAnswerChange(index: number, value: string) {
    const newAnswers = [...normalizedAnswers];
    newAnswers[index] = value;
    onChange({ correctAnswer: JSON.stringify(newAnswers) });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>分值</Label>
        <Input
          type="number"
          min={0}
          value={score}
          onChange={(e) =>
            onChange({ score: Math.max(0, parseInt(e.target.value) || 0) })
          }
          className="w-24"
        />
      </div>

      <div className="space-y-2">
        <Label>题干</Label>
        <Textarea
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="请输入题干内容，使用 ___ (三个下划线) 标记填空位置"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          使用 ___ (三个下划线) 标记填空位置，当前检测到 {blankCount} 个填空
        </p>
      </div>

      {blankCount > 0 && (
        <div className="space-y-2">
          <Label>标准答案</Label>
          <div className="space-y-2">
            {normalizedAnswers.map((answer, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-16 shrink-0">
                  空 {index + 1}:
                </span>
                <Input
                  value={answer}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder={`第 ${index + 1} 个填空的答案`}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>批改提示词</Label>
        <Textarea
          value={feedbackPrompt}
          onChange={(e) => onChange({ feedbackPrompt: e.target.value })}
          placeholder="请输入批改提示词（用于AI评分和生成个性化反馈）"
          rows={3}
        />
      </div>
    </div>
  );
}
