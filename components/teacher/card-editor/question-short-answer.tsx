"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ShortAnswerData = {
  title: string;
  score: number;
  correctAnswer: string;
  feedbackPrompt: string;
};

export function QuestionShortAnswer({
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
  onChange: (data: Partial<ShortAnswerData>) => void;
}) {
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
          placeholder="请输入题干内容"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>标准答案</Label>
        <Textarea
          value={correctAnswer}
          onChange={(e) => onChange({ correctAnswer: e.target.value })}
          placeholder="请输入标准答案"
          rows={3}
        />
      </div>

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
