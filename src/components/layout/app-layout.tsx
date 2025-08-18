
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DollarSign, MessageCircle, LogOut, Building, UserCog, Banknote, CalendarClock, Settings, LayoutDashboard, FileClock, CalendarCheck, Wrench, BarChartHorizontal } from "lucide-react"
import { PropelLiteLogo } from "../icons/logo"
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar"
import { AnimatedUsersIcon } from "../icons/animated-users-icon"
import { ThemeToggle } from "../theme-toggle"
import { LogoutButton } from "./logout-button"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['landlord', 'manager'] },
  { href: "/properties", label: "Properties", icon: Building, roles: ['landlord', 'manager'] },
  { href: "/tenants", label: "Tenants", icon: AnimatedUsersIcon, roles: ['landlord', 'manager'] },
  { href: "/payments", label: "Payments", icon: Banknote, roles: ['landlord', 'manager'] },
  { href: "/rent-schedule", label: "Rent Schedule", icon: CalendarCheck, roles: ['landlord', 'manager'] },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ['landlord', 'manager'] },
  { href: "/reports", label: "Reports", icon: BarChartHorizontal, roles: ['landlord'] },
  { href: "/property-managers", label: "Managers", icon: UserCog, roles: ['landlord'] },
  { href: "/audit-log", label: "Audit Log", icon: FileClock, roles: ['landlord'] },
];

const aiTools = [
  { href: "/price-suggestion", label: "Price Suggestion", icon: DollarSign, roles: ['landlord'] },
  { href: "/smart-messaging", label: "Smart Messaging", icon: MessageCircle, roles: ['landlord', 'manager'] },
  { href: "/reminders", label: "Reminders", icon: CalendarClock, roles: ['landlord'] },
]

const utilityPages = [
    { href: "/settings", label: "Settings", icon: Settings, roles: ['landlord'] },
    { href: "/tenant-portal", label: "Tenant Portal", icon: AnimatedUsersIcon, roles: ['tenant'] },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRole = user?.role;

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };
  
  const filteredNavItems = navItems.filter(item => userRole && item.roles.includes(userRole));
  const filteredAiTools = aiTools.filter(item => userRole && item.roles.includes(userRole));
  const filteredUtilityPages = utilityPages.filter(item => userRole && item.roles.includes(userRole));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
           <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">RentEase</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredNavItems.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <Link href={href}>
                    <SidebarMenuButton tooltip={label} isActive={pathname === href}>
                        <Icon />
                        <span>{label}</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          {filteredAiTools.length > 0 && (
            <SidebarMenu>
              <SidebarMenuItem className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                  AI Tools
              </SidebarMenuItem>
              {filteredAiTools.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <Link href={href}>
                      <SidebarMenuButton tooltip={label} isActive={pathname === href}>
                          <Icon />
                          <span>{label}</span>
                      </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          )}

        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             {filteredUtilityPages.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                    <Link href={href}>
                        <SidebarMenuButton tooltip={label} isActive={pathname === href}>
                            <Icon />
                            <span>{label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                ))}
             <SidebarMenuItem>
                <LogoutButton />
            </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sticky top-0 z-30 md:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex w-full items-center justify-end gap-4">
            <ThemeToggle />
             {user && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </header>
        <main className="flex flex-1 flex-col bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
