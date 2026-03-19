"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SelfAssessmentData = {
  title: string;
  score: number;
};

export function QuestionSelfAssessment({
  title,
  score,
  onChange,
}: {
  title: string;
  score: number;
  onChange: (data: Partial<SelfAssessmentData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>学习内容名称</Label>
        <Input
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="请输入学习内容名称"
        />
      </div>
      <div className="space-y-2">
        <Label>分值</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => onChange({ score: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          学生按 1-5 星自评，得分按比例换算
        </p>
      </div>
    </div>
  );
}
