"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
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
import { Send, Square, Loader2 } from "lucide-react";
import {
  getOrCreateSession,
  completeSession,
} from "@/lib/actions/discussion-cards";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";

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
};

type StoredMessage = {
  role: string;
  content: string;
};

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function parseScores(text: string) {
  const patterns = {
    participationScore: /学习参与度[：:]\s*(\d+)/,
    attitudeScore: /学习态度[：:]\s*(\d+)/,
    abilityScore: /学习能力[：:]\s*(\d+)/,
    emotionScore: /学习情感[：:]\s*(\d+)/,
    innovationScore: /创新能力[：:]\s*(\d+)/,
    totalScore: /总分[：:]\s*(\d+)/,
  };

  const scores: Record<string, number> = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) scores[key] = parseInt(match[1]);
  }

  if (!scores.totalScore && Object.keys(scores).length >= 5) {
    scores.totalScore =
      (scores.participationScore || 0) +
      (scores.attitudeScore || 0) +
      (scores.abilityScore || 0) +
      (scores.emotionScore || 0) +
      (scores.innovationScore || 0);
  }

  return scores;
}

function storedToUIMessages(stored: StoredMessage[]): UIMessage[] {
  return stored.map((m, i) => ({
    id: String(i),
    role: m.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

export function DiscussionChat({
  card,
  existingSession,
}: {
  card: DiscussionCard;
  existingSession: Session | null;
}) {
  const [sessionId, setSessionId] = useState<string | null>(
    existingSession?.id ?? null
  );
  const [isCompleted, setIsCompleted] = useState(
    existingSession?.status === "completed"
  );
  const [isEnding, setIsEnding] = useState(false);
  const [input, setInput] = useState("");
  const [scores, setScores] = useState<Record<string, number | null>>({
    participationScore: existingSession?.participationScore ?? null,
    attitudeScore: existingSession?.attitudeScore ?? null,
    abilityScore: existingSession?.abilityScore ?? null,
    emotionScore: existingSession?.emotionScore ?? null,
    innovationScore: existingSession?.innovationScore ?? null,
    totalScore: existingSession?.totalScore ?? null,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialMessages =
    existingSession?.status === "completed" ||
    existingSession?.status === "active"
      ? storedToUIMessages(
          (existingSession.messages as StoredMessage[]) || []
        )
      : [];

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/discussion",
      body: { sessionId },
    }),
    messages: initialMessages,
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Initialize session on mount
  useEffect(() => {
    if (!sessionId && !isCompleted) {
      getOrCreateSession(card.id).then((result) => {
        if ("session" in result && result.session) {
          setSessionId(result.session.id);
        }
      });
    }
  }, [card.id, sessionId, isCompleted]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || isCompleted || isEnding) return;
    setInput("");
    await sendMessage({ text });
  }, [input, isStreaming, isCompleted, isEnding, sendMessage]);

  const handleEndDiscussion = useCallback(async () => {
    if (!sessionId || isStreaming) return;
    setIsEnding(true);

    try {
      const evalPrompt =
        "请结束我们的交流，给出你对我的总体评价，并按照要求的格式给出5个方面的评分。";
      await sendMessage({ text: evalPrompt });
    } catch {
      toast.error("结束交流失败，请重试");
      setIsEnding(false);
    }
  }, [sessionId, isStreaming, sendMessage]);

  // Watch for the end-discussion response to complete
  useEffect(() => {
    if (!isEnding || isStreaming || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const text = getMessageText(lastMessage);
    const parsed = parseScores(text);
    if (Object.keys(parsed).length >= 5 && sessionId) {
      const finalScores = {
        participationScore: parsed.participationScore || 0,
        attitudeScore: parsed.attitudeScore || 0,
        abilityScore: parsed.abilityScore || 0,
        emotionScore: parsed.emotionScore || 0,
        innovationScore: parsed.innovationScore || 0,
        totalScore: parsed.totalScore || 0,
        aiSummary: text,
      };

      const storedMessages = messages.map((m) => ({
        role: m.role,
        content: getMessageText(m),
      }));

      completeSession(sessionId, finalScores, storedMessages).then(
        (result) => {
          if ("error" in result) {
            toast.error(result.error);
          } else {
            setIsCompleted(true);
            setScores({
              participationScore: finalScores.participationScore,
              attitudeScore: finalScores.attitudeScore,
              abilityScore: finalScores.abilityScore,
              emotionScore: finalScores.emotionScore,
              innovationScore: finalScores.innovationScore,
              totalScore: finalScores.totalScore,
            });
            toast.success("交流已结束，评分已保存");
          }
          setIsEnding(false);
        }
      );
    } else {
      setIsEnding(false);
    }
  }, [isEnding, isStreaming, messages, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-base">{card.topic}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          AI交流卡 · 与AI教师讨论交流
        </p>
      </div>

      {/* Score display when completed */}
      {isCompleted && scores.totalScore !== null && (
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium mb-2">交流评分</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              参与度: {scores.participationScore}/{card.participationMaxScore}
            </Badge>
            <Badge variant="outline">
              态度: {scores.attitudeScore}/{card.attitudeMaxScore}
            </Badge>
            <Badge variant="outline">
              能力: {scores.abilityScore}/{card.abilityMaxScore}
            </Badge>
            <Badge variant="outline">
              情感: {scores.emotionScore}/{card.emotionMaxScore}
            </Badge>
            <Badge variant="outline">
              创新: {scores.innovationScore}/{card.innovationMaxScore}
            </Badge>
            <Badge>总分: {scores.totalScore}</Badge>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isCompleted && (
          <div className="text-center text-muted-foreground text-sm py-8">
            开始和AI教师讨论「{card.topic}」吧
          </div>
        )}
        {messages.map((message) => {
          const text = getMessageText(message);
          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <Markdown>{text}</Markdown>
                ) : (
                  <p className="whitespace-pre-wrap">{text}</p>
                )}
              </div>
            </div>
          );
        })}
        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
      </div>

      {/* Input area */}
      {!isCompleted && (
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的想法..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isStreaming || isEnding}
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming || isEnding}
              className="min-h-[44px] min-w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isStreaming || isEnding || messages.length < 2}
                  />
                }
              >
                {isEnding ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    评价中...
                  </span>
                ) : (
                  <>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    结束交流
                  </>
                )}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认结束交流</AlertDialogTitle>
                  <AlertDialogDescription>
                    结束后AI教师将给出总体评价和评分，交流将不可继续。确定要结束吗？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndDiscussion}>
                    确认结束
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
