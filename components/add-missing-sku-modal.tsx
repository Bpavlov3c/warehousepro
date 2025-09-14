"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

interface AddMissingSKUModalProps {
  isOpen: boolean
  onClose: () => void
  sku?: string
  onSuccess: () => void
}

export function AddMissingSKUModal({ isOpen, onClose, sku = "", onSuccess }: AddMissingSKUModalProps) {
  const [formData, setFormData] = useState({
    sku: sku,
    productName: "",
    description: "",
    barcode: sku,
    minStock: 5,
    maxStock: 100,
    quantity: 0,
    unitCost: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: productError } = await supabase.from("products").insert({
        sku: formData.sku,
        product_name: formData.productName,
        description: formData.description,
        barcode: formData.barcode,
        min_stock: formData.minStock,
        max_stock: formData.maxStock,
      })

      if (productError) throw productError

      if (formData.quantity > 0) {
        const { error: inventoryError } = await supabase.from("inventory").insert({
          sku: formData.sku,
          product_name: formData.productName,
          quantity_available: formData.quantity,
          original_unit_cost: formData.unitCost,
          unit_cost_with_delivery: formData.unitCost,
          original_currency: "USD",
          purchase_date: new Date().toISOString().split("T")[0],
        })

        if (inventoryError) throw inventoryError
      }

      onSuccess()
      onClose()
      setFormData({
        sku: "",
        productName: "",
        description: "",
        barcode: "",
        minStock: 5,
        maxStock: 100,
        quantity: 0,
        unitCost: 0,
      })
    } catch (error) {
      console.error("Error adding SKU:", error)
      alert("Error adding SKU. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Missing SKU</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData((prev) => ({ ...prev, productName: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData((prev) => ({ ...prev, minStock: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input
                id="maxStock"
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxStock: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Initial Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="unitCost">Unit Cost</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) => setFormData((prev) => ({ ...prev, unitCost: Number.parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Adding..." : "Add SKU"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
