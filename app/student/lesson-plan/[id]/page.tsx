import { notFound } from "next/navigation";
import { getLessonPlanById } from "@/lib/actions/lesson-plans";
import { LessonPlanViewer } from "./lesson-plan-viewer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function LessonPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getLessonPlanById(id);

  if (!plan) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/student/courses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Link>
      </div>

      <h1 className="text-xl font-semibold">{plan.fileName}</h1>

      <LessonPlanViewer htmlContent={plan.htmlContent} />
    </div>
  );
}
