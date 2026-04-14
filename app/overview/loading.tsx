function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-default-200/60 ${className ?? ""}`} />;
}

export default function OverviewLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <Bone className="h-8 w-24" />

      <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg bg-content1 p-2">
        {/* toolbar */}
        <div className="px-1 py-1 space-y-3">
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Bone className="h-8 w-28 rounded-md" />
            <Bone className="h-8 w-28 rounded-md" />
            <Bone className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Bone className="h-9 flex-1" />
            <Bone className="h-9 w-20 shrink-0 rounded-md" />
          </div>
        </div>

        {/* grid header */}
        <div className="flex gap-1 px-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-8 flex-1" />
          ))}
        </div>

        {/* grid rows */}
        <div className="flex flex-col gap-1 px-2 flex-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 6 }).map((_, j) => (
                <Bone key={j} className="h-9 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
