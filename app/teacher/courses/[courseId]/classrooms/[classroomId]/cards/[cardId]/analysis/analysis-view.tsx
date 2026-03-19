"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, ChevronUp } from "lucide-react";
import { MultipleChoiceChart } from "@/components/teacher/analysis/multiple-choice-chart";
import { FillBlankWordCloud } from "@/components/teacher/analysis/fill-blank-wordcloud";
import { ShortAnswerDanmaku } from "@/components/teacher/analysis/short-answer-danmaku";
import { GroupDiscussionAnalysis } from "@/components/teacher/analysis/group-discussion-analysis";
import { getQuestionAnalysis } from "@/lib/actions/analysis";
import type { AnalysisData } from "@/lib/actions/analysis";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "选择题",
  fill_blank: "填空题",
  short_answer: "简答题",
  self_assessment: "自评题",
  group_discussion: "分组讨论",
};

function SelfAssessmentStats({ answers }: { answers: AnalysisData["answers"] }) {
  if (answers.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生作答
      </div>
    );
  }

  let totalStars = 0;
  let starCount = 0;
  const comments: string[] = [];

  for (const ans of answers) {
    const data = ans.answer as { stars?: number; comment?: string } | null;
    if (data && typeof data.stars === "number") {
      totalStars += data.stars;
      starCount++;
    }
    if (data && typeof data.comment === "string" && data.comment.trim()) {
      comments.push(data.comment.trim());
    }
  }

  const avgStars = starCount > 0 ? (totalStars / starCount).toFixed(1) : "0";

  // Count star distribution
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const ans of answers) {
    const data = ans.answer as { stars?: number } | null;
    if (data && typeof data.stars === "number" && data.stars >= 1 && data.stars <= 5) {
      distribution[data.stars]++;
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        共 {answers.length} 人作答
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-500">{avgStars}</div>
          <div className="text-xs text-muted-foreground">平均评分</div>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-right">{star} 星</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-yellow-400 transition-all"
                  style={{
                    width: `${starCount > 0 ? (distribution[star] / starCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="w-8 text-muted-foreground">
                {distribution[star]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">学生评语（{comments.length} 条）</div>
          <ShortAnswerDanmaku
            correctAnswer={null}
            answers={answers
              .filter((a) => {
                const d = a.answer as { comment?: string } | null;
                return d && typeof d.comment === "string" && d.comment.trim();
              })
              .map((a) => ({
                ...a,
                answer: (a.answer as { comment: string }).comment.trim(),
              }))}
          />
        </div>
      )}
    </div>
  );
}

function QuestionAnalysis({
  data: initialData,
  index,
}: {
  data: AnalysisData;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState(initialData);
  const [isRefreshing, startRefresh] = useTransition();
  const { question, answers } = data;

  const handleToggle = () => {
    if (!expanded) {
      // Fetch fresh data when expanding
      startRefresh(async () => {
        const fresh = await getQuestionAnalysis(question.id);
        if (fresh) {
          setData(fresh);
        }
      });
    }
    setExpanded(!expanded);
  };

  const renderAnalysis = () => {
    switch (question.type) {
      case "multiple_choice":
        return (
          <MultipleChoiceChart
            options={(question.options as { label: string; text: string }[]) || []}
            correctAnswer={question.correctAnswer}
            answers={answers}
          />
        );
      case "fill_blank":
        return (
          <FillBlankWordCloud
            correctAnswer={question.correctAnswer}
            answers={answers}
          />
        );
      case "short_answer":
        return (
          <ShortAnswerDanmaku
            correctAnswer={question.correctAnswer}
            answers={answers}
          />
        );
      case "self_assessment":
        return <SelfAssessmentStats answers={answers} />;
      case "group_discussion":
        return (
          <GroupDiscussionAnalysis
            questionId={question.id}
            maxScore={question.score}
          />
        );
      default:
        return (
          <div className="py-4 text-center text-sm text-muted-foreground">
            未知题型
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          第 {index + 1} 题
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Badge variant="outline">
            {TYPE_LABELS[question.type] || question.type}
          </Badge>
          <span>{question.score} 分</span>
          <span className="text-xs text-muted-foreground">
            {answers.length} 人作答
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-2">
          <div className="whitespace-pre-wrap">{question.title}</div>
          {question.type === "multiple_choice" && question.options && (
            <div className="space-y-1 pl-2">
              {(question.options as { label: string; text: string }[]).map((opt) => (
                <div key={opt.label} className="flex gap-2 text-muted-foreground">
                  <span className="font-medium">{opt.label}.</span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}
          {question.type === "self_assessment" && question.content && (
            <div className="text-xs text-muted-foreground">
              学习内容：{question.content}
            </div>
          )}
          {(question.type === "fill_blank" || question.type === "short_answer") && question.correctAnswer && (
            <div className="text-xs text-muted-foreground">
              参考答案：{question.correctAnswer}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          disabled={isRefreshing}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1.5 h-4 w-4" />
              收起分析
            </>
          ) : isRefreshing ? (
            <>
              加载中...
            </>
          ) : (
            <>
              <BarChart3 className="mr-1.5 h-4 w-4" />
              分析
            </>
          )}
        </Button>
        {expanded && (
          <div className="rounded-lg border bg-muted/10 p-4">
            {renderAnalysis()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalysisView({
  cardName,
  analysisData,
  courseId,
  classroomId,
}: {
  cardName: string;
  analysisData: AnalysisData[];
  courseId: string;
  classroomId: string;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            router.push(
              `/teacher/courses/${courseId}/classrooms/${classroomId}/cards`
            )
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-medium">
          {cardName} - 分析
          <span className="ml-2 text-sm text-muted-foreground">
            ({analysisData.length} 题)
          </span>
        </h2>
      </div>

      {analysisData.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          该学习卡暂无题目
        </div>
      ) : (
        <div className="space-y-4">
          {analysisData.map((data, index) => (
            <QuestionAnalysis
              key={data.question.id}
              data={data}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
