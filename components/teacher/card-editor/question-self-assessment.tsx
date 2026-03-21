"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export type SelfAssessmentData = {
  title: string;
  score: number;
};

type MatchedHeading = {
  headingText: string;
  anchorId: string;
  lessonPlanId: string;
} | null;

export function QuestionSelfAssessment({
  title,
  score,
  matchedHeading,
  onChange,
}: {
  title: string;
  score: number;
  matchedHeading?: MatchedHeading;
  onChange: (data: Partial<SelfAssessmentData>) => void;
}) {
  const lessonPlanUrl = matchedHeading
    ? `/lesson-plan/${matchedHeading.lessonPlanId}#${matchedHeading.anchorId}`
    : null;

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
      {matchedHeading && lessonPlanUrl && (
        <Link
          href={lessonPlanUrl}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          精准教案: {matchedHeading.headingText}
        </Link>
      )}
    </div>
  );
}
