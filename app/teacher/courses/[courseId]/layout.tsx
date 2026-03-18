import { redirect, notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getCourse } from "@/lib/actions/courses";
import { CourseDetailNav } from "./course-detail-nav";

export default async function CourseDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId } = await params;
  const course = await getCourse(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-xl font-semibold">{course.name}</h1>
      <CourseDetailNav courseId={courseId} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
