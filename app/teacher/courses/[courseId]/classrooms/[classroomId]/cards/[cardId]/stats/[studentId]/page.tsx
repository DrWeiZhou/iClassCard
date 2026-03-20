import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getStudentCardForTeacher } from "@/lib/actions/analysis";
import { StudentCardContent } from "@/components/student/student-card-content";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function StudentStatsPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    classroomId: string;
    cardId: string;
    studentId: string;
  }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const { courseId, classroomId, cardId, studentId } = await params;
  const data = await getStudentCardForTeacher(cardId, studentId);

  if (!data) {
    redirect(
      `/teacher/courses/${courseId}/classrooms/${classroomId}/cards/${cardId}/stats`
    );
  }

  const answerMap = new Map(
    data.existingAnswers.map((a) => [a.questionId, a])
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Link
          href={`/teacher/courses/${courseId}/classrooms/${classroomId}/cards/${cardId}/stats`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回学生列表
        </Link>
      </div>

      <div className="text-sm text-muted-foreground">
        学生：{data.studentName}（{data.studentNo}）
      </div>

      <StudentCardContent
        cardName={data.card.name}
        totalScore={data.card.totalScore}
        questions={data.questions}
        answerMap={answerMap}
      />
    </div>
  );
}
