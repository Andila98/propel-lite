
"use client";

import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase/client-app";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { LogIn } from "lucide-react";


export function LogoutButton() {
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 1. Clear the server-side session cookie by calling the logout API
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Server logout failed.');
      }
      
      // 2. Sign the user out of the Firebase client-side instance
      await signOut(auth);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // 3. Redirect to the login page
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
    <SidebarMenuButton
      tooltip="Logout"
      onClick={handleLogout}
    >
      <LogIn />
      <span>Logout</span>
    </SidebarMenuButton>
  );
}
