import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDiscussionCardDetail } from "@/lib/actions/discussion-cards";
import { DiscussionDetail } from "./discussion-detail";

export default async function DiscussionCardDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; classroomId: string; cardId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") redirect("/login");

  const { courseId, classroomId, cardId } = await params;
  const data = await getDiscussionCardDetail(cardId);

  if (!data) {
    redirect(
      `/teacher/courses/${courseId}/classrooms/${classroomId}/discussions`
    );
  }

  return (
    <div className="space-y-4">
      <DiscussionDetail
        card={data.card}
        sessions={data.sessions}
        courseId={courseId}
        classroomId={classroomId}
      />
    </div>
  );
}
