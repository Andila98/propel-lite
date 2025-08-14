
"use client";

import { useAuth } from "@/hooks/use-auth";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LogoutButton() {
  const { logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarMenuButton
      tooltip="Logout"
      onClick={handleLogout}
    >
      <LogIn />
      <span>Logout</span>
    </SidebarMenuButton>
  );
}
