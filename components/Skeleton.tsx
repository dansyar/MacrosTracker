type Props = {
  className?: string;
};

export function Skeleton({ className = "" }: Props) {
  return (
    <div
      className={`bg-bg-elevated rounded-md animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonText({ className = "" }: Props) {
  return <Skeleton className={`h-3 ${className}`} />;
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return <div className="card space-y-3">{children}</div>;
}
