"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/data-sync",
      label: "Data Sync",
    },
    {
      href: "/pos",
      label: "POS",
    },
    {
      href: "/expenses",
      label: "Expenses",
    },
    {
      href: "/income",
      label: "Income",
    },
    {
      href: "/sales",
      label: "Sales",
    },
    {
      href: "/inventory",
      label: "Inventory",
    },
    {
      href: "/customers",
      label: "Customers",
    },
    {
      href: "/returns",
      label: "Returns",
    },
    {
      href: "/purchases",
      label: "Purchases",
    },
    {
      href: "/analytics",
      label: "Day Cashbook",
    },
    {
      href: "/bank-info",
      label: "Bank Info",
    },
    {
      href: "/ledger",
      label: "Ledger",
    },
    {
      href: "/settings",
      label: "Settings",
    },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href ? "text-black" : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
