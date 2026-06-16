'use client';

import { useState } from 'react';
import { UserResponseDTO } from '@/types/user.types';
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
import { Pencil } from 'lucide-react';
import { EditAdminDialog } from './edit-admin-dialog';

interface AdminUsersTableProps {
  users: UserResponseDTO[];
  currentPage?: number;
  totalPages?: number;
}

export function AdminUsersTable({
  users,
  currentPage = 1,
  totalPages = 1,
}: AdminUsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserResponseDTO | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Use timezone hook for date formatting
  const { formatDate } = useTimezone();

  const handleEditClick = (user: UserResponseDTO) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No admin users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.email_verified ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        title="Edit admin user"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {selectedUser && (
        <EditAdminDialog user={selectedUser} open={isEditOpen} onOpenChange={setIsEditOpen} />
      )}
    </>
  );
}
