"use client"

import {
  BarChart3,
  FileText,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  Upload,
  Users,
  Menu,
  X,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/ui/sidebar"
import { useEffect, useState } from "react"

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
    title: "Returns",
    url: "/returns",
    icon: RotateCcw,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Orders",
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
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const isExpanded = state === "expanded"
  const pathname = usePathname()

  // Handle mobile menu toggle
  const handleMobileToggle = () => {
    if (isMobile) {
      setMobileExpanded(!mobileExpanded)
    } else {
      toggleSidebar()
    }
  }

  // Auto-close mobile menu when navigating
  useEffect(() => {
    if (isMobile && mobileExpanded) {
      setMobileExpanded(false)
    }
  }, [pathname, isMobile])

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileExpanded(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && mobileExpanded && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileExpanded(false)} />
      )}

      <div
        className={cn(
          "bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col h-screen z-50",
          // Desktop behavior
          "lg:relative lg:translate-x-0",
          // Mobile behavior - always show collapsed version, expand on toggle
          "fixed left-0 top-0",
          isMobile ? (mobileExpanded ? "translate-x-0 w-64" : "translate-x-0 w-16") : isExpanded ? "w-64" : "w-16",
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className={cn("flex items-center", !isExpanded && !mobileExpanded && "justify-center")}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Package className="size-4" />
            </div>
            {((isExpanded && !isMobile) || (isMobile && mobileExpanded)) && (
              <div className="ml-2 grid text-left text-sm leading-tight">
                <span className="truncate font-semibold">Warehouse Pro</span>
                <span className="truncate text-xs text-sidebar-foreground/70">Management System</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMobileToggle}
              className={cn(
                "h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent",
                (isExpanded && !isMobile) || (isMobile && mobileExpanded) ? "ml-auto" : "ml-0",
              )}
            >
              {(isExpanded && !isMobile) || (isMobile && mobileExpanded) ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {((isExpanded && !isMobile) || (isMobile && mobileExpanded)) && (
              <div className="px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                Management
              </div>
            )}
            {menuItems.map((item) => {
              const isActive = pathname === item.url
              const showText = (isExpanded && !isMobile) || (isMobile && mobileExpanded)
              return (
                <Link
                  key={item.title}
                  href={item.url}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    !showText && "justify-center",
                  )}
                  title={!showText ? item.title : undefined}
                  onClick={() => isMobile && setMobileExpanded(false)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {showText && <span className="truncate">{item.title}</span>}
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
              !isExpanded && !mobileExpanded && "justify-center",
            )}
            title={!isExpanded && !mobileExpanded ? "Admin Panel" : undefined}
            onClick={() => isMobile && setMobileExpanded(false)}
          >
            <Users className="h-4 w-4 shrink-0" />
            {((isExpanded && !isMobile) || (isMobile && mobileExpanded)) && (
              <span className="truncate">Admin Panel</span>
            )}
          </Link>
        </div>
      </div>
    </>
  )
}
