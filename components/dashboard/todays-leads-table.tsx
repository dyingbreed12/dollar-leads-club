'use client';

import { useState } from 'react';
import { LeadResponseDTO } from '@/types/lead.types';
import { LeadCard } from './lead-card';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface TodaysLeadsTableProps {
  leads: LeadResponseDTO[];
  showRecording?: boolean;
}

type ViewMode = 'grid' | 'list';

export function TodaysLeadsTable({ leads, showRecording = false }: TodaysLeadsTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const isMobile = useIsMobile();

  if (leads.length === 0) {
    return (
      <div className={cn(
        "text-center py-8 text-muted-foreground",
        isMobile ? "text-sm" : "text-base"
      )}>
        No leads to display
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex items-center gap-0.5 md:gap-1 border rounded-lg p-0.5 md:p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn(
              "min-h-9",
              isMobile ? "h-8 px-2 text-xs" : "h-8 px-3 text-sm"
            )}
          >
            <List className={cn(isMobile ? "size-3.5 mr-1" : "size-4 mr-2")} />
            List
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "min-h-9",
              isMobile ? "h-8 px-2 text-xs" : "h-8 px-3 text-sm"
            )}
          >
            <LayoutGrid className={cn(isMobile ? "size-3.5 mr-1" : "size-4 mr-2")} />
            Grid
          </Button>
        </div>
      </div>

      {/* Leads Display */}
      <div className={cn(
        "grid gap-3 md:gap-4",
        viewMode === 'grid'
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
          : 'grid-cols-1 lg:grid-cols-1 xl:grid-cols-2'
      )}>
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            showRecording={showRecording}
            layout={viewMode}
          />
        ))}
      </div>
    </div>
  );
}
