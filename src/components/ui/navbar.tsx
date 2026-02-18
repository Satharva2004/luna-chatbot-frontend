'use client';

import { Button } from "./button";
import { useAuth } from "@/contexts/auth-context";
import { LogOut } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* <div className="mr-4 flex">
          <Link href="/chat" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Luna AI</span>
          </Link>
        </div> */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                }}
                className="gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
