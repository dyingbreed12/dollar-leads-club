'use client';

import { useState } from 'react';
import { LeadBatchWithUser } from '@/types/lead-batch.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTimezone } from '@/hooks/use-timezone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Eye, Download, FileText, Calendar, Database, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface LeadBatchesTableProps {
  batches: LeadBatchWithUser[];
}

export function LeadBatchesTable({ batches }: LeadBatchesTableProps) {
  const [selectedBatch, setSelectedBatch] = useState<LeadBatchWithUser | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Use timezone hook for date formatting
  const { formatDate, formatDateTime } = useTimezone();

  const handleViewBatch = (batch: LeadBatchWithUser) => {
    setSelectedBatch(batch);
    setIsSheetOpen(true);
  };

  const getTypeBadge = (type: string) => {
    if (type === 'diamond-lead') {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Diamond</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Dollar</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Imported</TableHead>
              <TableHead className="text-right">Skipped</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No lead batches found
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.batch_name}</TableCell>
                  <TableCell>{getTypeBadge(batch.type)}</TableCell>
                  <TableCell className="text-right">{batch.total_leads}</TableCell>
                  <TableCell className="text-right">{batch.imported_leads}</TableCell>
                  <TableCell className="text-right">{batch.skipped_duplicates}</TableCell>
                  <TableCell>
                    <span className="text-xs font-mono truncate max-w-[150px] block">
                      {batch.file_name}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(batch.created_at)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBatch(batch)}
                      title="View batch details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Batch Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedBatch && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {selectedBatch.batch_name}
                </SheetTitle>
                <SheetDescription>
                  Lead batch details and import information
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 px-5">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Batch ID</span>
                      <span className="text-sm font-mono">{selectedBatch.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type</span>
                      {getTypeBadge(selectedBatch.type)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created By</span>
                      <span className="text-sm truncate max-w-[200px]">
                        {selectedBatch.user?.name || selectedBatch.user_id}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Import Statistics */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Import Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold">{selectedBatch.total_leads}</div>
                      <div className="text-xs text-muted-foreground">Total Leads</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {selectedBatch.imported_leads}
                      </div>
                      <div className="text-xs text-green-600">Imported</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-700">
                        {selectedBatch.skipped_duplicates}
                      </div>
                      <div className="text-xs text-orange-600">Skipped</div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* File Information */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    File Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">File Name</span>
                      <span className="text-sm font-mono truncate max-w-[250px]">
                        {selectedBatch.file_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">File Size</span>
                      <span className="text-sm">{formatFileSize(selectedBatch.file_size)}</span>
                    </div>
                    {selectedBatch.file_url && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Download</span>
                        <a
                          href={selectedBatch.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-3 w-3" />
                          Download CSV
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Timestamps */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timestamps
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created At</span>
                      <span className="text-sm">{formatDateTime(selectedBatch.created_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Updated At</span>
                      <span className="text-sm">{formatDateTime(selectedBatch.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Skipped Leads */}
                {selectedBatch.skipped_leads && selectedBatch.skipped_leads.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Skipped Leads ({selectedBatch.skipped_leads.length})
                      </h3>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {selectedBatch.skipped_leads.map((skippedLead, index) => (
                          <div
                            key={index}
                            className="bg-orange-50 p-3 rounded-lg text-xs space-y-1"
                          >
                            <div className="font-medium text-orange-800">
                              Lead #{index + 1}
                            </div>
                            {Object.entries(skippedLead).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-orange-600">{key}:</span>
                                <span className="text-orange-900 truncate max-w-[200px]">
                                  {String(value || '-')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
