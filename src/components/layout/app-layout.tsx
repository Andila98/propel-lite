
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, DollarSign, MessageCircle, Users, LogIn, Building } from "lucide-react"
import { PropelLiteLogo } from "../icons/logo"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/price-suggestion", label: "Price Suggestion", icon: DollarSign },
  { href: "/smart-messaging", label: "Smart Messaging", icon: MessageCircle },
  { href: "/tenant-portal", label: "Tenant Portal", icon: Users },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="">RentEase</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    pathname === href && "bg-muted text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
            <div className="mt-auto p-4">
                <Link
                  href="/login"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                     pathname === "/login" && "bg-muted text-primary"
                  )}
                >
                  <LogIn className="h-4 w-4" />
                  Logout
                </Link>
            </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <PropelLiteLogo className="h-6 w-6" />
                  <span>RentEase</span>
                </Link>
                {navItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                      pathname === href && "bg-muted text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                ))}
              </nav>
                 <div className="mt-auto p-4">
                    <Link
                      href="/login"
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === "/login" && "bg-muted text-primary"
                      )}
                    >
                      <LogIn className="h-4 w-4" />
                      Logout
                    </Link>
                </div>
            </SheetContent>
          </Sheet>
           <div className="flex items-center gap-2 font-semibold">
              <PropelLiteLogo className="h-6 w-6" />
              <span className="">RentEase</span>
            </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
