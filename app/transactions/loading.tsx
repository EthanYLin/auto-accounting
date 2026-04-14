function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-default-200/60 ${className ?? ""}`} />;
}

export default function TransactionsLoading() {
  return (
    <div className="flex flex-1 w-full min-h-0 overflow-hidden">
      {/* sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-divider p-3 gap-3">
        <Bone className="h-9 w-full" />
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bone key={i} className="h-14 w-full" />
          ))}
        </div>
      </aside>

      {/* main */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-divider px-5 py-2.5 flex items-center gap-2">
          <Bone className="h-8 w-8 rounded-md" />
          <Bone className="h-5 w-32" />
          <div className="ml-auto flex gap-2">
            <Bone className="h-8 w-20 rounded-md" />
            <Bone className="h-8 w-20 rounded-md" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <Bone className="h-10 w-full" />
          <div className="space-y-4">
            <Bone className="h-4 w-24" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Bone className="h-10 w-full" />
              <Bone className="h-10 w-full" />
              <Bone className="h-10 w-full" />
              <Bone className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <Bone className="h-4 w-24" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Bone className="h-32 w-full" />
              <Bone className="h-32 w-full" />
              <Bone className="h-32 w-full" />
              <Bone className="h-32 w-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
