"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { Send, Loader2 } from "lucide-react";
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
  ratingSettings,
}: {
  card: DiscussionCard;
  existingSession: Session | null;
  ratingSettings?: { high: [number, number]; mid: [number, number]; low: [number, number] };
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Use a ref so the transport body always reads the latest sessionId
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const initialMessages =
    existingSession?.status === "completed" ||
    existingSession?.status === "active"
      ? storedToUIMessages(
          (existingSession.messages as StoredMessage[]) || []
        )
      : [];

  // Stable transport — body is a function that reads from ref
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/discussion",
        body: () => ({ sessionId: sessionIdRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({
    transport,
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
    if (!text || isStreaming || isCompleted || isEnding || !sessionId) return;
    setInput("");
    await sendMessage({ text });
  }, [input, isStreaming, isCompleted, isEnding, sessionId, sendMessage]);

  const handleEndDiscussion = useCallback(async () => {
    if (!sessionId || isStreaming) return;
    setConfirmOpen(false);
    setIsEnding(true);
    // Record message count BEFORE sending, so we know which response is the eval
    evalMsgCountRef.current = messages.length;
    hasStreamedRef.current = false;

    try {
      const evalPrompt =
        "请结束我们的交流，给出你对我的总体评价，并按照要求的格式给出5个方面的评分。";
      await sendMessage({ text: evalPrompt });
    } catch {
      toast.error("结束交流失败，请重试");
      setIsEnding(false);
    }
  }, [sessionId, isStreaming, sendMessage, messages.length]);

  // Track the message count when eval was requested, and whether streaming has occurred
  const evalMsgCountRef = useRef(0);
  const hasStreamedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Track that streaming has started so we don't fire prematurely
  useEffect(() => {
    if (isEnding && isStreaming) {
      hasStreamedRef.current = true;
    }
  }, [isEnding, isStreaming]);

  // Watch for the end-discussion response to complete
  useEffect(() => {
    if (!isEnding || isStreaming || isSavingRef.current) return;
    // Don't fire until streaming has actually happened at least once
    if (!hasStreamedRef.current) return;

    // Find the assistant message that came AFTER the eval prompt
    // evalMsgCountRef.current = messages.length before sendMessage was called
    // After sendMessage: user msg at index evalMsgCountRef, assistant at evalMsgCountRef+1
    const evalAssistantIdx = evalMsgCountRef.current + 1;
    if (messages.length <= evalAssistantIdx) return;

    const evalMessage = messages[evalAssistantIdx];
    if (evalMessage.role !== "assistant") return;

    const text = getMessageText(evalMessage);
    if (text.length < 10) return;

    isSavingRef.current = true;

    const parsed = parseScores(text);
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

    if (sessionId) {
      completeSession(sessionId, finalScores, storedMessages).then(
        (result) => {
          if ("error" in result) {
            toast.error(result.error);
            isSavingRef.current = false;
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
        }
      );
    }
  }, [isEnding, isStreaming, messages, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const inputDisabled = isStreaming || isEnding || isCompleted || !sessionId;

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
          {(() => {
            if (!ratingSettings || scores.totalScore == null) return null;
            const maxTotal = card.participationMaxScore + card.attitudeMaxScore + card.abilityMaxScore + card.emotionMaxScore + card.innovationMaxScore;
            const pct = maxTotal > 0 ? Math.round(((scores.totalScore as number) / maxTotal) * 100) : 0;
            let level: string | null = null;
            if (pct >= ratingSettings.high[0] && pct <= ratingSettings.high[1]) level = "高级";
            else if (pct >= ratingSettings.mid[0] && pct <= ratingSettings.mid[1]) level = "中级";
            else if (pct >= ratingSettings.low[0] && pct <= ratingSettings.low[1]) level = "初级";
            return level ? (
              <p className="text-sm font-medium text-green-600 mt-2">
                建议您完成{level}个性化测试
              </p>
            ) : null;
          })()}
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
              placeholder={isEnding ? "AI教师评价中..." : "输入你的想法..."}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={inputDisabled}
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || inputDisabled}
              className="min-h-[44px] min-w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              disabled={isStreaming || isEnding || messages.length < 2}
              onClick={() => setConfirmOpen(true)}
            >
              {isEnding ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  评价中...
                </span>
              ) : (
                <>
                  结束交流提交打分
                </>
              )}
            </Button>
          </div>

          {/* Confirmation dialog — controlled open state */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-lg">
                <h3 className="text-lg font-semibold">确认结束交流</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  结束后AI教师将给出总体评价和评分，交流将不可继续。确定要结束吗？
                </p>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmOpen(false)}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={handleEndDiscussion}>
                    确认结束
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
