'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserResponseDTO } from '@/types/user.types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { Pencil, Eye, UserRoundCog, Search, Filter, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { updateUserAction, toggleLeadAccessAction } from '@/actions/admin.actions';
import { startImpersonationAction } from '@/actions/impersonation.actions';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface MembersTableProps {
  users: UserResponseDTO[];
  searchQuery?: string;
  planFilter?: string;
  leadAccessFilter?: string;
  currentPage?: number;
  totalPages?: number;
}

export function MembersTable({
  users,
  searchQuery = '',
  planFilter = '',
  leadAccessFilter = '',
  currentPage = 1,
  totalPages = 1,
}: MembersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedUser, setSelectedUser] = useState<UserResponseDTO | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchQuery);
  const [togglingLeadAccess, setTogglingLeadAccess] = useState<string | null>(null);

  // Use timezone hook for date formatting
  const { formatDate } = useTimezone();

  const buildUrl = (newSearch?: string, newPlan?: string, newLeadAccess?: string) => {
    const params = new URLSearchParams();
    params.set('tab', 'members');
    if (newSearch) params.set('search', newSearch);
    if (newPlan) params.set('plan', newPlan);
    if (newLeadAccess) params.set('leadAccess', newLeadAccess);
    // Reset to page 1 when filters change
    params.set('page', '1');
    return `/admin/users?${params.toString()}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl(search, planFilter, leadAccessFilter));
  };

  const handlePlanFilter = (plan: string) => {
    router.push(buildUrl(searchQuery, plan, leadAccessFilter));
  };

  const handleLeadAccessFilter = (leadAccess: string) => {
    router.push(buildUrl(searchQuery, planFilter, leadAccess));
  };

  const handleEditClick = (user: UserResponseDTO) => {
    setSelectedUser(user);
    setError(null);
    setIsEditOpen(true);
  };

  const handleImpersonateClick = (user: UserResponseDTO) => {
    setSelectedUser(user);
    setIsImpersonateOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserAction(selectedUser.id, formData);

    if (result.success) {
      setIsEditOpen(false);
      router.refresh();
    } else {
      setError(result.error || 'Failed to update user');
    }

    setIsLoading(false);
  };

  const handleImpersonateConfirm = async () => {
    if (!selectedUser) return;

    setIsLoading(true);
    const result = await startImpersonationAction(selectedUser.id);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Failed to start impersonation');
      setIsImpersonateOpen(false);
    }

    setIsLoading(false);
  };

  const handleLeadAccessToggle = async (userId: string, enabled: boolean) => {
    setTogglingLeadAccess(userId);
    const result = await toggleLeadAccessAction(userId, enabled);

    if (result.success) {
      toast.success(result.message || 'Lead access updated successfully');
    } else {
      setError(result.error || 'Failed to toggle lead access');
    }

    setTogglingLeadAccess(null);
    router.refresh();
  };

  const getSubscriptionBadge = (user: UserResponseDTO) => {
    if (!user.subscription_plan) {
      return <span className="text-sm text-muted-foreground">None</span>;
    }

    const planName = user.subscription_plan === 'diamond-lead' ? 'Diamond' : 'Dollar';
    const statusColor =
      user.subscription_status === 'active'
        ? 'bg-green-50 text-green-700 border-green-200'
        : user.subscription_status === 'trialing'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-gray-50 text-gray-700 border-gray-200';

    return (
      <div className="flex flex-col gap-1">
        <Badge
          variant="outline"
          className={
            user.subscription_plan === 'diamond-lead'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }
        >
          {planName}
        </Badge>
        {user.subscription_status && (
          <Badge variant="outline" className={statusColor}>
            {user.subscription_status}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-4">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => router.push(buildUrl('', planFilter, leadAccessFilter))}>
              Clear
            </Button>
          )}
        </form>

        <div className="flex items-center flex-wrap gap-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Plan:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={!planFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlanFilter('')}
            >
              All
            </Button>
            <Button
              variant={planFilter === 'dollar-lead' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlanFilter('dollar-lead')}
            >
              Dollar
            </Button>
            <Button
              variant={planFilter === 'diamond-lead' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlanFilter('diamond-lead')}
            >
              Diamond
            </Button>
            <Button
              variant={planFilter === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePlanFilter('none')}
            >
              No Plan
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Lead Access:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={!leadAccessFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLeadAccessFilter('')}
            >
              All
            </Button>
            <Button
              variant={leadAccessFilter === 'enabled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLeadAccessFilter('enabled')}
            >
              Enabled
            </Button>
            <Button
              variant={leadAccessFilter === 'disabled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleLeadAccessFilter('disabled')}
            >
              Disabled
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lead Access</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.email_verified && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Verified
                        </Badge>
                      )}
                      {user.is_logged_in && (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.lead_access || false}
                      onCheckedChange={(checked) => handleLeadAccessToggle(user.id, checked)}
                      disabled={togglingLeadAccess === user.id}
                    />
                  </TableCell>
                  <TableCell>{getSubscriptionBadge(user)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm" title="View user details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleImpersonateClick(user)}
                        title="Impersonate user"
                      >
                        <UserRoundCog className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-md">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>Edit User</SheetTitle>
                <SheetDescription>Update user information</SheetDescription>
              </SheetHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 mt-6 p-5">
                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedUser.name}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={selectedUser.email}
                    required
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

      {/* Impersonate Confirmation Dialog */}
      <AlertDialog open={isImpersonateOpen} onOpenChange={setIsImpersonateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impersonate User</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to impersonate <strong>{selectedUser?.name}</strong> (
              {selectedUser?.email}). This will allow you to view their dashboard and act on their
              behalf. A warning banner will be displayed during impersonation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImpersonateConfirm} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Impersonation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
