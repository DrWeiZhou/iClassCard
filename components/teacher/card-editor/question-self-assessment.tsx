"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SelfAssessmentData = {
  title: string;
  score: number;
};

export function QuestionSelfAssessment({
  title,
  onChange,
}: {
  title: string;
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
        <Input value={0} disabled className="w-24" />
        <p className="text-xs text-muted-foreground">
          自我评测类型的分值固定为 0 分
        </p>
      </div>
    </div>
  );
}
