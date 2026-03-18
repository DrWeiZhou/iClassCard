import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClassrooms } from "@/lib/actions/classrooms";
import { ClassroomList } from "./classroom-list";
import { ClassroomPageHeader } from "./classroom-page-header";

export default async function ClassroomsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getAuthUser();
  if (!user || user.role !== "teacher") {
    redirect("/login");
  }

  const { courseId } = await params;
  const classrooms = await getClassrooms(courseId);

  return (
    <div className="space-y-4">
      <ClassroomPageHeader
        courseId={courseId}
        classroomCount={classrooms.length}
        defaultInstructor={user.name}
      />
      <ClassroomList
        classrooms={classrooms}
        courseId={courseId}
        defaultInstructor={user.name}
      />
    </div>
  );
}
