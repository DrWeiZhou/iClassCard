"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export type MultipleChoiceOption = {
  label: string;
  text: string;
};

export type MultipleChoiceData = {
  title: string;
  score: number;
  options: MultipleChoiceOption[];
  correctAnswer: string; // JSON string of correct labels, e.g. '["A","C"]'
  feedbackPrompt: string;
};

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function QuestionMultipleChoice({
  title,
  score,
  options,
  correctAnswer,
  feedbackPrompt,
  onChange,
}: {
  title: string;
  score: number;
  options: MultipleChoiceOption[];
  correctAnswer: string;
  feedbackPrompt: string;
  onChange: (data: Partial<MultipleChoiceData>) => void;
}) {
  // Parse correct answers from JSON string
  const correctLabels: string[] = (() => {
    try {
      const parsed = JSON.parse(correctAnswer);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  function handleOptionTextChange(index: number, text: string) {
    const newOptions = options.map((opt, i) =>
      i === index ? { ...opt, text } : opt
    );
    onChange({ options: newOptions });
  }

  function handleAddOption() {
    const nextLabel = OPTION_LABELS[options.length] || `选项${options.length + 1}`;
    onChange({
      options: [...options, { label: nextLabel, text: "" }],
    });
  }

  function handleDeleteOption(index: number) {
    const deletedLabel = options[index].label;
    // Re-label remaining options
    const newOptions = options
      .filter((_, i) => i !== index)
      .map((opt, i) => ({ ...opt, label: OPTION_LABELS[i] || `选项${i + 1}` }));
    // Remove deleted label from correct answers and remap labels
    const newCorrectLabels = correctLabels
      .filter((l) => l !== deletedLabel)
      .map((l) => {
        const oldIndex = options.findIndex((o) => o.label === l);
        if (oldIndex === -1) return l;
        // If option was after deleted index, its new index is oldIndex - 1
        const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
        return OPTION_LABELS[newIndex] || l;
      });
    onChange({
      options: newOptions,
      correctAnswer: JSON.stringify(newCorrectLabels),
    });
  }

  function handleCorrectToggle(label: string) {
    const newCorrectLabels = correctLabels.includes(label)
      ? correctLabels.filter((l) => l !== label)
      : [...correctLabels, label];
    onChange({ correctAnswer: JSON.stringify(newCorrectLabels) });
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
          placeholder="请输入题干内容"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>选项</Label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={correctLabels.includes(option.label)}
                  onChange={() => handleCorrectToggle(option.label)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium w-5">
                  {option.label}
                </span>
              </label>
              <Input
                value={option.text}
                onChange={(e) => handleOptionTextChange(index, e.target.value)}
                placeholder={`选项 ${option.label} 内容`}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteOption(index)}
                  title="删除选项"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {options.length < 26 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className="mt-2"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            添加选项
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          勾选复选框标记正确答案（可多选）
        </p>
      </div>

      <div className="space-y-2">
        <Label>批改提示词</Label>
        <Textarea
          value={feedbackPrompt}
          onChange={(e) => onChange({ feedbackPrompt: e.target.value })}
          placeholder="请输入批改提示词（用于AI生成个性化反馈）"
          rows={3}
        />
      </div>
    </div>
  );
}
