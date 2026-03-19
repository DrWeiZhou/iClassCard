"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/ui/markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft } from "lucide-react";
import { updateSessionScores } from "@/lib/actions/discussion-cards";
import { toast } from "sonner";

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
  const [editingSession, setEditingSession] = useState<Session | null>(null);

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
                    <div className="flex items-center justify-center gap-1">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSession(s);
                        }}
                      >
                        确认修改
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View conversation dialog */}
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
                      {msg.role === "assistant" ? (
                        <Markdown>{msg.content}</Markdown>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              {viewingSession?.session.aiSummary && (
                <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    AI 总评
                  </p>
                  <div className="text-sm">
                    <Markdown>{viewingSession.session.aiSummary}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit scores dialog */}
      {editingSession && (
        <EditScoresDialog
          session={editingSession}
          card={card}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingSession(null);
          }}
        />
      )}
    </>
  );
}

function EditScoresDialog({
  session,
  card,
  open,
  onOpenChange,
}: {
  session: Session;
  card: DiscussionCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [participation, setParticipation] = useState(
    session.session.participationScore ?? 0
  );
  const [attitude, setAttitude] = useState(
    session.session.attitudeScore ?? 0
  );
  const [ability, setAbility] = useState(
    session.session.abilityScore ?? 0
  );
  const [emotion, setEmotion] = useState(
    session.session.emotionScore ?? 0
  );
  const [innovation, setInnovation] = useState(
    session.session.innovationScore ?? 0
  );
  const [isPending, startTransition] = useTransition();

  const total = participation + attitude + ability + emotion + innovation;

  const fields = [
    { label: "学习参与度", value: participation, set: setParticipation, max: card.participationMaxScore },
    { label: "学习态度", value: attitude, set: setAttitude, max: card.attitudeMaxScore },
    { label: "学习能力", value: ability, set: setAbility, max: card.abilityMaxScore },
    { label: "学习情感", value: emotion, set: setEmotion, max: card.emotionMaxScore },
    { label: "创新能力", value: innovation, set: setInnovation, max: card.innovationMaxScore },
  ];

  function handleSave() {
    startTransition(async () => {
      const result = await updateSessionScores(session.session.id, {
        participationScore: participation,
        attitudeScore: attitude,
        abilityScore: ability,
        emotionScore: emotion,
        innovationScore: innovation,
        totalScore: total,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("评分已更新");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            修改评分 — {session.studentName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map(({ label, value, set, max }) => (
            <div key={label} className="flex items-center gap-3">
              <Label className="w-20 shrink-0 text-right text-xs">
                {label}
              </Label>
              <Input
                type="number"
                min={0}
                max={max}
                value={value}
                onChange={(e) => set(parseInt(e.target.value) || 0)}
                className="w-20"
              />
              <span className="text-xs text-muted-foreground">/ {max}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Label className="w-20 shrink-0 text-right text-sm font-medium">
              总分
            </Label>
            <span className="text-sm font-medium">{total}</span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            取消
          </DialogClose>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
