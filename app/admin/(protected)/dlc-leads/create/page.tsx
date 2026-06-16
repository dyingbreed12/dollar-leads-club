'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface UploadResult {
  success: boolean;
  batch_id?: string;
  imported?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

export default function CreateBatchPage() {
  const router = useRouter();
  const [batchName, setBatchName] = useState('');
  const [leadType, setLeadType] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }

    if (!leadType) {
      setError('Please select a lead type');
      return;
    }

    if (!csvFile) {
      setError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('batch_name', batchName.trim());
      formData.append('type', leadType);
      formData.append('csv_file', csvFile);

      const response = await fetch('/api/admin/dlc-leads/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);

      // Redirect after success
      setTimeout(() => {
        router.push('/admin/dlc-leads?tab=batches');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const csvColumns = [
    'Name',
    'Phone',
    'Address',
    'City',
    'State',
    'Zip Code',
    'Email',
    'Notes',
    'Call Recording',
    'Estimate',
    'MAO',
    'Offer Price',
    'Equity',
    'Status',
  ];

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dlc-leads">DLC Leads</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Batch</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                <div>
                  <CardTitle>Create New Lead Batch</CardTitle>
                  <CardDescription>
                    Upload a CSV file to import leads into the system
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batchName">Batch Name</Label>
                  <Input
                    id="batchName"
                    placeholder="e.g., November 2024 Import"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadType">Lead Type</Label>
                  <Select value={leadType} onValueChange={setLeadType} disabled={isUploading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dollar-lead">Dollar</SelectItem>
                      <SelectItem value="diamond-lead">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  {csvFile && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Selected: {csvFile.name} (
                        {csvFile.size > 1024 * 1024
                          ? `${(csvFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : `${(csvFile.size / 1024).toFixed(2)} KB`}
                        )
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Estimated rows: ~{Math.floor(csvFile.size / 150).toLocaleString()}
                      </p>
                      {csvFile.size > 1024 * 1024 && (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 text-yellow-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs">
                            Large file detected. Processing may take 2-5 minutes for ~10,000 rows.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {result && result.success && (
                  <div className="flex flex-col gap-2 p-3 rounded-md bg-green-50 text-green-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload Successful!</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>Total rows: {result.total}</p>
                      <p>Imported: {result.imported}</p>
                      <p>Skipped (duplicates): {result.skipped}</p>
                    </div>
                    <p className="text-xs mt-2">Redirecting to batches list...</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {csvFile && csvFile.size > 1024 * 1024
                        ? 'Processing large file... Please wait'
                        : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload and Process
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Template Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <div>
                  <CardTitle>CSV Template</CardTitle>
                  <CardDescription>Download and use this template for your data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <a href="/docs/sample_csv_template.csv" download>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </a>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Expected Columns:</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      {csvColumns.map((col) => (
                        <span key={col} className="text-xs font-mono">
                          • {col}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Important Notes:</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• First row must contain column headers</li>
                    <li>• Empty rows will be skipped automatically</li>
                    <li>• Duplicate addresses (within 6 months) will be skipped</li>
                    <li>• Numeric fields: Estimate, MAO, Offer Price, Equity</li>
                    <li>• Status field: On-Market or Off-Market</li>
                    <li>• All CSV columns will be preserved in the database</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Link href="/admin/dlc-leads">
                    <Button variant="ghost" className="w-full">
                      Back to DLC Leads
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
