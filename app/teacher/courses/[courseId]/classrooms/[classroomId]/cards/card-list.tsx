"use client";

import { useState, useTransition } from "react";
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
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { createCard, deleteCard, publishCard } from "@/lib/actions/cards";
import { toast } from "sonner";

type LearningCard = {
  id: string;
  classroomId: string;
  name: string;
  status: string;
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
};

export function CardList({
  cards,
  courseId,
  classroomId,
  classroomName,
}: {
  cards: LearningCard[];
  courseId: string;
  classroomId: string;
  classroomName: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
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
            {classroomName} - 学习卡
            <span className="ml-2 text-sm text-muted-foreground">
              ({cards.length} 张)
            </span>
          </h2>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          新建学习卡
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          暂无学习卡，请点击&quot;新建学习卡&quot;添加
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              courseId={courseId}
              classroomId={classroomId}
            />
          ))}
        </div>
      )}

      <CreateCardDialog
        classroomId={classroomId}
        defaultName={classroomName}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}

function CardItem({
  card,
  courseId,
  classroomId,
}: {
  card: LearningCard;
  courseId: string;
  classroomId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDraft = card.status === "draft";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("学习卡已删除");
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishCard(card.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("学习卡已发放");
      }
    });
  }

  function handleEdit() {
    router.push(
      `/teacher/courses/${courseId}/classrooms/${classroomId}/cards/${card.id}/edit`
    );
  }

  function handleAnalysis() {
    router.push(
      `/teacher/courses/${courseId}/classrooms/${classroomId}/cards/${card.id}/analysis`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{card.name}</CardTitle>
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
          <span className="ml-2">总分: {card.totalScore}</span>
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-1">
            {isDraft && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleEdit}
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
                      发放后学习卡将不可编辑，学生将可以看到并作答。确定要发放吗？
                      {card.totalScore !== 100 && (
                        <span className="mt-2 block text-destructive">
                          注意：当前总分为{card.totalScore}
                          分，总分必须为100分才能发放。
                        </span>
                      )}
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
                      确定要删除学习卡「{card.name}」吗？此操作将同时删除所有题目数据，且不可撤销。
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
            onClick={handleAnalysis}
            disabled={isPending}
          >
            <BarChart3 className="mr-1.5 h-4 w-4" />
            分析
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCardDialog({
  classroomId,
  defaultName,
  open,
  onOpenChange,
}: {
  classroomId: string;
  defaultName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cardName = name.trim() || defaultName;
    startTransition(async () => {
      const result = await createCard(classroomId, cardName);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("学习卡已创建");
        setName("");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setName("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建学习卡</DialogTitle>
          <DialogDescription>请输入学习卡名称</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-name">名称</Label>
            <Input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              取消
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
