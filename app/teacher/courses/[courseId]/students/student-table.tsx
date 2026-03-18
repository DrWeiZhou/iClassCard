"use client";

import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { removeStudentFromCourse } from "@/lib/actions/students";
import { toast } from "sonner";

type StudentItem = {
  id: string;
  studentNo: string;
  name: string;
  gender: string | null;
  college: string | null;
  grade: string | null;
  major: string | null;
  class: string | null;
  phone: string | null;
  email: string | null;
  isRetake: boolean;
};

export function StudentTable({
  students,
  courseId,
}: {
  students: StudentItem[];
  courseId: string;
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        暂无学生，请通过 Excel 导入或手动添加学生
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>学号</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>性别</TableHead>
            <TableHead>学院</TableHead>
            <TableHead>年级</TableHead>
            <TableHead>专业</TableHead>
            <TableHead>班级</TableHead>
            <TableHead>手机</TableHead>
            <TableHead>邮箱</TableHead>
            <TableHead>重修</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              courseId={courseId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StudentRow({
  student,
  courseId,
}: {
  student: StudentItem;
  courseId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeStudentFromCourse(courseId, student.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("已移除学生");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{student.studentNo}</TableCell>
      <TableCell>{student.name}</TableCell>
      <TableCell>{student.gender ?? ""}</TableCell>
      <TableCell>{student.college ?? ""}</TableCell>
      <TableCell>{student.grade ?? ""}</TableCell>
      <TableCell>{student.major ?? ""}</TableCell>
      <TableCell>{student.class ?? ""}</TableCell>
      <TableCell>{student.phone ?? ""}</TableCell>
      <TableCell>{student.email ?? ""}</TableCell>
      <TableCell>{student.isRetake ? "是" : "否"}</TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" size="sm" disabled={isPending} />
            }
          >
            删除
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认移除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要将学生&quot;{student.name}&quot;从本课程中移除吗？此操作不会删除学生信息，仅取消与本课程的关联。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleRemove}
              >
                移除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}
