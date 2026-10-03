import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/60 backdrop-blur-sm ${className}`}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 w-full animate-fade-in-up">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-5 w-96 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/50 p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-16 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Tables Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white/50 border border-slate-100 rounded-3xl overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50">
              <Skeleton className="h-6 w-48 rounded-lg" />
            </div>
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-5 px-8 flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40 rounded-lg" />
                    <Skeleton className="h-4 w-24 rounded-lg" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="h-5 w-16 rounded-lg ml-auto" />
                    <Skeleton className="h-6 w-20 rounded-lg ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
