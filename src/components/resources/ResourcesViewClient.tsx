'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import ViewToggle, { ViewMode } from './ViewToggle';

export default function ResourcesViewClient({
  currentView,
  sp,
}: {
  currentView: ViewMode;
  sp: Record<string, any>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleViewChange = (mode: ViewMode) => {
    // Update localStorage
    try {
      localStorage.setItem('resources-view', mode);
    } catch {}
    // Update URL
    const params = new URLSearchParams(searchParams);
    if (mode === 'grid') params.delete('view');
    else params.set('view', mode);
    startTransition(() => {
      router.push(`/ressources?${params.toString()}`);
    });
  };

  return (
    <ViewToggle mode={currentView} onChange={handleViewChange} />
  );
}
