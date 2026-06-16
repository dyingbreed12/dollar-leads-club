'use client';

import * as React from 'react';
import {
  Home,
  Users,
  Settings,
  LifeBuoy,
  BarChart3,
  ShieldCheck,
  UserCog,
  Database,
  Package,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Image from 'next/image';

const navMain = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: Home,
  },
  {
    title: 'Users',
    url: '/admin/users',
    icon: Users,
  },
  {
    title: 'DLC Leads',
    url: '/admin/dlc-leads',
    icon: Package,
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: BarChart3,
  },
];

const navUserItems = [
  {
    title: 'Profile',
    url: '/admin/profile',
    icon: UserCog,
  },
  {
    title: 'Settings',
    url: '/admin/settings',
    icon: Settings,
  },
];

const navSecondary = [
  {
    title: 'Support',
    url: '/admin/support',
    icon: LifeBuoy,
  },
  {
    title: 'System Logs',
    url: '/admin/logs',
    icon: Database,
  },
];

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminSidebar({ user, ...props }: AdminSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className='flex justify-center items-center flex-col'>
            <Image
              src="/assets/dollar-leads-logo.png"
              alt="Logo"
              width={100}
              height={100}
              style={{ width: '80px', height: 'auto' }}
            />
            <h4 className='text-xl font-bold mt-1'>Admin Portal</h4>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} items={navUserItems} />
      </SidebarFooter>
    </Sidebar>
  );
}
