"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveRatingSettings, type RatingSettings } from "@/lib/actions/templates";

type RangeKey = keyof RatingSettings;

const CARD_ROWS: { key: RangeKey; label: string }[] = [
  { key: "cardHigh", label: "高评级" },
  { key: "cardMid", label: "中评级" },
  { key: "cardLow", label: "低评级" },
];

const DISCUSSION_ROWS: { key: RangeKey; label: string }[] = [
  { key: "discussionHigh", label: "高评级" },
  { key: "discussionMid", label: "中评级" },
  { key: "discussionLow", label: "低评级" },
];

function validate(settings: RatingSettings): string | null {
  // Check card ranges don't overlap
  const cardRanges = [settings.cardHigh, settings.cardMid, settings.cardLow];
  for (const [min, max] of cardRanges) {
    if (min < 0 || max > 100 || min > max) return "AI答题卡区间值不合法";
  }
  if (hasOverlap(cardRanges)) return "AI答题卡各级别区间不能重叠";

  // Check discussion ranges don't overlap
  const discRanges = [settings.discussionHigh, settings.discussionMid, settings.discussionLow];
  for (const [min, max] of discRanges) {
    if (min < 0 || max > 100 || min > max) return "AI交流卡区间值不合法";
  }
  if (hasOverlap(discRanges)) return "AI交流卡各级别区间不能重叠";

  return null;
}

function hasOverlap(ranges: [number, number][]): boolean {
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const [aMin, aMax] = ranges[i];
      const [bMin, bMax] = ranges[j];
      if (aMin <= bMax && bMin <= aMax) return true;
    }
  }
  return false;
}

export function RatingSettingsEditor({
  initialSettings,
}: {
  initialSettings: RatingSettings;
}) {
  const [settings, setSettings] = useState<RatingSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();

  function updateRange(key: RangeKey, index: 0 | 1, value: string) {
    const num = parseInt(value) || 0;
    setSettings((prev) => ({
      ...prev,
      [key]: index === 0 ? [num, prev[key][1]] : [prev[key][0], num],
    }));
  }

  function handleSave() {
    const error = validate(settings);
    if (error) {
      toast.error(error);
      return;
    }
    startTransition(async () => {
      const result = await saveRatingSettings(settings);
      if (result.success) {
        toast.success("评级设置已保存");
      }
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium mb-2">AI答题卡评级区间</p>
        <div className="space-y-2">
          {CARD_ROWS.map(({ key, label }) => (
            <RangeRow
              key={key}
              label={label}
              range={settings[key]}
              onChange={(idx, val) => updateRange(key, idx, val)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">AI交流卡评级区间</p>
        <div className="space-y-2">
          {DISCUSSION_ROWS.map(({ key, label }) => (
            <RangeRow
              key={key}
              label={label}
              range={settings[key]}
              onChange={(idx, val) => updateRange(key, idx, val)}
            />
          ))}
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending ? "保存中..." : "保存设置"}
      </Button>
    </div>
  );
}

function RangeRow({
  label,
  range,
  onChange,
}: {
  label: string;
  range: [number, number];
  onChange: (index: 0 | 1, value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0">{label}</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={range[0]}
        onChange={(e) => onChange(0, e.target.value)}
        className="w-20 h-8"
      />
      <span className="text-muted-foreground">—</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={range[1]}
        onChange={(e) => onChange(1, e.target.value)}
        className="w-20 h-8"
      />
    </div>
  );
}
