import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCardAnalysis, getCardInfo } from "@/lib/actions/analysis";
import { AnalysisView } from "./analysis-view";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string; cardId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId, classroomId, cardId } = await params;
  const card = await getCardInfo(cardId);

  if (!card) {
    redirect(`/teacher/courses/${courseId}/classrooms/${classroomId}/cards`);
  }

  const analysisData = await getCardAnalysis(cardId);

  return (
    <AnalysisView
      cardName={card.name}
      analysisData={analysisData}
      courseId={courseId}
      classroomId={classroomId}
    />
  );
}
