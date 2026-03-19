import { notFound } from "next/navigation";
import { getDiscussionCardForStudent } from "@/lib/actions/discussion-cards";
import { DiscussionChat } from "@/components/student/discussion-chat";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function StudentDiscussionPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const data = await getDiscussionCardForStudent(cardId);

  if (!data) notFound();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-2 p-4 pb-2">
        <Link
          href="/student/courses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Link>
      </div>
      <DiscussionChat card={data.card} existingSession={data.session} />
    </div>
  );
}
