function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-default-200/60 ${className ?? ""}`} />;
}

export default function SettingsLoading() {
  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <Bone className="h-8 w-28" />
        <Bone className="h-8 w-20 rounded-md" />
      </div>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {["账户", "主类别", "子类别", "预算计划", "规则"].map((_, i) => (
          <Bone key={i} className="h-10 w-20 shrink-0 rounded-md" />
        ))}
      </div>

      {/* tab content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Bone className="h-5 w-32" />
          <Bone className="h-8 w-24 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-default-200/60 p-4"
            >
              <Bone className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-48" />
              </div>
              <Bone className="h-8 w-16 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
