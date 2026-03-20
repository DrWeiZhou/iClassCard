import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getCardStudents } from "@/lib/actions/analysis";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string; cardId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const { courseId, classroomId, cardId } = await params;
  const data = await getCardStudents(cardId);

  if (!data) {
    redirect(`/teacher/courses/${courseId}/classrooms/${classroomId}/cards`);
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <Link
          href={`/teacher/courses/${courseId}/classrooms/${classroomId}/cards`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Link>
      </div>

      <h2 className="text-lg font-semibold">{data.cardName} - 统计</h2>
      <p className="text-sm text-muted-foreground">
        共 {data.students.length} 名学生
      </p>

      <div className="grid gap-2">
        {data.students.map((student) => (
          <Link
            key={student.id}
            href={`/teacher/courses/${courseId}/classrooms/${classroomId}/cards/${cardId}/stats/${student.id}`}
            className="block"
          >
            <Card className="transition-colors hover:bg-muted/50 cursor-pointer" size="sm">
              <CardHeader>
                <CardTitle className="text-sm">{student.name}</CardTitle>
                <CardDescription>{student.studentNo}</CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2">
                    {student.totalScore !== null && (
                      <span className="text-sm font-semibold text-red-500">
                        {student.totalScore}分
                      </span>
                    )}
                    <Badge
                      variant={
                        student.answeredCount >= student.totalQuestions
                          ? "default"
                          : "secondary"
                      }
                    >
                      {student.answeredCount}/{student.totalQuestions} 题已答
                    </Badge>
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {data.students.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            暂无学生
          </p>
        )}
      </div>
    </div>
  );
}
