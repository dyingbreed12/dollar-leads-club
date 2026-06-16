'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadResponseDTO } from '@/types/lead.types';
import { UserResponseDTO } from '@/types/user.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { updateLeadAction, deleteLeadAction } from '@/actions/lead.actions';
import { toast } from 'sonner';

interface LeadsTableProps {
  leads: LeadResponseDTO[];
  members: UserResponseDTO[];
}

export function LeadsTable({ leads, members }: LeadsTableProps) {
  const router = useRouter();

  const [selectedLead, setSelectedLead] = useState<LeadResponseDTO | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);

  // Use timezone hook for date formatting
  const { formatDate } = useTimezone();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeBadge = (type: string) => {
    if (type === 'diamond-lead') {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Diamond</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Dollar</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>;
      case 'claimed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Claimed</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const handleEditClick = (lead: LeadResponseDTO) => {
    setSelectedLead(lead);
    setError(null);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (lead: LeadResponseDTO) => {
    setSelectedLead(lead);
    setIsDeleteOpen(true);
  };

  const handleSaveClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormRef(e.currentTarget);
    setIsSaveConfirmOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (!selectedLead || !formRef) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData(formRef);
    const result = await updateLeadAction(selectedLead.id, formData);

    if (result.success) {
      toast.success(result.message || 'Lead updated successfully');
      setIsEditOpen(false);
      setIsSaveConfirmOpen(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to update lead');
      setIsSaveConfirmOpen(false);
    }

    setIsLoading(false);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLead) return;

    setIsLoading(true);
    const result = await deleteLeadAction(selectedLead.id);

    if (result.success) {
      toast.success(result.message || 'Lead deleted successfully');
      setIsDeleteOpen(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete lead');
      setIsDeleteOpen(false);
    }

    setIsLoading(false);
  };

  // Filter members based on lead type for assignment
  const getEligibleMembers = (leadType: string) => {
    // All members can potentially be assigned, but filter by those with matching subscription
    return members.filter((member) => {
      if (leadType === 'diamond-lead') {
        return member.subscription_plan === 'diamond-lead';
      }
      return member.subscription_plan === 'dollar-lead' || member.subscription_plan === 'diamond-lead';
    });
  };

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Estimate</TableHead>
              <TableHead className="text-right">MAO</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.full_name || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {lead.street_address || '-'}
                  </TableCell>
                  <TableCell>{lead.city || '-'}</TableCell>
                  <TableCell>{lead.state || '-'}</TableCell>
                  <TableCell>{getTypeBadge(lead.type)}</TableCell>
                  <TableCell>{getStatusBadge(lead.status)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(lead.estimate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(lead.mao)}</TableCell>
                  <TableCell>{formatDate(lead.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(lead)}
                        title="Edit lead"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(lead)}
                        title="Delete lead"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Lead Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle>Edit Lead</SheetTitle>
                <SheetDescription>
                  Update lead information. Type: {selectedLead.type === 'diamond-lead' ? 'Diamond' : 'Dollar'}
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSaveClick} className="space-y-6 mt-6 pb-6 px-5">
                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>
                )}

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        defaultValue={selectedLead.full_name || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        defaultValue={selectedLead.phone_number || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={selectedLead.email || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="street_address">Street Address</Label>
                      <Input
                        id="street_address"
                        name="street_address"
                        defaultValue={selectedLead.street_address || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        defaultValue={selectedLead.city || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        defaultValue={selectedLead.state || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">Zip Code</Label>
                      <Input
                        id="zip_code"
                        name="zip_code"
                        defaultValue={selectedLead.zip_code || ''}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="estimate">Estimate</Label>
                      <Input
                        id="estimate"
                        name="estimate"
                        type="number"
                        step="0.01"
                        defaultValue={selectedLead.estimate}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mao">MAO (Maximum Allowable Offer)</Label>
                      <Input
                        id="mao"
                        name="mao"
                        type="number"
                        step="0.01"
                        defaultValue={selectedLead.mao}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offer_price">Offer Price</Label>
                      <Input
                        id="offer_price"
                        name="offer_price"
                        type="number"
                        step="0.01"
                        defaultValue={selectedLead.offer_price}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avm">AVM (Automated Valuation)</Label>
                      <Input
                        id="avm"
                        name="avm"
                        type="number"
                        step="0.01"
                        defaultValue={selectedLead.avm}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equity">Equity</Label>
                      <Input
                        id="equity"
                        name="equity"
                        type="number"
                        step="0.01"
                        defaultValue={selectedLead.equity}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Assignment */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Status & Assignment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={selectedLead.status} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="claimed">Claimed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="claimed_by">Assign to Member</Label>
                      <Select
                        name="claimed_by"
                        defaultValue={selectedLead.claimed_by || '__unassigned__'}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__unassigned__">Unassigned</SelectItem>
                          {getEligibleMembers(selectedLead.type).map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Property Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property_type">Property Type</Label>
                      <Input
                        id="property_type"
                        name="property_type"
                        defaultValue={selectedLead.property_type || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead_gen">Lead Gen</Label>
                      <Input
                        id="lead_gen"
                        name="lead_gen"
                        defaultValue={selectedLead.lead_gen || ''}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="market_status">Market Status</Label>
                      <Input
                        id="market_status"
                        name="market_status"
                        defaultValue={selectedLead.market_status || ''}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    defaultValue={selectedLead.notes || ''}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={isSaveConfirmOpen} onOpenChange={setIsSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to save the changes to this lead. This will update the lead information
              in the database. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Confirm Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the lead for <strong>{selectedLead?.full_name || 'Unknown'}</strong>{' '}
              at <strong>{selectedLead?.street_address || 'Unknown address'}</strong>.
              <br />
              <br />
              <span className="text-red-600 font-medium">
                Warning: This action cannot be undone. All related records (claim history, etc.) will also
                be deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Lead'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
