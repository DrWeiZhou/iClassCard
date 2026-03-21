export default function LessonPlanLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="h-7 bg-muted rounded w-1/3" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/6" />
      </div>
      <div className="h-40 bg-muted rounded w-full" />
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    </div>
  );
}
