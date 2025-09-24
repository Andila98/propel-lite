
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home,
  Building2,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
  Wrench,
  CalendarCheck,
  FileClock,
  UserCog,
  CalendarClock,
  LogOut
} from "lucide-react"

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
} from "@/components/ui/sidebar"
import { ThemeToggle } from "../theme-toggle"
import { LogoutButton } from "./logout-button"
import { useAuth } from "@/hooks/use-auth"
import { toJSON } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ['landlord', 'manager'] },
  { href: "/properties", label: "Properties", icon: Building2, roles: ['landlord', 'manager'] },
  { href: "/tenants", label: "Tenants", icon: Users, roles: ['landlord', 'manager'] },
  { href: "/payments", label: "Payments", icon: DollarSign, roles: ['landlord', 'manager'] },
  { href: "/rent-schedule", label: "Rent Schedule", icon: CalendarCheck, roles: ['landlord', 'manager'] },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ['landlord', 'manager'] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ['landlord'] },
  { href: "/property-managers", label: "Managers", icon: UserCog, roles: ['landlord'] },
  { href: "/audit-log", label: "Audit Log", icon: FileClock, roles: ['landlord'] },
];

const aiTools = [
  { href: "/price-suggestion", label: "Price Suggestion", icon: DollarSign, roles: ['landlord'] },
  { href: "/smart-messaging", label: "Smart Messaging", icon: MessageSquare, roles: ['landlord', 'manager'] },
  { href: "/reminders", label: "Reminders", icon: CalendarClock, roles: ['landlord'] },
]

const utilityPages = [
    { href: "/settings", label: "Settings", icon: Settings, roles: ['landlord'] },
]

export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRole = user?.role;
  
  if (userRole === 'tenant') {
    return (
       <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
           <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span>RentEase Tenant Portal</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 font-semibold">
            <PropelLiteLogo className="h-6 w-6" />
            <span className="group-data-[collapsible=icon]:hidden">RentEase</span>
          </div>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
           <Accordion type="multiple" defaultValue={['main', 'ai tools', 'utilities']} className="w-full">
            <AccordionItem value="main" className="border-b-0">
              <AccordionTrigger className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                Main
              </AccordionTrigger>
              <AccordionContent>
                <SidebarMenu>
                  {navItems
                    .filter(item => userRole && item.roles.includes(userRole))
                    .map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <Link href={href}>
                        <SidebarMenuButton tooltip={label} isActive={pathname.startsWith(href)}>
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ai tools" className="border-b-0">
              <AccordionTrigger className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                AI Tools
              </AccordionTrigger>
              <AccordionContent>
                 <SidebarMenu>
                    {aiTools
                        .filter(item => userRole && item.roles.includes(userRole))
                        .map(({ href, label, icon: Icon }) => (
                        <SidebarMenuItem key={href}>
                          <Link href={href}>
                            <SidebarMenuButton tooltip={label} isActive={pathname.startsWith(href)}>
                              <Icon />
                              <span>{label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex flex-1 flex-col transition-[margin-left] duration-300 ease-out md:ml-[var(--sidebar-width)] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[var(--sidebar-width-icon)]">
          {children}
      </main>
    </SidebarProvider>
  );
}
