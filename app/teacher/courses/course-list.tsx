"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
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
import { Pencil, Trash2, Users } from "lucide-react";
import { deleteCourse } from "@/lib/actions/courses";
import { toast } from "sonner";
import { CourseFormDialog } from "./course-form-dialog";

type Course = {
  id: string;
  teacherId: string;
  year: string;
  semester: string;
  name: string;
  studentCount: number;
  classComposition: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function CourseList({ courses }: { courses: Course[] }) {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        暂无课程，请点击&quot;新建课程&quot;添加
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onEdit={() => setEditingCourse(course)}
          />
        ))}
      </div>

      <CourseFormDialog
        mode="edit"
        course={editingCourse ?? undefined}
        open={editingCourse !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCourse(null);
        }}
      />
    </>
  );
}

function CourseCard({
  course,
  onEdit,
}: {
  course: Course;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCourse(course.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("课程已删除");
      }
    });
  }

  function handleCardClick() {
    router.push(`/teacher/courses/${course.id}`);
  }

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleCardClick}
    >
      <CardHeader>
        <CardTitle>{course.name}</CardTitle>
        <CardDescription>
          {course.year} {course.semester}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              disabled={isPending}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon-sm" disabled={isPending} />
                }
              >
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除课程&quot;{course.name}&quot;吗？此操作将同时删除该课程下的所有课堂和学习卡数据，且不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{course.studentCount} 人</span>
        </div>
      </CardContent>
    </Card>
  );
}
