import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllClassrooms, getTeacherCourses } from "@/lib/actions/classrooms";
import { ClassroomsWithFilter } from "./classrooms-with-filter";

export default async function ClassroomsPage() {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const [classrooms, courses] = await Promise.all([
    getAllClassrooms(),
    getTeacherCourses(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">课堂管理</h1>
      <ClassroomsWithFilter classrooms={classrooms} courses={courses} />
    </div>
  );
}
