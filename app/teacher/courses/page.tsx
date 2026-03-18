import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getCourses } from "@/lib/actions/courses";
import { CourseList } from "./course-list";
import { CoursesPageHeader } from "./courses-page-header";

export default async function CoursesPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const courses = await getCourses();

  return (
    <div className="mx-auto max-w-4xl">
      <CoursesPageHeader />
      <CourseList courses={courses} />
    </div>
  );
}
