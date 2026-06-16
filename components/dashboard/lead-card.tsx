'use client';

import { useState } from 'react';
import { LeadResponseDTO } from '@/types/lead.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Coins,
  Target,
  DollarSign,
  Copy,
  Check,
} from 'lucide-react';
import { PropertyMap } from '@/components/property-map';

interface LeadCardProps {
  lead: LeadResponseDTO;
  showRecording?: boolean;
  layout?: 'grid' | 'list';
}

export function LeadCard({ lead, showRecording = false, layout = 'grid' }: LeadCardProps) {
  const [copied, setCopied] = useState(false);

  const formatCurrency = (value: number) => {
    if (!value || value === 0) return 'N/A';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const fullAddress = [lead.street_address, lead.city, lead.state, lead.zip_code]
    .filter(Boolean)
    .join(', ');

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy address');
    }
  };

  // List Layout (Horizontal/Compact)
  if (layout === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200 p-0">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            {/* Map Section */}
            <div className="w-full lg:w-[200px] h-[250px] overflow-hidden shrink-0">
              <div className="w-full h-full">
                <PropertyMap
                  address={fullAddress}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API || ''}
                  showPin={true}
                />
              </div>
            </div>

            {/* Info Section: Name, Address, Contact */}
            <div className="flex-1 space-y-5 min-w-0">
              {/* Name and Status */}
              <div className="flex items-start flex-col gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold whitespace-wrap">
                    {lead.full_name || 'N/A'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-md text-muted-foreground whitespace-wrap flex-1">
                      {fullAddress || 'No Address'}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={copyAddress}
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="size-3 text-green-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                </div>
                {lead.market_status && (
                  <Badge variant="secondary" className="shrink-0 bg-slate-100 text-xs">
                    {lead.market_status}
                  </Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="bg-green-50 p-1 rounded">
                    <Phone className="size-3 text-green-600" />
                  </div>
                  <span className="font-medium text-md">{lead.phone_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <div className="bg-blue-50 p-1 rounded">
                    <Mail className="size-3 text-blue-600" />
                  </div>
                  <span className="truncate max-w-[180px] text-md">{lead.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Financial Data */}
            <div className="flex-1 min-w-0 flex-col">
              {/* <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 border-blue-200 text-blue-800 px-2 py-1"
                >
                  <TrendingUp className="size-4 mr-1" />
                  <span className="text-sm mr-1">Est:</span>
                  <span className="font-bold text-sm">{formatCurrency(lead.estimate)}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-purple-50 border-purple-200 text-purple-800 px-2 py-1"
                >
                  <BarChart3 className="size-4 mr-1" />
                  <span className="text-sm mr-1">AVM:</span>
                  <span className="font-bold text-sm">{formatCurrency(lead.avm)}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-green-50 border-green-200 text-green-800 px-2 py-1"
                >
                  <Coins className="size-4 mr-1" />
                  <span className="text-sm mr-1">Equity:</span>
                  <span className="font-bold text-sm">{formatCurrency(lead.equity) == 'N/A' ? 'N/A' : `${formatCurrency(lead.equity)}%`}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-orange-50 border-orange-200 text-orange-800 px-2 py-1"
                >
                  <Target className="size-4 mr-1" />
                  <span className="text-sm mr-1">MAO:</span>
                  <span className="font-bold text-sm">{formatCurrency(lead.mao)}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 border-emerald-200 text-emerald-800 px-2 py-1"
                >
                  <DollarSign className="size-4 mr-1" />
                  <span className="text-sm mr-1">Offer:</span>
                  <span className="font-bold text-sm">{formatCurrency(lead.offer_price)}</span>
                </Badge>
              </div> */}

                {/* Right Section: Recording Button */}
                {showRecording && (
                  <div className="flex items-center justify-center text-center shrink-0 w-full mt-5">
                    {lead.recording_url ? (
                      <a
                        href={lead.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full gap-1.5 text-xs bg-primary text-white hover:bg-primary/90 px-3 py-2 rounded-md font-medium transition-colors whitespace-nowrap"
                      >
                        <ExternalLink className="size-3" />
                        Recording
                      </a>
                    ) : (
                      <span className="text-xs text-center text-muted-foreground italic">
                        No Recording
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid Layout (Vertical/Original)
  return (
    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold leading-tight">
            {lead.full_name || 'N/A'}
          </CardTitle>
          {lead.market_status && (
            <Badge variant="secondary" className="shrink-0 bg-slate-100">
              {lead.market_status}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground flex-1">
            {fullAddress || 'No Address'}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={copyAddress}
            title="Copy address"
          >
            {copied ? (
              <Check className="size-3.5 text-green-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Interactive Property Map */}
        <PropertyMap
          address={fullAddress}
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAP_API || ''}
          showPin={true}
        />

        {/* Contact Information */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Contact Info
          </h4>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-green-50 p-1.5 rounded">
                <Phone className="size-3 text-green-600" />
              </div>
              <span className="font-medium">{lead.phone_number || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="bg-blue-50 p-1.5 rounded">
                <Mail className="size-3 text-blue-600" />
              </div>
              <span className="truncate max-w-[200px]">{lead.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Financial Data Badges */}
        {/* <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Financial Data
          </h4>
          <div className="flex flex-wrap justify-start gap-2">

            <Badge
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-800 px-2 py-1 text-sm"
            >
              <TrendingUp className="size-3 mr-2" />
              <span className="font-normal text-xs mr-1.5">Estimate:</span>
              <span className="font-bold text-xs">{formatCurrency(lead.estimate)}</span>
            </Badge>


            <Badge
              variant="outline"
              className="bg-purple-50 border-purple-200 text-purple-800 px-2 py-1 text-sm"
            >
              <BarChart3 className="size-3 mr-2" />
              <span className="font-normal text-xs mr-1.5">AVM:</span>
              <span className="font-bold text-xs">{formatCurrency(lead.avm)}</span>
            </Badge>

       
            <Badge
              variant="outline"
              className="bg-green-50 border-green-200 text-green-800 px-2 py-1 text-sm"
            >
              <Coins className="size-3 mr-2" />
              <span className="font-normal text-xs mr-1.5">Equity:</span>
              <span className="font-bold text-xs">{formatCurrency(lead.equity) == 'N/A' ? 'N/A' : `${formatCurrency(lead.equity)}%`}</span>
            </Badge>

            <Badge
              variant="outline"
              className="bg-orange-50 border-orange-200 text-orange-800 px-2 py-1 text-sm"
            >
              <Target className="size-3 mr-2" />
              <span className="font-normal text-xs mr-1.5">MAO:</span>
              <span className="font-bold text-xs">{formatCurrency(lead.mao)}</span>
            </Badge>


            <Badge
              variant="outline"
              className="bg-emerald-50 border-emerald-200 text-emerald-800 px-2 py-1 text-sm"
            >
              <DollarSign className="size-3 mr-2" />
              <span className="font-normal text-xs mr-1.5">Offer:</span>
              <span className="font-bold text-xs">{formatCurrency(lead.offer_price)}</span>
            </Badge>
          </div>
        </div> */}

        {showRecording && (
            <div className="pt-1">
              {lead.recording_url ? (
                <a
                  href={lead.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full text-sm bg-primary text-white hover:bg-primary/90 px-3 py-2.5 rounded-md font-medium transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Open Call Recording
                </a>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No Recording Available
                </span>
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
