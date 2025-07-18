"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Store, Globe, CheckCircle, XCircle, AlertCircle, Edit, Trash2, RefreshCw } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"
import type { ShopifyStore } from "@/lib/supabase-store"

export default function StoresPage() {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<ShopifyStore | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    shopifyDomain: "",
    accessToken: "",
    status: "Testing" as const,
    webhookUrl: "",
    notes: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Load stores on component mount
  useEffect(() => {
    loadStores()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await supabaseStore.getShopifyStores()
      setStores(data)
    } catch (err) {
      console.error("Error loading stores:", err)
      setError("Failed to load stores")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = "Store name is required"
    }

    if (!formData.shopifyDomain.trim()) {
      errors.shopifyDomain = "Shopify domain is required"
    } else if (!formData.shopifyDomain.includes(".myshopify.com")) {
      errors.shopifyDomain = "Domain should be in format: yourstore.myshopify.com"
    }

    if (!formData.accessToken.trim()) {
      errors.accessToken = "Access token is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      if (editingStore) {
        // Update existing store
        await supabaseStore.updateShopifyStore(editingStore.id, {
          name: formData.name,
          shopifyDomain: formData.shopifyDomain,
          accessToken: formData.accessToken,
          status: formData.status,
          webhookUrl: formData.webhookUrl || undefined,
          notes: formData.notes || undefined,
        })
        setIsEditDialogOpen(false)
        setEditingStore(null)
      } else {
        // Create new store
        await supabaseStore.createShopifyStore({
          name: formData.name,
          shopify_domain: formData.shopifyDomain,
          access_token: formData.accessToken,
          status: formData.status,
          webhook_url: formData.webhookUrl || undefined,
          notes: formData.notes || undefined,
        })
        setIsAddDialogOpen(false)
      }

      // Reset form
      setFormData({
        name: "",
        shopifyDomain: "",
        accessToken: "",
        status: "Testing",
        webhookUrl: "",
        notes: "",
      })
      setFormErrors({})

      // Reload stores
      await loadStores()
    } catch (err) {
      console.error("Error saving store:", err)
      setError("Failed to save store")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (store: ShopifyStore) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      shopifyDomain: store.shopifyDomain,
      accessToken: store.accessToken,
      status: store.status,
      webhookUrl: store.webhookUrl || "",
      notes: store.notes || "",
    })
    setFormErrors({})
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (store: ShopifyStore) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"? This will also delete all associated orders.`)) {
      return
    }

    try {
      await supabaseStore.deleteShopifyStore(store.id)
      await loadStores()
    } catch (err) {
      console.error("Error deleting store:", err)
      setError("Failed to delete store")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Connected":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "Testing":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case "Error":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <XCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "bg-green-100 text-green-800"
      case "Testing":
        return "bg-yellow-100 text-yellow-800"
      case "Error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Calculate stats
  const stats = {
    total: stores.length,
    connected: stores.filter((s) => s.status === "Connected").length,
    testing: stores.filter((s) => s.status === "Testing").length,
    error: stores.filter((s) => s.status === "Error").length,
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Stores</h1>
        </header>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Stores</h1>
          <div className="flex items-center gap-2">
            <Button onClick={loadStores} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Shopify Store</DialogTitle>
                  <DialogDescription>
                    Connect a new Shopify store to sync orders and manage inventory.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Store Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Shopify Store"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="shopifyDomain">Shopify Domain *</Label>
                    <Input
                      id="shopifyDomain"
                      value={formData.shopifyDomain}
                      onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                      placeholder="yourstore.myshopify.com"
                      className={formErrors.shopifyDomain ? "border-red-500" : ""}
                    />
                    {formErrors.shopifyDomain && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.shopifyDomain}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                      placeholder="shpat_..."
                      className={formErrors.accessToken ? "border-red-500" : ""}
                    />
                    {formErrors.accessToken && <p className="text-sm text-red-600 mt-1">{formErrors.accessToken}</p>}
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Connected">Connected</SelectItem>
                        <SelectItem value="Error">Error</SelectItem>
                        <SelectItem value="Disconnected">Disconnected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://your-app.com/webhooks/shopify"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this store..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Adding..." : "Add Store"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Stores</h1>
          <div className="hidden lg:flex items-center gap-2">
            <Button onClick={loadStores} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Store
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Shopify Store</DialogTitle>
                  <DialogDescription>
                    Connect a new Shopify store to sync orders and manage inventory.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Store Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Shopify Store"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="shopifyDomain">Shopify Domain *</Label>
                    <Input
                      id="shopifyDomain"
                      value={formData.shopifyDomain}
                      onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                      placeholder="yourstore.myshopify.com"
                      className={formErrors.shopifyDomain ? "border-red-500" : ""}
                    />
                    {formErrors.shopifyDomain && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.shopifyDomain}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                      placeholder="shpat_..."
                      className={formErrors.accessToken ? "border-red-500" : ""}
                    />
                    {formErrors.accessToken && <p className="text-sm text-red-600 mt-1">{formErrors.accessToken}</p>}
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Testing">Testing</SelectItem>
                        <SelectItem value="Connected">Connected</SelectItem>
                        <SelectItem value="Error">Error</SelectItem>
                        <SelectItem value="Disconnected">Disconnected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://your-app.com/webhooks/shopify"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this store..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Adding..." : "Add Store"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Stores</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Store className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Connected</p>
                  <p className="text-2xl font-bold text-green-600">{stats.connected}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Testing</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.testing}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle>Shopify Stores</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8">
                <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stores connected</h3>
                <p className="text-gray-500 mb-4">Connect your first Shopify store to start syncing orders.</p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Store
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{store.name}</div>
                          {store.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">{store.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{store.shopifyDomain}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(store.status)}
                          <Badge className={getStatusColor(store.status)}>{store.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{store.lastSync}</TableCell>
                      <TableCell>{store.totalOrders.toLocaleString()}</TableCell>
                      <TableCell>${store.monthlyRevenue.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(store)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(store)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Store</DialogTitle>
              <DialogDescription>Update store information and settings.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Store Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Shopify Store"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="edit-shopifyDomain">Shopify Domain *</Label>
                <Input
                  id="edit-shopifyDomain"
                  value={formData.shopifyDomain}
                  onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
                  placeholder="yourstore.myshopify.com"
                  className={formErrors.shopifyDomain ? "border-red-500" : ""}
                />
                {formErrors.shopifyDomain && <p className="text-sm text-red-600 mt-1">{formErrors.shopifyDomain}</p>}
              </div>

              <div>
                <Label htmlFor="edit-accessToken">Access Token *</Label>
                <Input
                  id="edit-accessToken"
                  type="password"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder="shpat_..."
                  className={formErrors.accessToken ? "border-red-500" : ""}
                />
                {formErrors.accessToken && <p className="text-sm text-red-600 mt-1">{formErrors.accessToken}</p>}
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Testing">Testing</SelectItem>
                    <SelectItem value="Connected">Connected</SelectItem>
                    <SelectItem value="Error">Error</SelectItem>
                    <SelectItem value="Disconnected">Disconnected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-webhookUrl">Webhook URL</Label>
                <Input
                  id="edit-webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://your-app.com/webhooks/shopify"
                />
              </div>

              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this store..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingStore(null)
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Store"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
