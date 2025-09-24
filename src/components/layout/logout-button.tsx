
"use client";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogOut } from "lucide-react"; 
import { useAuth } from "@/hooks/use-auth";
import { Button } from "../ui/button";


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
     <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="h-7 w-7 p-0 hover:bg-gradient-to-br hover:from-red-500/10 hover:to-red-600/10 text-muted-foreground hover:text-red-500"
    >
        <LogOut className="h-3 w-3" />
    </Button>
  );
}
