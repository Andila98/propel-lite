
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DollarSign, MessageCircle, LogIn, Building, UserCog, Banknote, CalendarClock, Settings, LayoutDashboard, FileClock, CalendarCheck, Wrench, BarChartHorizontal, TestTube2 } from "lucide-react"
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

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building },
  { href: "/tenants", label: "Tenants", icon: AnimatedUsersIcon },
  { href: "/payments", label: "Payments", icon: Banknote },
  { href: "/rent-schedule", label: "Rent Schedule", icon: CalendarCheck },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/reports", label: "Reports", icon: BarChartHorizontal },
  { href: "/property-managers", label: "Managers", icon: UserCog },
  { href: "/audit-log", label: "Audit Log", icon: FileClock },
];

const aiTools = [
  { href: "/price-suggestion", label: "Price Suggestion", icon: DollarSign },
  { href: "/smart-messaging", label: "Smart Messaging", icon: MessageCircle },
  { href: "/reminders", label: "Reminders", icon: CalendarClock },
]

const utilityPages = [
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/tenant-portal", label: "Tenant Portal", icon: AnimatedUsersIcon },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
            {navItems.map(({ href, label, icon: Icon }) => (
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
          <SidebarMenu>
             <SidebarMenuItem className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                AI Tools
            </SidebarMenuItem>
            {aiTools.map(({ href, label, icon: Icon }) => (
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
           <SidebarMenu>
             <SidebarMenuItem className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                Testing
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/test-property-creation">
                    <SidebarMenuButton tooltip="Test Property Creation" isActive={pathname === "/test-property-creation"}>
                        <TestTube2 />
                        <span>Test Creation</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             {utilityPages.map(({ href, label, icon: Icon }) => (
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
          <div className="flex w-full items-center justify-end">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
