
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Menu, LayoutDashboard, DollarSign, MessageCircle, Users, LogIn, Building, UserCog, Banknote } from "lucide-react"
import { PropelLiteLogo } from "../icons/logo"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/payments", label: "Payments", icon: Banknote },
  { href: "/property-managers", label: "Managers", icon: UserCog },
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
          <div className="flex-1 overflow-y-auto">
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
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6 lg:h-[60px] sticky top-0 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex h-14 items-center border-b px-4">
                 <Link
                    href="/"
                    className="flex items-center gap-2 font-semibold"
                  >
                    <PropelLiteLogo className="h-6 w-6" />
                    <span>RentEase</span>
                  </Link>
              </div>
              <nav className="grid gap-2 text-base font-medium p-4">
                {navItems.map(({ href, label, icon: Icon }) => (
                 <SheetClose asChild key={href}>
                    <Link
                        href={href}
                        className={cn(
                        "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                        pathname === href && "bg-muted text-foreground"
                        )}
                    >
                        <Icon className="h-5 w-5" />
                        {label}
                    </Link>
                 </SheetClose>
                ))}
              </nav>
                 <div className="mt-auto border-t p-4">
                    <SheetClose asChild>
                        <Link
                        href="/login"
                        className={cn(
                            "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                            pathname === "/login" && "bg-muted text-foreground"
                        )}
                        >
                        <LogIn className="h-5 w-5" />
                        Logout
                        </Link>
                    </SheetClose>
                </div>
            </SheetContent>
          </Sheet>
           <div className="flex w-full items-center justify-center md:hidden">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold"
              >
                <PropelLiteLogo className="h-6 w-6" />
                <span className="text-lg">RentEase</span>
              </Link>
            </div>
        </header>
        <main className="flex flex-1 flex-col bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
