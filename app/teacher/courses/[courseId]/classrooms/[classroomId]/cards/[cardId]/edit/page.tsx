import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCardWithQuestions } from "@/lib/actions/cards";
import { CardEditor } from "@/components/teacher/card-editor";

export default async function CardEditPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string; cardId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId, classroomId, cardId } = await params;
  const card = await getCardWithQuestions(cardId);

  if (!card) {
    redirect(`/teacher/courses/${courseId}/classrooms/${classroomId}/cards`);
  }

  // Only draft cards can be edited
  if (card.status === "published") {
    redirect(`/teacher/courses/${courseId}/classrooms/${classroomId}/cards`);
  }

  return (
    <CardEditor card={card} courseId={courseId} classroomId={classroomId} />
  );
}
