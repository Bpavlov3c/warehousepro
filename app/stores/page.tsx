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
import { Plus, Store, CheckCircle, XCircle, AlertCircle, Edit, Trash2, RefreshCw } from "lucide-react"
import { supabaseStore, type ShopifyStore } from "@/lib/supabase-store"

export default function Stores() {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<ShopifyStore | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    shopifyDomain: "",
    accessToken: "",
    description: "",
  })

  // Load stores on component mount
  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      const storesData = await supabaseStore.getShopifyStores()
      setStores(storesData)
    } catch (error) {
      console.error("Error loading stores:", error)
    }
  }

  const handleAddStore = async () => {
    if (!formData.name || !formData.shopifyDomain || !formData.accessToken) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await supabaseStore.addShopifyStore({
        name: formData.name,
        shopifyDomain: formData.shopifyDomain,
        accessToken: formData.accessToken,
        description: formData.description,
      })

      setFormData({ name: "", shopifyDomain: "", accessToken: "", description: "" })
      setIsAddDialogOpen(false)
      await loadStores()
      alert("Store added successfully!")
    } catch (error) {
      console.error("Error adding store:", error)
      alert("Error adding store. Please try again.")
    }
  }

  const handleEditStore = async () => {
    if (!editingStore || !formData.name || !formData.shopifyDomain || !formData.accessToken) {
      alert("Please fill in all required fields")
      return
    }

    try {
      await supabaseStore.updateShopifyStore(editingStore.id, {
        name: formData.name,
        shopifyDomain: formData.shopifyDomain,
        accessToken: formData.accessToken,
        description: formData.description,
      })

      setFormData({ name: "", shopifyDomain: "", accessToken: "", description: "" })
      setIsEditDialogOpen(false)
      setEditingStore(null)
      await loadStores()
      alert("Store updated successfully!")
    } catch (error) {
      console.error("Error updating store:", error)
      alert("Error updating store. Please try again.")
    }
  }

  const handleDeleteStore = async (store: ShopifyStore) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await supabaseStore.deleteShopifyStore(store.id)
      await loadStores()
      alert("Store deleted successfully!")
    } catch (error) {
      console.error("Error deleting store:", error)
      alert("Error deleting store. Please try again.")
    }
  }

  const testConnection = async (store: ShopifyStore) => {
    setIsTestingConnection(store.id)
    try {
      const response = await fetch("/api/shopify-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: store.shopifyDomain,
          accessToken: store.accessToken,
        }),
      })

      const result = await response.json()

      if (result.ok) {
        await supabaseStore.updateShopifyStore(store.id, {
          status: "Connected",
          lastSync: new Date().toISOString(),
        })
        alert("Connection successful!")
      } else {
        await supabaseStore.updateShopifyStore(store.id, { status: "Error" })
        alert(`Connection failed: ${result.error}`)
      }

      await loadStores()
    } catch (error) {
      console.error("Connection test failed:", error)
      await supabaseStore.updateShopifyStore(store.id, { status: "Error" })
      alert("Connection test failed. Please check your credentials.")
      await loadStores()
    } finally {
      setIsTestingConnection(null)
    }
  }

  const openEditDialog = (store: ShopifyStore) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      shopifyDomain: store.shopifyDomain,
      accessToken: store.accessToken,
      description: store.description || "",
    })
    setIsEditDialogOpen(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "Error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "Testing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "bg-green-100 text-green-800"
      case "Error":
        return "bg-red-100 text-red-800"
      case "Testing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const connectedStores = stores.filter((s) => s.status === "Connected")
  const totalOrders = stores.reduce((sum, store) => sum + store.totalOrders, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Shopify Stores</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">Configured stores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedStores.length}</div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">Synced orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Store Connections</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Shopify Store</DialogTitle>
                <DialogDescription>Connect a new Shopify store to sync orders and inventory.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Store Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Store"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="domain" className="text-right">
                    Shopify Domain *
                  </Label>
                  <Input
                    id="domain"
                    placeholder="mystore.myshopify.com"
                    value={formData.shopifyDomain}
                    onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="token" className="text-right">
                    Access Token *
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="shpat_..."
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddStore}>Add Store</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Stores</CardTitle>
            <CardDescription>Manage your Shopify store connections and sync settings.</CardDescription>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Stores Connected</h3>
                <p className="text-muted-foreground mb-4">Add your first Shopify store to start syncing orders.</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Store
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{store.name}</div>
                          {store.description && (
                            <div className="text-sm text-muted-foreground">{store.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{store.shopifyDomain}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(store.status)}
                          <Badge className={getStatusColor(store.status)}>{store.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{store.totalOrders}</TableCell>
                      <TableCell>{store.lastSync ? new Date(store.lastSync).toLocaleDateString() : "Never"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnection(store)}
                            disabled={isTestingConnection === store.id}
                          >
                            <RefreshCw
                              className={`h-4 w-4 mr-1 ${isTestingConnection === store.id ? "animate-spin" : ""}`}
                            />
                            Test
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(store)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteStore(store)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Store Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Store - {editingStore?.name}</DialogTitle>
              <DialogDescription>Update store connection details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Store Name *
                </Label>
                <Input
                  id="edit-name"
                  placeholder="My Store"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-domain" className="text-right">
                  Shopify Domain *
                </Label>
                <Input
                  id="edit-domain"
                  placeholder="mystore.myshopify.com"
                  value={formData.shopifyDomain}
                  onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-token" className="text-right">
                  Access Token *
                </Label>
                <Input
                  id="edit-token"
                  type="password"
                  placeholder="shpat_..."
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStore}>Update Store</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
