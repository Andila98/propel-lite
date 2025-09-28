
"use client";

import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react"; 
import { useAuth } from "@/hooks/use-auth";
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

    } catch (error: unknown) {
      const typedError = error as Error;
      console.error("Logout error:", typedError);
      toast({
        title: "Logout Failed",
        description: typedError.message || "An unexpected error occurred.",
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
