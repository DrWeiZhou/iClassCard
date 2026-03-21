import { notFound } from "next/navigation";
import { getLessonPlanById } from "@/lib/actions/lesson-plans";
import { LessonPlanViewer } from "./lesson-plan-viewer";

// Cache lesson plan pages — content rarely changes
export const revalidate = 3600;

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
      <h1 className="text-xl font-semibold">{plan.fileName}</h1>
      <LessonPlanViewer htmlContent={plan.htmlContent} />
    </div>
  );
}
