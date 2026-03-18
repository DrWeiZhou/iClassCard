"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, MapPin, User } from "lucide-react";

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
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

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
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          暂无课堂
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader>
                <CardTitle>
                  {classroom.name || `${classroom.date} 课堂`}
                </CardTitle>
                <CardDescription>
                  <span>{classroom.courseName}</span>
                  <span className="mx-1">·</span>
                  <span>{classroom.date} {classroom.time}</span>
                </CardDescription>
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
                  >
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    学习卡
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
