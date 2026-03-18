"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { deleteModel, setDefaultModel } from "@/lib/actions/models";
import { toast } from "sonner";
import { ModelFormDialog } from "./model-form-dialog";

type Model = {
  id: string;
  teacherId: string;
  displayName: string;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  isDefault: boolean;
  createdAt: Date;
};

export function ModelTable({ models }: { models: Model[] }) {
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        暂无模型配置，请点击&quot;新建模型&quot;添加
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>模型显示名</TableHead>
            <TableHead>模型名</TableHead>
            <TableHead>Base URL</TableHead>
            <TableHead>API Key</TableHead>
            <TableHead>默认</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              onEdit={() => setEditingModel(model)}
            />
          ))}
        </TableBody>
      </Table>

      <ModelFormDialog
        mode="edit"
        model={editingModel ?? undefined}
        open={editingModel !== null}
        onOpenChange={(open) => {
          if (!open) setEditingModel(null);
        }}
      />
    </>
  );
}

function ModelRow({
  model,
  onEdit,
}: {
  model: Model;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSetDefault() {
    startTransition(async () => {
      const result = await setDefaultModel(model.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("已设为默认模型");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteModel(model.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("模型已删除");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{model.displayName}</TableCell>
      <TableCell>{model.modelName}</TableCell>
      <TableCell className="max-w-[200px] truncate">{model.baseUrl}</TableCell>
      <TableCell>****</TableCell>
      <TableCell>
        {model.isDefault && <Badge>默认</Badge>}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isPending}
          >
            编辑
          </Button>
          {!model.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetDefault}
              disabled={isPending}
            >
              设为默认
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="sm" disabled={isPending} />
              }
            >
              删除
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除模型&quot;{model.displayName}&quot;吗？此操作不可撤销。
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
        </div>
      </TableCell>
    </TableRow>
  );
}
