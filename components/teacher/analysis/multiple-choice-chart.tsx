"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AnalysisAnswer } from "@/lib/actions/analysis";

type Option = { label: string; text: string };

type Props = {
  options: Option[];
  correctAnswer: string | null;
  answers: AnalysisAnswer[];
};

export function MultipleChoiceChart({ options, correctAnswer, answers }: Props) {
  // Parse correct answers (may be comma-separated for multi-select)
  const correctLabels = correctAnswer
    ? correctAnswer.split(",").map((s) => s.trim())
    : [];

  // Count selections per option
  const counts: Record<string, number> = {};
  for (const opt of options) {
    counts[opt.label] = 0;
  }

  for (const ans of answers) {
    const selected = ans.answer as string[];
    if (Array.isArray(selected)) {
      for (const label of selected) {
        if (counts[label] !== undefined) {
          counts[label]++;
        }
      }
    }
  }

  const total = answers.length;

  const data = options.map((opt) => ({
    label: opt.label,
    text: `${opt.label}. ${opt.text}`,
    count: counts[opt.label] || 0,
    percentage: total > 0 ? Math.round(((counts[opt.label] || 0) / total) * 100) : 0,
    isCorrect: correctLabels.includes(opt.label),
  }));

  if (answers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生作答
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        共 {total} 人作答，正确答案：
        <span className="font-medium text-green-600 dark:text-green-400">
          {correctLabels.join(", ") || "未设置"}
        </span>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 60, right: 30 }}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={40}
              fontSize={12}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => [
                `${props.payload.count} 人 (${value}%)`,
                props.payload.text,
              ]}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isCorrect ? "#22c55e" : "#94a3b8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {data.map((d) => (
          <div
            key={d.label}
            className={`text-xs ${
              d.isCorrect
                ? "font-medium text-green-600 dark:text-green-400"
                : "text-muted-foreground"
            }`}
          >
            {d.text} — {d.count} 人 ({d.percentage}%)
            {d.isCorrect && " (正确)"}
          </div>
        ))}
      </div>
    </div>
  );
}
