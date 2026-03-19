"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getGroupDiscussionAnalysis, type GroupRatingDetail } from "@/lib/actions/analysis";

export function GroupDiscussionAnalysis({
  questionId,
  maxScore,
}: {
  questionId: string;
  maxScore: number;
}) {
  const [data, setData] = useState<GroupRatingDetail[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGroupDiscussionAnalysis(questionId).then((result) => {
      setData(result?.details ?? []);
      setLoading(false);
    });
  }, [questionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        加载中...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        暂无学生互评数据
      </div>
    );
  }

  // Group ratings by target student
  const groupedMap = new Map<
    string,
    {
      name: string;
      studentNo: string;
      ratings: { raterName: string; stars: number }[];
    }
  >();
  for (const d of data) {
    if (!groupedMap.has(d.targetStudentId)) {
      groupedMap.set(d.targetStudentId, {
        name: d.targetStudentName,
        studentNo: d.targetStudentNo,
        ratings: [],
      });
    }
    groupedMap
      .get(d.targetStudentId)!
      .ratings.push({ raterName: d.raterName, stars: d.stars });
  }

  const grouped = Array.from(groupedMap.entries()).map(([id, info]) => {
    const avg =
      info.ratings.reduce((s, r) => s + r.stars, 0) / info.ratings.length;
    const score = Math.round(avg * (maxScore / 5));
    return { id, ...info, avg, score };
  });

  const ranked = [...grouped].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      {/* Group details */}
      <div className="space-y-3">
        <div className="text-sm font-medium">分组详情</div>
        {grouped.map((student) => (
          <div key={student.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{student.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {student.studentNo}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-bold">{student.score}</span>
                <span className="text-muted-foreground">/{maxScore} 分</span>
                <span className="ml-2 text-yellow-500">
                  ★ {student.avg.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {student.ratings.map((r, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {r.raterName}
                  <span className="text-yellow-500">{"★".repeat(r.stars)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Class ranking */}
      <div className="space-y-2">
        <div className="text-sm font-medium">全班排名</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">排名</th>
                <th className="px-3 py-2 text-left font-medium">姓名</th>
                <th className="px-3 py-2 text-left font-medium">学号</th>
                <th className="px-3 py-2 text-right font-medium">平均星级</th>
                <th className="px-3 py-2 text-right font-medium">得分</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((student, i) => (
                <tr key={student.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{student.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {student.studentNo}
                  </td>
                  <td className="px-3 py-2 text-right text-yellow-500">
                    ★ {student.avg.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">
                    {student.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
