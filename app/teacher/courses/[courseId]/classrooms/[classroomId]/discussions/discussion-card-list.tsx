"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  ArrowLeft,
} from "lucide-react";
import {
  createDiscussionCard,
  updateDiscussionCard,
  deleteDiscussionCard,
  publishDiscussionCard,
} from "@/lib/actions/discussion-cards";
import { toast } from "sonner";

type DiscussionCard = {
  id: string;
  classroomId: string;
  topic: string;
  status: string;
  participationMaxScore: number;
  attitudeMaxScore: number;
  abilityMaxScore: number;
  emotionMaxScore: number;
  innovationMaxScore: number;
  minRounds: number;
  createdAt: Date;
  updatedAt: Date;
};

type FormData = {
  topic: string;
  participationMaxScore: number;
  attitudeMaxScore: number;
  abilityMaxScore: number;
  emotionMaxScore: number;
  innovationMaxScore: number;
  minRounds: number;
};

const defaultFormData: FormData = {
  topic: "",
  participationMaxScore: 20,
  attitudeMaxScore: 20,
  abilityMaxScore: 20,
  emotionMaxScore: 20,
  innovationMaxScore: 20,
  minRounds: 3,
};

export function DiscussionCardList({
  cards,
  courseId,
  classroomId,
  classroomName,
}: {
  cards: DiscussionCard[];
  courseId: string;
  classroomId: string;
  classroomName: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DiscussionCard | null>(null);
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              router.push(`/teacher/courses/${courseId}/classrooms`)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-medium">
            {classroomName} - AI交流卡
            <span className="ml-2 text-sm text-muted-foreground">
              ({cards.length} 张)
            </span>
          </h2>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          新建交流卡
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          暂无AI交流卡，请点击&quot;新建交流卡&quot;添加
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <DiscussionCardItem
              key={card.id}
              card={card}
              courseId={courseId}
              classroomId={classroomId}
              onEdit={setEditingCard}
            />
          ))}
        </div>
      )}

      <DiscussionFormDialog
        mode="create"
        classroomId={classroomId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <DiscussionFormDialog
        mode="edit"
        classroomId={classroomId}
        card={editingCard ?? undefined}
        open={editingCard !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCard(null);
        }}
      />
    </>
  );
}

function DiscussionCardItem({
  card,
  courseId,
  classroomId,
  onEdit,
}: {
  card: DiscussionCard;
  courseId: string;
  classroomId: string;
  onEdit: (card: DiscussionCard) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDraft = card.status === "draft";
  const totalMaxScore =
    card.participationMaxScore +
    card.attitudeMaxScore +
    card.abilityMaxScore +
    card.emotionMaxScore +
    card.innovationMaxScore;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDiscussionCard(card.id);
      if (result.error) toast.error(result.error);
      else toast.success("交流卡已删除");
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishDiscussionCard(card.id);
      if (result.error) toast.error(result.error);
      else toast.success("交流卡已发放");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base line-clamp-2">{card.topic}</CardTitle>
        <CardDescription>
          <Badge
            variant={isDraft ? "secondary" : "default"}
            className={
              isDraft
                ? ""
                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            }
          >
            {isDraft ? "草稿" : "已发放"}
          </Badge>
          <span className="ml-2">满分: {totalMaxScore}</span>
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            {isDraft && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(card)}
                disabled={isPending}
                title="编辑"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>参与度: {card.participationMaxScore}分</span>
          <span>态度: {card.attitudeMaxScore}分</span>
          <span>能力: {card.abilityMaxScore}分</span>
          <span>情感: {card.emotionMaxScore}分</span>
          <span>创新: {card.innovationMaxScore}分</span>
          <span>最少轮次: {card.minRounds}轮</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                    />
                  }
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  发放
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认发放</AlertDialogTitle>
                    <AlertDialogDescription>
                      发放后交流卡将不可编辑，学生将可以看到并开始交流。确定要发放吗？
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePublish}>
                      确认发放
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                    />
                  }
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  删除
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      确定要删除交流卡「{card.topic}」吗？此操作不可撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/teacher/courses/${courseId}/classrooms/${classroomId}/discussions/${card.id}`
              )
            }
            disabled={isPending}
          >
            <Eye className="mr-1.5 h-4 w-4" />
            详情
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscussionFormDialog({
  mode,
  classroomId,
  card,
  open,
  onOpenChange,
}: {
  mode: "create" | "edit";
  classroomId: string;
  card?: DiscussionCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState<FormData>(
    card
      ? {
          topic: card.topic,
          participationMaxScore: card.participationMaxScore,
          attitudeMaxScore: card.attitudeMaxScore,
          abilityMaxScore: card.abilityMaxScore,
          emotionMaxScore: card.emotionMaxScore,
          innovationMaxScore: card.innovationMaxScore,
          minRounds: card.minRounds,
        }
      : defaultFormData
  );
  const [isPending, startTransition] = useTransition();

  // Reset form when card changes
  const cardId = card?.id;
  useEffect(() => {
    if (card) {
      setFormData({
        topic: card.topic,
        participationMaxScore: card.participationMaxScore,
        attitudeMaxScore: card.attitudeMaxScore,
        abilityMaxScore: card.abilityMaxScore,
        emotionMaxScore: card.emotionMaxScore,
        innovationMaxScore: card.innovationMaxScore,
      });
    }
  }, [cardId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDiscussionCard(classroomId, formData)
          : await updateDiscussionCard(cardId!, formData);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(mode === "create" ? "交流卡已创建" : "交流卡已更新");
        if (mode === "create") setFormData(defaultFormData);
        onOpenChange(false);
      }
    });
  }

  function handleChange(field: keyof FormData, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const scoreFields: { key: keyof FormData; label: string }[] = [
    { key: "participationMaxScore", label: "学习参与度满分" },
    { key: "attitudeMaxScore", label: "学习态度满分" },
    { key: "abilityMaxScore", label: "学习能力满分" },
    { key: "emotionMaxScore", label: "学习情感满分" },
    { key: "innovationMaxScore", label: "创新能力满分" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && mode === "create") setFormData(defaultFormData);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "新建AI交流卡" : "编辑AI交流卡"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "设置讨论主题和各项评分满分值"
              : "修改讨论主题和各项评分满分值"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">讨论交流主题</Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => handleChange("topic", e.target.value)}
              placeholder="请输入讨论交流主题"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {scoreFields.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={key}
                  type="number"
                  min={0}
                  max={100}
                  value={formData[key] as number}
                  onChange={(e) =>
                    handleChange(key, parseInt(e.target.value) || 0)
                  }
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="minRounds" className="text-xs">
              最少对话轮次（学生发言不足此轮次无法结束交流）
            </Label>
            <Input
              id="minRounds"
              type="number"
              min={1}
              max={50}
              value={formData.minRounds}
              onChange={(e) =>
                handleChange("minRounds", parseInt(e.target.value) || 1)
              }
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              取消
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? mode === "create"
                  ? "创建中..."
                  : "保存中..."
                : mode === "create"
                  ? "创建"
                  : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
