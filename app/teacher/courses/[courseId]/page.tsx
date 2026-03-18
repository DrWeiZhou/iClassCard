import { redirect } from "next/navigation";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/teacher/courses/${courseId}/classrooms`);
}
