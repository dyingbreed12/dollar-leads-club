'use client';

import * as React from 'react';
import {
  Home,
  User,
  Settings,
  LifeBuoy,
  Send,
  GalleryVerticalEnd,
  DollarSign,
  Link,
  Package,
  CreditCard,
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
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Image from 'next/image';

const navMain = [
  {
    title: 'DLC',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Pricing',
    url: '/dashboard/pricing',
    icon: DollarSign,
  },
  {
    title: 'Packs',
    url: '/dashboard/packs',
    icon: Package,
  },
  // {
  //   title: 'iSpeedToLead',
  //   url: 'https://ispeedtolead.com',
  //   icon: Link,
  // },
  {
    title: 'MaxDispo',
    url: 'https://maxdispo.com',
    icon: Link,
  },
];

const navUserItems = [
  {
    title: 'Profile',
    url: '/dashboard/profile',
    icon: User,
  },
  {
    title: 'Billing',
    url: '/dashboard/billing',
    icon: CreditCard,
  },
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings,
  },
];

const navSecondary = [
  {
    title: 'Support',
    url: '/dashboard/support',
    icon: LifeBuoy,
  },
  {
    title: 'Feedback',
    url: '/dashboard/feedback',
    icon: Send,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isImpersonating?: boolean;
}

export function AppSidebar({ user, isImpersonating = false, ...props }: AppSidebarProps) {
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
            <h4 className='text-xl font-bold mt-1'>Dollar Leads</h4>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} items={navUserItems} isImpersonating={isImpersonating} />
      </SidebarFooter>
    </Sidebar>
  );
}
