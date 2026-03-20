import { getStudentCourses, getStudentCards } from "@/lib/actions/student-data";
import { getStudentDiscussionCards } from "@/lib/actions/discussion-cards";
import { BookOpen } from "lucide-react";
import { CourseCardTabs } from "./course-card-tabs";

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
            <CourseCardTabs
              learningCards={courseCards}
              discussionCards={courseDiscussions}
            />
          </div>
        );
      })}
    </div>
  );
}
