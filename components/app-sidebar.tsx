"use client"

import type * as React from "react"
import { Package, ShoppingCart, Store, FileText, BarChart3, Upload, Home, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  navMain: [
    {
      title: "Overview",
      url: "/",
      icon: Home,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: Package,
    },
    {
      title: "Purchase Orders",
      url: "/purchase-orders",
      icon: FileText,
    },
    {
      title: "Shopify Orders",
      url: "/shopify-orders",
      icon: ShoppingCart,
    },
    {
      title: "Stores",
      url: "/stores",
      icon: Store,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Import",
      url: "/import",
      icon: Upload,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Package className="h-6 w-6" />
          <span className="font-semibold text-lg">WMS</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
