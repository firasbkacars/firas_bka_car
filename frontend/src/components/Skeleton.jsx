export function Skeleton({ className = '', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-white/[0.06] rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-neutral-800/50">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-5 py-3.5">
              <Skeleton className="h-3.5" style={{ width: c === 0 ? 40 : undefined }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
