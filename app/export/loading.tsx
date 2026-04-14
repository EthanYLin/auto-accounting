function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-default-200/60 ${className ?? ""}`} />;
}

export default function ExportLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-6 gap-7">
      {/* header */}
      <div className="space-y-2">
        <Bone className="h-9 w-40" />
        <Bone className="h-5 w-64" />
      </div>

      {/* stats + export card */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:items-start">
        <div className="flex flex-col gap-6 border-y border-default-200/80 py-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start justify-between gap-3 pl-2">
              <div className="space-y-2 flex-1">
                <Bone className="h-3 w-24" />
                <Bone className="h-8 w-16" />
                <Bone className="h-3 w-48" />
              </div>
              <Bone className="h-8 w-8 rounded-xl shrink-0" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-5 rounded-[28px] border border-default-200/70 bg-default-50/35 p-5">
          <Bone className="h-4 w-20" />
          <Bone className="h-10 w-full" />
          <div className="space-y-3 border-t border-default-200/80 pt-4">
            <Bone className="h-5 w-40" />
            <Bone className="h-10 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
