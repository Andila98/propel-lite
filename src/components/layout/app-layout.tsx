
"use client"
import Link from "next/link"
import React from 'react'
import { usePathname } from "next/navigation"
import { 
  Home,
  Building2,
  Users,
  DollarSign,
  BarChart3,
  MessageSquare,
  Wrench,
  CalendarCheck,
  FileClock,
  UserCog,
  CalendarClock,
  Search,
  Bell,
  ChevronDown
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "../ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { SearchDialog } from "../search-dialog"

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

function getInitials(name: string | undefined | null) {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return name.substring(0, 2);
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [openSearch, setOpenSearch] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenSearch((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/60 px-4 backdrop-blur-xl sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <SidebarTrigger className="sm:hidden" />
        <div className="relative flex-1 md:grow-0">
          <Button
            variant="outline"
            className="group w-full justify-start text-sm text-muted-foreground md:w-[280px] lg:w-[320px]"
            onClick={() => setOpenSearch(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
            </Button>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full p-1 h-auto"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm">{user?.name}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings">
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <LogoutButton />
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <SearchDialog open={openSearch} onOpenChange={setOpenSearch} />
    </>
  );
}


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
        </SidebarHeader>
        <SidebarContent>
           <Accordion type="multiple" defaultValue={['main', 'ai tools']} className="w-full">
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
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col transition-[margin-left] duration-300 ease-out md:ml-[var(--sidebar-width)] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[var(--sidebar-width-icon)]">
          <MainLayoutContent>{children}</MainLayoutContent>
      </div>
    </SidebarProvider>
  );
}