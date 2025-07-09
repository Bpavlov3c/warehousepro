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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Settings,
  Store,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { dataStore, type ShopifyStore } from "@/lib/store"

export default function Stores() {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null)
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false)
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    shopifyDomain: "",
    accessToken: "",
    webhookUrl: "",
    notes: "",
  })

  // Load data on component mount
  useEffect(() => {
    setStores(dataStore.getShopifyStores())
  }, [])

  const handleCreateStore = async () => {
    try {
      // Test connection first
      setIsTestingConnection(true)
      const isValid = await testShopifyConnection(formData.shopifyDomain, formData.accessToken)

      if (isValid) {
        const newStoreData = {
          name: formData.name,
          shopifyDomain: formData.shopifyDomain,
          accessToken: formData.accessToken,
          status: "Connected" as const,
          lastSync: "Never",
          totalOrders: 0,
          monthlyRevenue: 0,
          webhookUrl: formData.webhookUrl,
          notes: formData.notes,
        }

        const newStore = dataStore.createShopifyStore(newStoreData)
        setStores(dataStore.getShopifyStores())
        setIsNewStoreOpen(false)
        setFormData({ name: "", shopifyDomain: "", accessToken: "", webhookUrl: "", notes: "" })
        alert(`Store "${newStore.name}" added successfully!`)
      } else {
        alert("Failed to connect to Shopify store. Please check your credentials.")
      }
    } catch (error) {
      console.error("Failed to create store:", error)
      alert("Error creating store. Please try again.")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleEditStore = async () => {
    if (!selectedStore) return

    try {
      setIsTestingConnection(true)
      const isValid = await testShopifyConnection(formData.shopifyDomain, formData.accessToken)

      if (isValid) {
        const updates = {
          name: formData.name,
          shopifyDomain: formData.shopifyDomain,
          accessToken: formData.accessToken,
          webhookUrl: formData.webhookUrl,
          notes: formData.notes,
          status: "Connected" as const,
        }

        const updatedStore = dataStore.updateShopifyStore(selectedStore.id, updates)
        if (updatedStore) {
          setStores(dataStore.getShopifyStores())
          setIsEditStoreOpen(false)
          setSelectedStore(null)
          alert(`Store "${updatedStore.name}" updated successfully!`)
        }
      } else {
        alert("Failed to connect to Shopify store. Please check your credentials.")
      }
    } catch (error) {
      console.error("Failed to update store:", error)
      alert("Error updating store. Please try again.")
    } finally {
      setIsTestingConnection(false)
    }
  }

  const testShopifyConnection = async (domain: string, accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/shopify-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, accessToken }),
      })

      const data = await response.json()
      if (data.ok) return true

      console.error("Connection test failed:", data.error)
      return false
    } catch (error) {
      console.error("Connection test failed:", error)
      return false
    }
  }

  const handleSyncOrders = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    if (!store) return

    try {
      // Update store status to show syncing
      dataStore.updateShopifyStore(storeId, { status: "Testing" })
      setStores(dataStore.getShopifyStores())

      // Sync orders
      const orders = await syncShopifyOrders(store.shopifyDomain, store.accessToken)

      // Update store with new sync time and order count
      dataStore.updateShopifyStore(storeId, {
        status: "Connected",
        lastSync: "Just now",
        totalOrders: store.totalOrders + orders.length,
      })
      setStores(dataStore.getShopifyStores())

      alert(`Successfully synced ${orders.length} orders from ${store.name}`)
    } catch (error) {
      console.error("Sync failed:", error)
      dataStore.updateShopifyStore(storeId, { status: "Error" })
      setStores(dataStore.getShopifyStores())
      alert("Failed to sync orders. Please check your store connection.")
    }
  }

  // Uses server-side proxy to avoid CORS
  const syncShopifyOrders = async (domain: string, accessToken: string) => {
    try {
      const res = await fetch("/api/shopify-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, accessToken }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Unknown error")

      console.log(`Synced ${data.orders.length} orders from ${domain}`)
      // TODO: Persist in DB. For demo, just log.
      return data.orders
    } catch (err) {
      console.error("Order sync failed:", err)
      throw err
    }
  }

  const handleDeleteStore = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    if (!store) return

    if (confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      const success = dataStore.deleteShopifyStore(storeId)
      if (success) {
        setStores(dataStore.getShopifyStores())
        alert(`Store "${store.name}" deleted successfully.`)
      }
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
    setIsEditStoreOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "bg-green-100 text-green-800"
      case "Error":
        return "bg-red-100 text-red-800"
      case "Testing":
        return "bg-blue-100 text-blue-800"
      case "Disconnected":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.shopifyDomain.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalStores = stores.length
  const connectedStores = stores.filter((s) => s.status === "Connected").length
  const totalOrders = stores.reduce((sum, store) => sum + store.totalOrders, 0)
  const totalRevenue = stores.reduce((sum, store) => sum + store.monthlyRevenue, 0)
  const errorStores = stores.filter((s) => s.status === "Error").length

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Shopify Stores</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStores}</div>
              <p className="text-xs text-muted-foreground">{connectedStores} connected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all stores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{connectedStores}</div>
              <p className="text-xs text-muted-foreground">{errorStores} errors</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isNewStoreOpen} onOpenChange={setIsNewStoreOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Shopify Store</DialogTitle>
                  <DialogDescription>Connect a new Shopify store to sync orders and manage inventory</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-name">Store Name</Label>
                      <Input
                        id="store-name"
                        placeholder="My Store"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shopify-domain">Shopify Domain</Label>
                      <Input
                        id="shopify-domain"
                        placeholder="mystore.myshopify.com"
                        value={formData.shopifyDomain}
                        onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="access-token">Access Token</Label>
                    <Input
                      id="access-token"
                      type="password"
                      placeholder="shpat_..."
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL (Optional)</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://yourapp.com/webhook"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Store description or notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      You'll need to create a private app in your Shopify admin to get the API access token. Required
                      permissions: read_orders, read_products, read_customers.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewStoreOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateStore} disabled={isTestingConnection}>
                    {isTestingConnection ? "Testing..." : "Add Store"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Stores</CardTitle>
            <CardDescription>Manage your Shopify store connections and sync settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{store.shopifyDomain}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`https://${store.shopifyDomain}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(store.status)}>{store.status}</Badge>
                    </TableCell>
                    <TableCell>{store.lastSync}</TableCell>
                    <TableCell>{store.totalOrders.toLocaleString()}</TableCell>
                    <TableCell>${store.monthlyRevenue.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncOrders(store.id)}
                          disabled={store.status === "Testing"}
                        >
                          <RefreshCw className={`h-4 w-4 ${store.status === "Testing" ? "animate-spin" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(store)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedStore(store)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Store Details - {selectedStore?.name}</DialogTitle>
                              <DialogDescription>Complete store information and settings</DialogDescription>
                            </DialogHeader>
                            {selectedStore && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Store Name</Label>
                                    <p className="text-sm text-muted-foreground">{selectedStore.name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Domain</Label>
                                    <p className="text-sm text-muted-foreground">{selectedStore.shopifyDomain}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Badge className={getStatusColor(selectedStore.status)}>
                                      {selectedStore.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Created</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedStore.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Total Orders</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedStore.totalOrders.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Monthly Revenue</Label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedStore.monthlyRevenue.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {selectedStore.webhookUrl && (
                                  <div>
                                    <Label className="text-sm font-medium">Webhook URL</Label>
                                    <p className="text-sm text-muted-foreground">{selectedStore.webhookUrl}</p>
                                  </div>
                                )}
                                {selectedStore.notes && (
                                  <div>
                                    <Label className="text-sm font-medium">Notes</Label>
                                    <p className="text-sm text-muted-foreground">{selectedStore.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStore(store.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Store Dialog */}
        <Dialog open={isEditStoreOpen} onOpenChange={setIsEditStoreOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Store - {selectedStore?.name}</DialogTitle>
              <DialogDescription>Update store connection settings</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-store-name">Store Name</Label>
                  <Input
                    id="edit-store-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-shopify-domain">Shopify Domain</Label>
                  <Input
                    id="edit-shopify-domain"
                    value={formData.shopifyDomain}
                    onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-access-token">Access Token</Label>
                <Input
                  id="edit-access-token"
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-webhook-url">Webhook URL</Label>
                <Input
                  id="edit-webhook-url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditStoreOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStore} disabled={isTestingConnection}>
                {isTestingConnection ? "Testing..." : "Update Store"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
