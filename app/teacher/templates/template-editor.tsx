"use client";

import { useState, useTransition } from "react";
import { saveTemplate } from "@/lib/actions/templates";
import { DEFAULT_TEMPLATES } from "@/lib/ai/default-templates";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type Template = {
  id: string;
  teacherId: string;
  questionType: string;
  templateKind: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

type QuestionTypeConfig = {
  key: string;
  label: string;
  templates: {
    kind: string;
    label: string;
    placeholders: string[];
  }[];
};

const QUESTION_TYPES: QuestionTypeConfig[] = [
  {
    key: "fill_blank",
    label: "填空题",
    templates: [
      {
        kind: "scoring",
        label: "打分提示词",
        placeholders: ["{题干}", "{标准答案}", "{学生答案}"],
      },
      {
        kind: "feedback",
        label: "批改提示词",
        placeholders: ["{题干}", "{标准答案}", "{学生答案}"],
      },
    ],
  },
  {
    key: "short_answer",
    label: "简答题",
    templates: [
      {
        kind: "scoring",
        label: "打分提示词",
        placeholders: ["{题干}", "{标准答案}", "{学生答案}"],
      },
      {
        kind: "feedback",
        label: "批改提示词",
        placeholders: ["{题干}", "{标准答案}", "{学生答案}"],
      },
    ],
  },
  {
    key: "multiple_choice",
    label: "选择题",
    templates: [
      {
        kind: "feedback",
        label: "批改提示词",
        placeholders: ["{题干}", "{选项}", "{标准答案}", "{学生答案}"],
      },
    ],
  },
];

function getTemplateContent(
  templates: Template[],
  questionType: string,
  templateKind: string
): string {
  const custom = templates.find(
    (t) => t.questionType === questionType && t.templateKind === templateKind
  );
  if (custom) return custom.content;
  return DEFAULT_TEMPLATES[questionType]?.[templateKind] ?? "";
}

function TemplateCard({
  questionType,
  templateKind,
  label,
  placeholders,
  initialContent,
  defaultContent,
}: {
  questionType: string;
  templateKind: string;
  label: string;
  placeholders: string[];
  initialContent: string;
  defaultContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  const isDefault = content === defaultContent;

  function handleSave() {
    startTransition(async () => {
      const result = await saveTemplate(questionType, templateKind, content);
      if ("success" in result) {
        toast.success("模板已保存");
      }
    });
  }

  function handleReset() {
    setContent(defaultContent);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{label}</h3>
          {isDefault && (
            <Badge variant="secondary">默认</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isDefault}
          >
            恢复默认
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground">可用变量：</span>
        {placeholders.map((p) => (
          <Badge key={p} variant="outline">
            {p}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function TemplateEditor({ templates }: { templates: Template[] }) {
  return (
    <div className="space-y-6">
      {QUESTION_TYPES.map((qt) => (
        <Card key={qt.key}>
          <CardHeader>
            <CardTitle>{qt.label}</CardTitle>
            <CardDescription>
              {qt.key === "multiple_choice"
                ? "选择题由系统自动评分，仅需配置批改反馈提示词"
                : "配置 AI 打分和批改反馈的提示词模板"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {qt.templates.map((tmpl) => (
              <TemplateCard
                key={`${qt.key}-${tmpl.kind}`}
                questionType={qt.key}
                templateKind={tmpl.kind}
                label={tmpl.label}
                placeholders={tmpl.placeholders}
                initialContent={getTemplateContent(
                  templates,
                  qt.key,
                  tmpl.kind
                )}
                defaultContent={
                  DEFAULT_TEMPLATES[qt.key]?.[tmpl.kind] ?? ""
                }
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
