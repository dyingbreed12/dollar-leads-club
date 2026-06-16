"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  ChevronsUpDown,
  LogOut,
  Sparkles,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { logoutAction } from "@/actions/auth.actions"
import { stopImpersonationAction } from "@/actions/impersonation.actions"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
  items,
  isImpersonating = false,
}: {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  items?: {
    title: string
    url: string
    icon: LucideIcon
  }[]
  isImpersonating?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile } = useSidebar()

  const handleLogout = async () => {
    try {
      const result = await logoutAction()
      if (result.success) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleBackToAdmin = async () => {
    try {
      const result = await stopImpersonationAction()
      if (result.success) {
        router.push('/admin/users')
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to stop impersonation:', error)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg bg-secondary border border-primary">
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                <AvatarFallback className="rounded-lg bg-secondary">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || 'User'}</span>
                <span className="truncate text-xs">{user.email || ''}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image || ''} alt={user.name || ''} />
                  <AvatarFallback className="rounded-lg">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name || 'User'}</span>
                  <span className="truncate text-xs">{user.email || ''}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isImpersonating && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleBackToAdmin} className="text-yellow-600 focus:text-yellow-600">
                    <ShieldCheck />
                    Back to Admin
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            {items && items.length > 0 && (
              <>
                <DropdownMenuGroup>
                  {items.map((item) => {
                    const isActive = pathname === item.url
                    return (
                      <DropdownMenuItem key={item.title} asChild>
                        <a
                          href={item.url}
                          className={isActive ? 'bg-accent' : ''}
                        >
                          <item.icon />
                          {item.title}
                        </a>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
