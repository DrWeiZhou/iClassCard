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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { BookOpen, MapPin, User, Plus, Pencil, Trash2 } from "lucide-react";
import { deleteClassroom } from "@/lib/actions/classrooms";
import { toast } from "sonner";
import { ClassroomFormDialogGlobal } from "./classroom-form-dialog-global";

type Classroom = {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  time: string;
  name: string | null;
  room: string | null;
  instructor: string | null;
  notes: string | null;
  createdAt: Date;
};

type Course = {
  id: string;
  name: string;
};

export function ClassroomsWithFilter({
  classrooms,
  courses,
}: {
  classrooms: Classroom[];
  courses: Course[];
}) {
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const filtered =
    selectedCourse === "all"
      ? classrooms
      : classrooms.filter((c) => c.courseId === selectedCourse);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={selectedCourse} onValueChange={(v) => setSelectedCourse(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="筛选课程" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部课程</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="ml-auto">
          <Plus className="mr-1 h-4 w-4" />
          新建课堂
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          暂无课堂
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((classroom) => (
            <ClassroomCardGlobal
              key={classroom.id}
              classroom={classroom}
              onEdit={() => setEditingClassroom(classroom)}
            />
          ))}
        </div>
      )}

      <ClassroomFormDialogGlobal
        courses={courses}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <ClassroomFormDialogGlobal
        courses={courses}
        mode="edit"
        classroom={editingClassroom ?? undefined}
        open={editingClassroom !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClassroom(null);
        }}
      />
    </div>
  );
}

function ClassroomCardGlobal({
  classroom,
  onEdit,
}: {
  classroom: Classroom;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClassroom(classroom.courseId, classroom.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("课堂已删除");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {classroom.name || `${classroom.date} 课堂`}
        </CardTitle>
        <CardDescription>
          <span>{classroom.courseName}</span>
          <span className="mx-1">·</span>
          <span>{classroom.date} {classroom.time}</span>
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除该课堂吗？此操作将同时删除该课堂下的所有学习卡数据，且不可撤销。
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
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {classroom.room && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{classroom.room}</span>
            </div>
          )}
          {classroom.instructor && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>{classroom.instructor}</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/teacher/courses/${classroom.courseId}/classrooms/${classroom.id}/cards`
              )
            }
            disabled={isPending}
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            学习卡
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
