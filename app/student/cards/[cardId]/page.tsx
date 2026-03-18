import { notFound } from "next/navigation";
import { getCardForStudent } from "@/lib/actions/student-data";
import { AnswerCard } from "@/components/student/answer-card";
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

  const { card, questions, existingAnswers } = data;

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

      <div>
        <h2 className="text-xl font-semibold">{card.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          共 {questions.length} 题，总分 {card.totalScore} 分
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">
          暂无题目
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <AnswerCard
              key={question.id}
              question={question}
              existingAnswer={answerMap.get(question.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
