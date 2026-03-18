"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

export type QuestionType =
  | "self_assessment"
  | "multiple_choice"
  | "fill_blank"
  | "short_answer";

const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: "self_assessment", label: "自我评测" },
  { type: "multiple_choice", label: "选择题" },
  { type: "fill_blank", label: "填空题" },
  { type: "short_answer", label: "简述题" },
];

export function AddQuestionButton({
  onAdd,
}: {
  onAdd: (type: QuestionType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full" />}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        添加题目
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {QUESTION_TYPES.map(({ type, label }) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
