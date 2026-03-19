"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";

type DiscussionCard = {
  id: string;
  topic: string;
  status: string;
  participationMaxScore: number;
  attitudeMaxScore: number;
  abilityMaxScore: number;
  emotionMaxScore: number;
  innovationMaxScore: number;
};

type Session = {
  session: {
    id: string;
    cardId: string;
    studentId: string;
    messages: unknown;
    status: string;
    participationScore: number | null;
    attitudeScore: number | null;
    abilityScore: number | null;
    emotionScore: number | null;
    innovationScore: number | null;
    totalScore: number | null;
    aiSummary: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  studentName: string;
  studentNo: string;
};

type Message = {
  role: string;
  content: string;
};

export function DiscussionDetail({
  card,
  sessions,
  courseId,
  classroomId,
}: {
  card: DiscussionCard;
  sessions: Session[];
  courseId: string;
  classroomId: string;
}) {
  const router = useRouter();
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const completedCount = sessions.filter(
    (s) => s.session.status === "completed"
  ).length;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() =>
            router.push(
              `/teacher/courses/${courseId}/classrooms/${classroomId}/discussions`
            )
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-medium">{card.topic}</h2>
          <p className="text-sm text-muted-foreground">
            已完成交流: {completedCount} / {sessions.length} 人
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          暂无学生参与交流
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">学号</th>
                <th className="px-4 py-2 text-left font-medium">姓名</th>
                <th className="px-4 py-2 text-left font-medium">状态</th>
                <th className="px-4 py-2 text-center font-medium">参与度</th>
                <th className="px-4 py-2 text-center font-medium">态度</th>
                <th className="px-4 py-2 text-center font-medium">能力</th>
                <th className="px-4 py-2 text-center font-medium">情感</th>
                <th className="px-4 py-2 text-center font-medium">创新</th>
                <th className="px-4 py-2 text-center font-medium">总分</th>
                <th className="px-4 py-2 text-center font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.session.id}
                  className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setViewingSession(s)}
                >
                  <td className="px-4 py-2">{s.studentNo}</td>
                  <td className="px-4 py-2">{s.studentName}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={
                        s.session.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {s.session.status === "completed"
                        ? "已完成"
                        : "交流中"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.session.participationScore ?? "-"}/{card.participationMaxScore}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.session.attitudeScore ?? "-"}/{card.attitudeMaxScore}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.session.abilityScore ?? "-"}/{card.abilityMaxScore}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.session.emotionScore ?? "-"}/{card.emotionMaxScore}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.session.innovationScore ?? "-"}/{card.innovationMaxScore}
                  </td>
                  <td className="px-4 py-2 text-center font-medium">
                    {s.session.totalScore ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingSession(s);
                      }}
                    >
                      查看对话
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={viewingSession !== null}
        onOpenChange={(open) => {
          if (!open) setViewingSession(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {viewingSession?.studentName} 的对话记录
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {viewingSession &&
                (
                  (viewingSession.session.messages as Message[]) || []
                ).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              {viewingSession?.session.aiSummary && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    AI 总评
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {viewingSession.session.aiSummary}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
