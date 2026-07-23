export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="mt-3 text-slate-500 text-sm">Chargement...</p>
      </div>
    </div>
  );
}
