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
  LogOut,
  LayoutDashboard
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
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "../theme-toggle"
import { LogoutButton } from "./logout-button"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['landlord', 'manager'] },
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

function NavSection({ title, items, pathname, userRole, isCollapsed }: { title: string, items: any[], pathname: string, userRole: string, isCollapsed: boolean }) {
  const filteredItems = items.filter(item => userRole && item.roles.includes(userRole));
  if (filteredItems.length === 0) return null;

  return (
    <AccordionItem value={title.toLowerCase()} className="border-b-0">
      <AccordionTrigger 
        className={cn(
          "px-2 text-xs font-medium text-sidebar-foreground/70 hover:no-underline",
          isCollapsed && "hidden"
        )}
      >
        {!isCollapsed && title}
      </AccordionTrigger>
      <AccordionContent className="pb-0">
        <SidebarMenu>
          {filteredItems.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <Link href={href}>
                <SidebarMenuButton tooltip={label} isActive={pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard')}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </AccordionContent>
    </AccordionItem>
  )
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRole = user?.role;
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
  };
  
  if (userRole === 'tenant') {
    return (
       <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
           <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">RentEase Tenant Portal</span>
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
    <>
      <Sidebar>
        <SidebarHeader>
           <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">RentEase</span>
            </Link>
        </SidebarHeader>
        <SidebarContent>
           <Accordion type="multiple" defaultValue={['main', 'ai tools', 'utilities']} className="w-full">
            <NavSection title="Main" items={navItems} pathname={pathname} userRole={userRole || ''} isCollapsed={isCollapsed} />
            <NavSection title="AI Tools" items={aiTools} pathname={pathname} userRole={userRole || ''} isCollapsed={isCollapsed} />
          </Accordion>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             {utilityPages.filter(item => userRole && item.roles.includes(userRole)).map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                    <Link href={href}>
                        <SidebarMenuButton tooltip={label} isActive={pathname.startsWith(href)}>
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
        <header className="flex h-14 items-center gap-4 border-b bg-card/70 backdrop-blur-sm px-4 sticky top-0 z-30 md:px-6 shadow-sm">
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
        <main className="flex flex-1 flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black">
          {children}
        </main>
      </SidebarInset>
    </>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role === 'tenant') {
    return (
       <div className="flex flex-col min-h-screen">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
           <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="group-data-[collapsible=icon]:hidden">RentEase Tenant Portal</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton />
            </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  )
}
