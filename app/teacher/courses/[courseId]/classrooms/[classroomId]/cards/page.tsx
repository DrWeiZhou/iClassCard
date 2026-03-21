import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCards } from "@/lib/actions/cards";
import { getLessonPlan } from "@/lib/actions/lesson-plans";
import { db } from "@/lib/db";
import { classrooms, courses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CardList } from "./card-list";
import { LessonPlanUpload } from "@/components/teacher/lesson-plan-upload";

async function getClassroom(classroomId: string, teacherId: string) {
  const result = await db
    .select({ classroom: classrooms })
    .from(classrooms)
    .innerJoin(courses, eq(classrooms.courseId, courses.id))
    .where(
      and(eq(classrooms.id, classroomId), eq(courses.teacherId, teacherId))
    );
  return result.length > 0 ? result[0].classroom : null;
}

export default async function CardsPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId, classroomId } = await params;
  const classroom = await getClassroom(classroomId, user.id);

  if (!classroom) {
    redirect(`/teacher/courses/${courseId}/classrooms`);
  }

  const cards = await getCards(classroomId);
  const classroomDisplayName =
    classroom.name || `${classroom.date} 课堂`;

  // Fetch lesson plan info
  const lessonPlan = await getLessonPlan(classroomId);
  const lessonPlanInfo = lessonPlan
    ? {
        id: lessonPlan.id,
        fileName: lessonPlan.fileName,
        sectionCount: lessonPlan.sections.length,
      }
    : null;

  return (
    <div className="space-y-4">
      <LessonPlanUpload
        classroomId={classroomId}
        existingPlan={lessonPlanInfo}
      />
      <CardList
        cards={cards}
        courseId={courseId}
        classroomId={classroomId}
        classroomName={classroomDisplayName}
      />
    </div>
  );
}
