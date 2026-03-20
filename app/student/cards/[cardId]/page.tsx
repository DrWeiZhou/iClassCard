import { notFound } from "next/navigation";
import { getCardForStudent } from "@/lib/actions/student-data";
import { StudentCardContent } from "@/components/student/student-card-content";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function StudentCardPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const data = await getCardForStudent(cardId);

  if (!data) notFound();

  const { card, questions, existingAnswers, ratingSettings } = data;

  // Build a map of questionId -> existing answer
  const answerMap = new Map(
    existingAnswers.map((a) => [a.questionId, a])
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-2">
        <Link
          href="/student/courses"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Link>
      </div>

      <StudentCardContent
        cardName={card.name}
        totalScore={card.totalScore}
        questions={questions}
        answerMap={answerMap}
        ratingSettings={{
          high: ratingSettings.cardHigh,
          mid: ratingSettings.cardMid,
          low: ratingSettings.cardLow,
        }}
      />
    </div>
  );
}
