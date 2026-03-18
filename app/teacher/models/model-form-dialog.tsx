"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createModel, updateModel } from "@/lib/actions/models";
import { toast } from "sonner";

type Model = {
  id: string;
  displayName: string;
  modelName: string;
  baseUrl: string;
  apiKey: string;
};

type ModelFormDialogProps = {
  mode: "create" | "edit";
  model?: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModelFormDialog({
  mode,
  model,
  open,
  onOpenChange,
}: ModelFormDialogProps) {
  const isEdit = mode === "edit";

  const boundUpdateModel = model
    ? updateModel.bind(null, model.id)
    : undefined;

  const action = isEdit ? boundUpdateModel! : createModel;

  const [state, formAction, isPending] = useActionState(action, null);
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state && state !== prevStateRef.current) {
      prevStateRef.current = state;
      if ("success" in state && state.success) {
        toast.success(isEdit ? "模型已更新" : "模型已创建");
        onOpenChange(false);
      } else if ("error" in state && state.error) {
        toast.error(state.error);
      }
    }
  }, [state, isEdit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑模型" : "新建模型"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改模型配置信息" : "添加一个新的 LLM 模型配置"}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">模型显示名</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={model?.displayName ?? ""}
              placeholder="例如：GPT-4o"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="modelName">模型名</Label>
            <Input
              id="modelName"
              name="modelName"
              defaultValue={model?.modelName ?? ""}
              placeholder="例如：gpt-4o"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              name="baseUrl"
              type="url"
              defaultValue={model?.baseUrl ?? ""}
              placeholder="例如：https://api.openai.com/v1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              defaultValue=""
              placeholder={isEdit ? "留空不修改" : "请输入 API Key"}
              required={!isEdit}
            />
          </div>

          {state && "error" in state && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              取消
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
