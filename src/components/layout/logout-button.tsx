
"use client";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react"; 
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";
import { DropdownMenuItem } from "../ui/dropdown-menu";


export function LogoutButton() {
  const { toast } = useToast();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      router.push('/login');

    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
        <LogOut className="mr-2 h-4 w-4" />
        Logout
    </DropdownMenuItem>
  );
}
