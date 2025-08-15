
"use client"

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardPage from "./dashboard/page";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in, redirect based on role
        if (user.role === 'tenant') {
            router.replace('/tenant-portal');
        } else {
            router.replace('/dashboard');
        }
      } else {
        // User is not logged in, redirect to login
        router.replace('/login');
      }
    }
  }, [user, loading, router]);
  
  // You can show a loading spinner here while the redirect is happening
  // For this case, we'll just render the dashboard page which has its own loading state.
  return <DashboardPage />;
}
