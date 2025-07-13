"use client"

import { BarChart3, FileText, Package, ShoppingCart, Store, TrendingUp, Upload, Users, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect } from "react"

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Purchase Orders",
    url: "/purchase-orders",
    icon: FileText,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Shopify Orders",
    url: "/shopify-orders",
    icon: ShoppingCart,
  },
  {
    title: "Profit Reports",
    url: "/reports",
    icon: TrendingUp,
  },
  {
    title: "Stores",
    url: "/stores",
    icon: Store,
  },
  {
    title: "Import Data",
    url: "/import",
    icon: Upload,
  },
]

export function AppSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const isExpanded = state === "expanded"
  const pathname = usePathname()

  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile && isExpanded) {
      toggleSidebar()
    }
  }, [pathname, isMobile])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />}

      <div
        className={cn(
          "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col h-screen z-50",
          // Desktop behavior
          "lg:relative lg:translate-x-0",
          // Mobile behavior
          "fixed left-0 top-0",
          isExpanded ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-16",
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className={cn("flex items-center", !isExpanded && "lg:justify-center")}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Package className="size-4" />
            </div>
            {isExpanded && (
              <div className="ml-2 grid text-left text-sm leading-tight">
                <span className="truncate font-semibold">Warehouse Pro</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Management System</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="ml-auto h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent lg:ml-auto"
            >
              {isExpanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {isExpanded && (
              <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                Management
              </div>
            )}
            {menuItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    !isExpanded && "lg:justify-center",
                  )}
                  title={!isExpanded ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {isExpanded && <span className="truncate">{item.title}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border">
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              !isExpanded && "lg:justify-center",
            )}
            title={!isExpanded ? "Admin Panel" : undefined}
          >
            <Users className="h-4 w-4 shrink-0" />
            {isExpanded && <span className="truncate">Admin Panel</span>}
          </Link>
        </div>
      </div>
    </>
  )
}
