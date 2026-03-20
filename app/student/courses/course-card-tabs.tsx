"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface LearningCard {
  cardId: string;
  cardName: string;
  classroomDate: string;
  answered: boolean;
}

interface DiscussionCard {
  cardId: string;
  topic: string;
  classroomDate: string;
  sessionStatus: string | null;
  totalScore: number | null;
}

export function CourseCardTabs({
  learningCards,
  discussionCards,
}: {
  learningCards: LearningCard[];
  discussionCards: DiscussionCard[];
}) {
  const [activeTab, setActiveTab] = useState<"learning" | "discussion">("learning");

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab("learning")}
          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
            activeTab === "learning"
              ? "bg-black text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          AI学习卡
        </button>
        <button
          onClick={() => setActiveTab("discussion")}
          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
            activeTab === "discussion"
              ? "bg-black text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          AI交流卡
        </button>
      </div>

      {activeTab === "learning" ? (
        learningCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无学习卡</p>
        ) : (
          <div className="grid gap-3">
            {learningCards.map((card) => (
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
          </div>
        )
      ) : (
        discussionCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无交流卡</p>
        ) : (
          <div className="grid gap-3">
            {discussionCards.map((dc) => (
              <Link
                key={dc.cardId}
                href={`/student/discussions/${dc.cardId}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-muted/50" size="sm">
                  <CardHeader>
                    <CardTitle>{dc.topic}</CardTitle>
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
        )
      )}
    </div>
  );
}
