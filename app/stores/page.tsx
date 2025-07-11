"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Store,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react"
import { supabaseStore, type ShopifyStore } from "@/lib/supabase-store"

export default function Stores() {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [filteredStores, setFilteredStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    shopifyDomain: "",
    accessToken: "",
    webhookUrl: "",
    notes: "",
  })

  useEffect(() => {
    loadStores()
  }, [])

  useEffect(() => {
    const filtered = stores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.shopifyDomain.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredStores(filtered)
  }, [stores, searchTerm])

  const loadStores = async () => {
    try {
      setLoading(true)
      const data = await supabaseStore.getShopifyStores()
      setStores(data)
    } catch (error) {
      console.error("Error loading stores:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStore = async () => {
    if (!formData.name || !formData.shopifyDomain || !formData.accessToken) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await supabaseStore.createShopifyStore({
        name: formData.name,
        shopify_domain: formData.shopifyDomain,
        access_token: formData.accessToken,
        status: "Connected",
        webhook_url: formData.webhookUrl,
        notes: formData.notes,
      })

      setFormData({
        name: "",
        shopifyDomain: "",
        accessToken: "",
        webhookUrl: "",
        notes: "",
      })
      setIsAddDialogOpen(false)
      await loadStores()
      alert("Store added successfully!")
    } catch (error) {
      console.error("Error adding store:", error)
      alert("Error adding store. Please try again.")
    }
  }

  const handleEditStore = async () => {
    if (!selectedStore || !formData.name || !formData.shopifyDomain || !formData.accessToken) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await supabaseStore.updateShopifyStore(selectedStore.id, {
        name: formData.name,
        shopifyDomain: formData.shopifyDomain,
        accessToken: formData.accessToken,
        webhookUrl: formData.webhookUrl,
        notes: formData.notes,
      })

      setIsEditDialogOpen(false)
      setSelectedStore(null)
      await loadStores()
      alert("Store updated successfully!")
    } catch (error) {
      console.error("Error updating store:", error)
      alert("Error updating store. Please try again.")
    }
  }

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? This action cannot be undone.")) {
      return
    }

    try {
      await supabaseStore.deleteShopifyStore(storeId)
      await loadStores()
      alert("Store deleted successfully!")
    } catch (error) {
      console.error("Error deleting store:", error)
      alert("Error deleting store. Please try again.")
    }
  }

  const openEditDialog = (store: ShopifyStore) => {
    setSelectedStore(store)
    setFormData({
      name: store.name,
      shopifyDomain: store.shopifyDomain,
      accessToken: store.accessToken,
      webhookUrl: store.webhookUrl || "",
      notes: store.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const testConnection = async (store: ShopifyStore) => {
    try {
      // Update store status to testing
      await supabaseStore.updateShopifyStore(store.id, { status: "Testing" })
      await loadStores()

      // Test the connection (this would typically make an API call to Shopify)
      // For now, we'll simulate a test
      setTimeout(async () => {
        const success = Math.random() > 0.3 // 70% success rate for demo
        await supabaseStore.updateShopifyStore(store.id, {
          status: success ? "Connected" : "Error",
          lastSync: new Date().toISOString(),
        })
        await loadStores()
        alert(success ? "Connection test successful!" : "Connection test failed. Please check your credentials.")
      }, 2000)
    } catch (error) {
      console.error("Error testing connection:", error)
      alert("Error testing connection. Please try again.")
    }
  }

  const exportStores = () => {
    const headers = ["Store Name", "Shopify Domain", "Status", "Last Sync", "Total Orders", "Monthly Revenue", "Notes"]

    const rows = filteredStores.map((store) => [
      store.name,
      store.shopifyDomain,
      store.status,
      store.lastSync === "Never" ? "Never" : new Date(store.lastSync).toLocaleDateString(),
      store.totalOrders.toString(),
      store.monthlyRevenue.toFixed(2),
      store.notes || "",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `shopify_stores_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "Testing":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Disconnected":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "default"
      case "Error":
        return "destructive"
      case "Testing":
        return "secondary"
      case "Disconnected":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Calculate summary statistics
  const totalStores = stores.length
  const connectedStores = stores.filter((store) => store.status === "Connected").length
  const totalOrders = stores.reduce((sum, store) => sum + store.totalOrders, 0)
  const totalRevenue = stores.reduce((sum, store) => sum + store.monthlyRevenue, 0)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Shopify Stores</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading stores...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Store className="h-5 w-5" />
          <span className="hidden sm:inline">Shopify Stores</span>
          <span className="sm:hidden">Stores</span>
        </h1>
      </header>

      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Stores</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalStores}</p>
                </div>
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Connected</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{connectedStores}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalOrders}</p>
                </div>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalRevenue.toLocaleString()} лв</p>
                </div>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-full sm:w-[300px]"
              placeholder="Search stores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadStores} className="flex-1 sm:flex-none bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportStores} className="flex-1 sm:flex-none bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Store</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Shopify Store</DialogTitle>
                  <DialogDescription>
                    Connect a new Shopify store to your warehouse management system.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store-name">Store Name *</Label>
                    <Input
                      id="store-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Shopify Store"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shopify-domain">Shopify Domain *</Label>
                    <Input
                      id="shopify-domain"
                      value={formData.shopifyDomain}
                      onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                      placeholder="mystore.myshopify.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access-token">Access Token *</Label>
                    <Input
                      id="access-token"
                      type="password"
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                      placeholder="shpat_..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://your-domain.com/webhook"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes about this store"
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddStore} className="w-full sm:w-auto">
                    Add Store
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Connected Stores</CardTitle>
            <CardDescription className="text-sm">
              Manage your Shopify store connections and sync settings
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Store Name</TableHead>
                    <TableHead className="min-w-[180px] hidden sm:table-cell">Shopify Domain</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px] hidden md:table-cell">Last Sync</TableHead>
                    <TableHead className="text-right min-w-[80px] hidden lg:table-cell">Orders</TableHead>
                    <TableHead className="text-right min-w-[100px] hidden lg:table-cell">Revenue</TableHead>
                    <TableHead className="text-center min-w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">{store.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{store.shopifyDomain}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(store.status)}
                          <Badge variant={getStatusColor(store.status)} className="text-xs">
                            {store.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                        {store.lastSync === "Never" ? "Never" : new Date(store.lastSync).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">
                        {store.totalOrders}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm hidden lg:table-cell">
                        {store.monthlyRevenue.toFixed(2)} лв
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testConnection(store)}
                            disabled={store.status === "Testing"}
                            className="h-8 w-8"
                            title="Test Connection"
                          >
                            <RefreshCw
                              className={`h-3 w-3 sm:h-4 sm:w-4 ${store.status === "Testing" ? "animate-spin" : ""}`}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(store)}
                            className="h-8 w-8"
                            title="Edit Store"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStore(store.id)}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Delete Store"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredStores.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No stores match your search." : "No stores connected yet."}
                  {!searchTerm && (
                    <div className="mt-4">
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Store
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Store Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Shopify Store</DialogTitle>
              <DialogDescription>Update store connection details and settings.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-store-name">Store Name *</Label>
                <Input
                  id="edit-store-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Shopify Store"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-shopify-domain">Shopify Domain *</Label>
                <Input
                  id="edit-shopify-domain"
                  value={formData.shopifyDomain}
                  onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                  placeholder="mystore.myshopify.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-access-token">Access Token *</Label>
                <Input
                  id="edit-access-token"
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder="shpat_..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-webhook-url">Webhook URL</Label>
                <Input
                  id="edit-webhook-url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://your-domain.com/webhook"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this store"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleEditStore} className="w-full sm:w-auto">
                Update Store
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
