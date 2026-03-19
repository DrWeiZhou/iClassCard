import { getStudentCourses, getStudentCards } from "@/lib/actions/student-data";
import { getStudentDiscussionCards } from "@/lib/actions/discussion-cards";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, MessageCircle } from "lucide-react";
import Link from "next/link";

export default async function StudentCoursesPage() {
  const [courses, cards, discussionCards] = await Promise.all([
    getStudentCourses(),
    getStudentCards(),
    getStudentDiscussionCards(),
  ]);

  // Group cards by courseId
  const cardsByCourse = new Map<string, typeof cards>();
  for (const card of cards) {
    const existing = cardsByCourse.get(card.courseId) ?? [];
    existing.push(card);
    cardsByCourse.set(card.courseId, existing);
  }

  // Group discussion cards by courseId
  const discussionsByCourse = new Map<string, typeof discussionCards>();
  for (const dc of discussionCards) {
    const existing = discussionsByCourse.get(dc.courseId) ?? [];
    existing.push(dc);
    discussionsByCourse.set(dc.courseId, existing);
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <BookOpen className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">暂无课程</p>
        <p className="text-sm mt-1">你还没有被加入任何课程</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">我的课程</h2>
      {courses.map((course) => {
        const courseCards = cardsByCourse.get(course.courseId) ?? [];
        const courseDiscussions = discussionsByCourse.get(course.courseId) ?? [];
        return (
          <div key={course.courseId} className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">{course.courseName}</h3>
              <span className="text-xs text-muted-foreground">
                {course.year} {course.semester}
              </span>
            </div>
            {courseCards.length === 0 && courseDiscussions.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-6">暂无学习卡</p>
            ) : (
              <div className="grid gap-3">
                {courseCards.map((card) => (
                  <Link
                    key={card.cardId}
                    href={`/student/cards/${card.cardId}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-muted/50" size="sm">
                      <CardHeader>
                        <CardTitle>{card.cardName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {card.classroomDate}
                        </CardDescription>
                        <CardAction>
                          <Badge variant={card.answered ? "default" : "secondary"}>
                            {card.answered ? "已作答" : "未作答"}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
                {courseDiscussions.map((dc) => (
                  <Link
                    key={dc.cardId}
                    href={`/student/discussions/${dc.cardId}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-muted/50" size="sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-1.5">
                          <MessageCircle className="h-4 w-4 text-blue-500 shrink-0" />
                          {dc.topic}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dc.classroomDate}
                        </CardDescription>
                        <CardAction>
                          <Badge
                            variant={
                              dc.sessionStatus === "completed"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {dc.sessionStatus === "completed"
                              ? `已完成 ${dc.totalScore ?? ""}分`
                              : dc.sessionStatus === "active"
                                ? "交流中"
                                : "未开始"}
                          </Badge>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
