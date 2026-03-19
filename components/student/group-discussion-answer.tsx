"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { getDeviceType } from "@/lib/utils";
import {
  searchCourseStudents,
  submitGroupRating,
  getGroupRatings,
} from "@/lib/actions/group-ratings";

type Member = {
  id: string;
  studentNo: string;
  name: string;
  stars: number;
  submitted: boolean;
};

type SearchResult = {
  id: string;
  studentNo: string;
  name: string;
};

export function GroupDiscussionAnswer({
  questionId,
  cardId,
  onScoreUpdate,
}: {
  questionId: string;
  cardId: string;
  onScoreUpdate?: (questionId: string, score: number) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [loaded, setLoaded] = useState(false);

  // Load existing ratings on first render
  if (!loaded) {
    setLoaded(true);
    getGroupRatings(questionId).then((ratings) => {
      if (ratings.length > 0) {
        setMembers(
          ratings.map((r) => ({
            id: r.targetStudentId,
            studentNo: r.targetStudentNo,
            name: r.targetStudentName,
            stars: r.stars,
            submitted: true,
          }))
        );
      }
    });
  }

  function handleSearch(keyword: string) {
    setSearchText(keyword);
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    startSearch(async () => {
      const results = await searchCourseStudents(cardId, keyword);
      // Filter out already-added members
      const memberIds = new Set(members.map((m) => m.id));
      setSearchResults(results.filter((r) => !memberIds.has(r.id)));
    });
  }

  function handleAddMember(student: SearchResult) {
    setMembers((prev) => [
      ...prev,
      { ...student, stars: 0, submitted: false },
    ]);
    setSearchText("");
    setSearchResults([]);
  }

  function handleStarClick(memberId: string, stars: number) {
    const member = members.find((m) => m.id === memberId);
    if (!member || member.submitted) return;

    // Update stars in UI immediately
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, stars } : m))
    );

    // Submit rating
    startSubmit(async () => {
      const result = await submitGroupRating(questionId, memberId, stars, getDeviceType());
      if (result.error) {
        toast.error(result.error);
        // Revert stars
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, stars: 0 } : m))
        );
        return;
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, stars, submitted: true } : m
        )
      );
      toast.success("评分已保存");
      if (result.score !== null && result.score !== undefined) {
        onScoreUpdate?.(questionId, result.score);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Search and add members */}
      <div>
        <Input
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="输入学号或姓名搜索组员"
          className="min-h-[44px]"
        />
        {isSearching && (
          <div className="text-xs text-muted-foreground mt-1">
            搜索中...
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="mt-1 rounded-lg border bg-background shadow-sm max-h-[200px] overflow-y-auto">
            {searchResults.map((student) => (
              <button
                key={student.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors touch-manipulation"
                onClick={() => handleAddMember(student)}
              >
                <span className="font-medium">{student.name}</span>
                <span className="text-muted-foreground">
                  {student.studentNo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Member list with ratings */}
      {members.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">
            组员列表（{members.length} 人）
          </div>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">{member.name}</div>
                <div className="text-xs text-muted-foreground">
                  {member.studentNo}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={member.submitted || isSubmitting}
                    className="p-1 touch-manipulation disabled:cursor-not-allowed transition-transform active:scale-110"
                    onClick={() => handleStarClick(member.id, rating)}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        rating <= member.stars
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
                {member.submitted && (
                  <span className="ml-2 text-xs text-green-600">已评</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
