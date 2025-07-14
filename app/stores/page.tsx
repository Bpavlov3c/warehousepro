"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Plus, Store, DollarSign, TrendingUp, Calendar, Trash2, Eye, Edit } from "lucide-react"
import { supabaseStore, type StoreData } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Stores() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null)
  const [isNewStoreOpen, setIsNewStoreOpen] = useState(false)
  const [isViewStoreOpen, setIsViewStoreOpen] = useState(false)
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreData | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    apiKey: "",
    apiSecret: "",
    notes: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const storeData = await supabaseStore.getStores()
        setStores(storeData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stores")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreateStore = async () => {
    // Validate form data
    if (!formData.name || !formData.url) {
      alert("Please fill in required fields (Name and URL)")
      return
    }

    try {
      const newStoreData = {
        name: formData.name,
        url: formData.url,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        notes: formData.notes,
        status: "Active" as const,
      }

      await supabaseStore.createStore(newStoreData)
      const updatedStores = await supabaseStore.getStores()
      setStores(updatedStores)

      // Reset form
      setFormData({ name: "", url: "", apiKey: "", apiSecret: "", notes: "" })
      setIsNewStoreOpen(false)

      alert(`Store ${formData.name} created successfully!`)
    } catch (error) {
      console.error("Error creating store:", error)
      alert("Error creating store. Please try again.")
    }
  }

  const handleEditStore = async () => {
    if (!editingStore) return

    // Validate form data
    if (!formData.name || !formData.url) {
      alert("Please fill in required fields (Name and URL)")
      return
    }

    try {
      const updateData = {
        name: formData.name,
        url: formData.url,
        api_key: formData.apiKey,
        api_secret: formData.apiSecret,
        notes: formData.notes,
      }

      await supabaseStore.updateStore(editingStore.id, updateData)

      // Refresh the stores list
      const updatedStores = await supabaseStore.getStores()
      setStores(updatedStores)

      // Reset form and close dialog
      setFormData({ name: "", url: "", apiKey: "", apiSecret: "", notes: "" })
      setIsEditStoreOpen(false)
      setEditingStore(null)

      alert(`Store ${formData.name} updated successfully!`)
    } catch (error) {
      console.error("Error updating store:", error)
      alert("Error updating store. Please try again.")
    }
  }

  const openEditDialog = (store: StoreData) => {
    setEditingStore(store)
    setFormData({
      name: store.name,
      url: store.url,
      apiKey: store.api_key || "",
      apiSecret: store.api_secret || "",
      notes: store.notes || "",
    })
    setIsEditStoreOpen(true)
  }

  const handleDeleteStore = async (store: StoreData) => {
    if (!confirm(`Are you sure you want to delete store "${store.name}"?`)) {
      return
    }

    try {
      await supabaseStore.deleteStore(store.id)
      const updatedStores = await supabaseStore.getStores()
      setStores(updatedStores)
      alert(`Store ${store.name} deleted successfully!`)
    } catch (error) {
      console.error("Error deleting store:", error)
      alert("Error deleting store. Please try again.")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalStats = {
    totalStores: filteredStores.length,
    activeStores: filteredStores.filter((store) => store.status.toLowerCase() === "active").length,
    inactiveStores: filteredStores.filter((store) => store.status.toLowerCase() === "inactive").length,
    errorStores: filteredStores.filter((store) => store.status.toLowerCase() === "error").length,
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Stores</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-64">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Stores</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading stores</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Stores</h1>
          <Button onClick={() => setIsNewStoreOpen(true)} size="sm" className="lg:hidden">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-64">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Stores</h1>
          <Button onClick={() => setIsNewStoreOpen(true)} size="sm" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            Add Store
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Stores</p>
                <p className="text-lg font-bold">{totalStats.totalStores}</p>
              </div>
              <Store className="w-5 h-5 text-blue-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-lg font-bold text-green-600">{totalStats.activeStores}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Inactive</p>
                <p className="text-lg font-bold text-gray-600">{totalStats.inactiveStores}</p>
              </div>
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Errors</p>
                <p className="text-lg font-bold text-red-600">{totalStats.errorStores}</p>
              </div>
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Mobile Card View / Desktop Table View */}
        <div className="lg:hidden space-y-3">
          {filteredStores.length === 0 ? (
            <Card className="p-6 text-center">
              <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No stores found." : "No stores yet."}</p>
              {!searchTerm && (
                <Button onClick={() => setIsNewStoreOpen(true)} className="mt-2" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Store
                </Button>
              )}
            </Card>
          ) : (
            filteredStores.map((store) => (
              <Card key={store.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{store.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{store.url}</p>
                  </div>
                  <Badge className={`${getStatusColor(store.status)} text-xs`}>{store.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <p>{new Date(store.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">API Key:</span>
                    <p>{store.api_key ? "Set" : "Not Set"}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(store)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStore(store)
                      setIsViewStoreOpen(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteStore(store)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead>Store Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px]">API Key</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">{searchTerm ? "No stores found." : "No stores yet."}</p>
                      {!searchTerm && (
                        <Button onClick={() => setIsNewStoreOpen(true)} className="mt-2" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Store
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id} className="h-12">
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{store.url}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(store.status)} text-xs px-2 py-1`}>{store.status}</Badge>
                      </TableCell>
                      <TableCell>{store.api_key ? "Set" : "Not Set"}</TableCell>
                      <TableCell className="text-sm">{new Date(store.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(store)} title="Edit Store">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedStore(store)
                              setIsViewStoreOpen(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStore(store)}
                            title="Delete Store"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Store Dialog */}
        <Dialog open={isViewStoreOpen} onOpenChange={setIsViewStoreOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Store Details - {selectedStore?.name}</DialogTitle>
              <DialogDescription>View store configuration and settings</DialogDescription>
            </DialogHeader>

            {selectedStore && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Store Name</p>
                    <p className="font-medium">{selectedStore.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge className={getStatusColor(selectedStore.status)}>{selectedStore.status}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">Store URL</p>
                    <p className="font-medium break-all">{selectedStore.url}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">API Key</p>
                    <p className="font-medium">{selectedStore.api_key ? "••••••••" : "Not Set"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">API Secret</p>
                    <p className="font-medium">{selectedStore.api_secret ? "••••••••" : "Not Set"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">{new Date(selectedStore.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Last Updated</p>
                    <p className="font-medium">{new Date(selectedStore.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {selectedStore.notes && (
                  <div>
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="text-sm bg-gray-50 p-2 rounded">{selectedStore.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create New Store Dialog */}
        <Dialog open={isNewStoreOpen} onOpenChange={setIsNewStoreOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Store</DialogTitle>
              <DialogDescription>Connect a new Shopify store to your warehouse management system</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name">Store Name *</label>
                  <Input
                    id="name"
                    placeholder="My Shopify Store"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="url">Store URL *</label>
                  <Input
                    id="url"
                    placeholder="https://mystore.myshopify.com"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="api-key">API Key</label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Your Shopify API Key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="api-secret">API Secret</label>
                  <Input
                    id="api-secret"
                    type="password"
                    placeholder="Your Shopify API Secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="notes">Notes</label>
                <Input
                  id="notes"
                  placeholder="Additional notes about this store..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewStoreOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateStore}>Add Store</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Store Dialog */}
        <Dialog open={isEditStoreOpen} onOpenChange={setIsEditStoreOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Store - {editingStore?.name}</DialogTitle>
              <DialogDescription>Update store configuration and settings</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name">Store Name *</label>
                  <Input
                    id="edit-name"
                    placeholder="My Shopify Store"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-url">Store URL *</label>
                  <Input
                    id="edit-url"
                    placeholder="https://mystore.myshopify.com"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-api-key">API Key</label>
                  <Input
                    id="edit-api-key"
                    type="password"
                    placeholder="Your Shopify API Key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-api-secret">API Secret</label>
                  <Input
                    id="edit-api-secret"
                    type="password"
                    placeholder="Your Shopify API Secret"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-notes">Notes</label>
                <Input
                  id="edit-notes"
                  placeholder="Additional notes about this store..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditStoreOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditStore}>Update Store</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
