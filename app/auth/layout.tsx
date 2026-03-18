export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-full flex items-center justify-center px-4 sm:px-6 py-8 sm:py-10 overflow-y-auto">
      {children}
    </div>
  );
}
