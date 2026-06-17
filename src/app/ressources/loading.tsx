export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar skeleton */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 h-fit">
            <div className="h-6 bg-slate-200 rounded w-1/2 mb-4 animate-pulse"></div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded mb-2 animate-pulse"></div>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="aspect-[4/3] bg-slate-100 animate-pulse"></div>
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-slate-100 rounded animate-pulse"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}