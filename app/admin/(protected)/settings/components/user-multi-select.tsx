'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, X, Users, ChevronDown } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  subscription_plan: string | null;
}

interface UserMultiSelectProps {
  selectedUsers: User[];
  onSelectionChange: (users: User[]) => void;
  disabled?: boolean;
}

export function UserMultiSelect({ selectedUsers, onSelectionChange, disabled }: UserMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch eligible users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/users/eligible');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data.data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on search
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleUser = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      onSelectionChange(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      onSelectionChange([...selectedUsers, user]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectAll = () => {
    onSelectionChange(filteredUsers);
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || loading}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {selectedUsers.length === 0 ? (
              <span className="text-muted-foreground">All eligible users (default)</span>
            ) : (
              <span>{selectedUsers.length} user(s) selected</span>
            )}
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {filteredUsers.length} user(s) found
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs h-7"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={selectedUsers.length === 0}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
            </div>

            {error ? (
              <div className="p-4 text-sm text-destructive text-center">{error}</div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="p-2 space-y-1">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedUsers.some((u) => u.id === user.id);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleToggleUser(user)}
                        >
                          <Checkbox checked={isSelected} onChange={() => {}} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{user.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                          {user.subscription_plan && (
                            <Badge
                              variant="outline"
                              className={
                                user.subscription_plan === 'diamond-lead'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 text-xs'
                                  : 'bg-green-50 text-green-700 border-green-200 text-xs'
                              }
                            >
                              {user.subscription_plan === 'diamond-lead' ? 'Diamond' : 'Dollar'}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      {/* Selected Users Tags */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              <span className="max-w-[150px] truncate">{user.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                disabled={disabled}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedUsers.length > 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled}
              className="text-xs h-6"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
