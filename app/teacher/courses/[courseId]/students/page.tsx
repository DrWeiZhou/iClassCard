import { getCourseStudents } from "@/lib/actions/students";
import { StudentTable } from "./student-table";
import { ExcelImport } from "./excel-import";
import { StudentFormDialog } from "./student-form-dialog";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const students = await getCourseStudents(courseId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">
          学生管理
          <span className="ml-2 text-sm text-muted-foreground">
            ({students.length} 人)
          </span>
        </h2>
        <div className="flex gap-2">
          <ExcelImport courseId={courseId} />
          <StudentFormDialog courseId={courseId} />
        </div>
      </div>
      <StudentTable students={students} courseId={courseId} />
    </div>
  );
}
