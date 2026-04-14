function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-default-200/60 ${className ?? ""}`} />;
}

export default function UploadLoading() {
  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <Bone className="h-9 w-40" />

      {/* tabs */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>

      {/* tab content area */}
      <div className="space-y-5 pt-2">
        <Bone className="h-5 w-80" />
        <Bone className="h-40 w-full rounded-xl" />
        <div className="flex gap-3">
          <Bone className="h-10 w-32 rounded-md" />
          <Bone className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
