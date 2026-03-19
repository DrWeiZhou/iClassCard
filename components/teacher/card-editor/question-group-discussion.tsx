"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type GroupDiscussionData = {
  title: string;
  score: number;
};

export function QuestionGroupDiscussion({
  title,
  score,
  onChange,
}: {
  title: string;
  score: number;
  onChange: (data: Partial<GroupDiscussionData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>讨论题目</Label>
        <Input
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="请输入分组讨论的题目"
        />
      </div>
      <div className="space-y-2">
        <Label>分值</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) =>
            onChange({ score: Math.max(0, parseInt(e.target.value) || 0) })
          }
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          组员互评打星，得分按比例换算
        </p>
      </div>
    </div>
  );
}
