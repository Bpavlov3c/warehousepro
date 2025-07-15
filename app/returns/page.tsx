"use client"

import type React from "react"
import { SelectValue } from "@/components/ui/select"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, Package, DollarSign, TrendingUp, Calendar, Trash2, Eye, Edit } from "lucide-react"
import { supabaseStore, type Return } from "@/lib/supabase-store"

type NewItem = {
  sku: string
  productName: string
  quantity: string
  reason: string
  condition: string
  unitPrice: string
  totalRefund: string
}

/* -------------------------------------------------------------------------- */
/*                             Returns Page Component                          */
/* -------------------------------------------------------------------------- */

export default function Returns() {
  /* ------------------------------- state ---------------------------------- */
  const [returns, setReturns] = useState<Return[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingReturn, setEditingReturn] = useState<Return | null>(null)

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    orderNumber: "",
    returnDate: "",
    notes: "",
  })

  const [items, setItems] = useState<NewItem[]>([
    {
      sku: "",
      productName: "",
      quantity: "",
      reason: "Other", // default valid value
      condition: "Good",
      unitPrice: "",
      totalRefund: "",
    },
  ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ---------------------------- initial fetch ----------------------------- */
  useEffect(() => {
    ;(async () => {
      try {
        const data = await supabaseStore.getReturns()
        setReturns(data)
      } catch (e) {
        setError((e as Error).message ?? "Failed to load returns")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* --------------------------- helper functions --------------------------- */
  const resetForm = () => {
    setForm({
      customerName: "",
      customerEmail: "",
      orderNumber: "",
      returnDate: "",
      notes: "",
    })
    setItems([
      {
        sku: "",
        productName: "",
        quantity: "",
        reason: "Other",
        condition: "Good",
        unitPrice: "",
        totalRefund: "",
      },
    ])
  }

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        sku: "",
        productName: "",
        quantity: "",
        reason: "Other",
        condition: "Good",
        unitPrice: "",
        totalRefund: "",
      },
    ])

  const updateItem = (idx: number, key: keyof NewItem, val: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)))

  const removeItem = (idx: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const statusColor = (s: string) =>
    ({
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    })[s.toLowerCase()] ?? "bg-gray-100 text-gray-800"

  /* ------------------------------ mutations ------------------------------- */
  const buildItemPayload = (it: NewItem) => ({
    sku: it.sku,
    product_name: it.productName,
    quantity: Number.parseInt(it.quantity) || 0,
    reason: it.reason || "Other",
    condition: it.condition || "Good",
    unit_price: Number.parseFloat(it.unitPrice) || 0,
    total_refund: Number.parseFloat(it.totalRefund) || 0,
  })

  const handleCreate = async () => {
    if (!form.customerName || !form.returnDate) {
      alert("Customer name and return date are required.")
      return
    }

    const invalid = items.some((i) => !i.reason || !i.condition)
    if (invalid) {
      alert("Every item must have a reason and condition.")
      return
    }

    try {
      const totalRefund = items.reduce((s, i) => s + (Number.parseFloat(i.totalRefund) || 0), 0)

      await supabaseStore.createReturn({
        customer_name: form.customerName,
        customer_email: form.customerEmail,
        order_number: form.orderNumber,
        return_date: form.returnDate,
        status: "Pending",
        total_refund: totalRefund,
        notes: form.notes,
        items: items.filter((i) => i.sku && i.productName).map(buildItemPayload),
      })

      setReturns(await supabaseStore.getReturns())
      resetForm()
      setIsNewOpen(false)
    } catch (e) {
      console.error(e)
      alert("Unable to create return.")
    }
  }

  const handleUpdate = async () => {
    if (!editingReturn) return
    if (!form.customerName || !form.returnDate) {
      alert("Customer name and return date are required.")
      return
    }
    const invalid = items.some((i) => !i.reason || !i.condition)
    if (invalid) {
      alert("Every item must have a reason and condition.")
      return
    }
    try {
      await supabaseStore.updateReturn(editingReturn.id, {
        customer_name: form.customerName,
        customer_email: form.customerEmail,
        order_number: form.orderNumber,
        return_date: form.returnDate,
        total_refund: items.reduce((s, i) => s + (Number.parseFloat(i.totalRefund) || 0), 0),
        notes: form.notes,
      })
      setReturns(await supabaseStore.getReturns())
      resetForm()
      setEditingReturn(null)
      setIsEditOpen(false)
    } catch (e) {
      console.error(e)
      alert("Unable to update return.")
    }
  }

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    try {
      await supabaseStore.updateReturn(returnId, {
        status: newStatus as "Pending" | "Processing" | "Accepted" | "Rejected",
      })
      setReturns(await supabaseStore.getReturns())
    } catch (e) {
      console.error(e)
      alert("Unable to update return status.")
    }
  }

  /* ------------------------------------------------------------------------ */
  /*                               UI RENDER                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) return <div className="flex items-center justify-center h-64">Loading…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-600">{error}</div>

  const filtered = returns.filter(
    (r) =>
      r.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.order_number && r.order_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Returns</h1>
          <Button onClick={() => setIsNewOpen(true)} size="sm" className="lg:hidden">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Returns</h1>
          <Button onClick={() => setIsNewOpen(true)} size="sm" className="hidden lg:flex">
            <Plus className="h-4 w-4 mr-2" /> New Return
          </Button>
        </div>

        {/* metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Package} label="Total Returns" value={returns.length} />
          <Metric icon={TrendingUp} label="Pending" value={returns.filter((r) => r.status === "Pending").length} />
          <Metric icon={Calendar} label="Processing" value={returns.filter((r) => r.status === "Processing").length} />
          <Metric
            icon={DollarSign}
            label="Total Refunds"
            value={`$${returns.reduce((s, r) => s + (r.total_refund || 0), 0).toFixed(2)}`}
          />
        </div>

        {/* search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search returns…"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.return_number}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell>{r.order_number || "—"}</TableCell>
                    <TableCell>{new Date(r.return_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(value) => handleStatusChange(r.id, value)}>
                        <SelectTrigger className="w-32">
                          <Badge className={statusColor(r.status)}>{r.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">
                            <Badge className={statusColor("Pending")}>Pending</Badge>
                          </SelectItem>
                          <SelectItem value="Processing">
                            <Badge className={statusColor("Processing")}>Processing</Badge>
                          </SelectItem>
                          <SelectItem value="Accepted">
                            <Badge className={statusColor("Accepted")}>Accepted</Badge>
                          </SelectItem>
                          <SelectItem value="Rejected">
                            <Badge className={statusColor("Rejected")}>Rejected</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{r.return_items.length}</TableCell>
                    <TableCell>${(r.total_refund || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <IconBtn
                          icon={Eye}
                          onClick={() => {
                            setSelectedReturn(r)
                            setIsViewOpen(true)
                          }}
                        />
                        <IconBtn
                          icon={Edit}
                          onClick={() => {
                            setEditingReturn(r)
                            setForm({
                              customerName: r.customer_name,
                              customerEmail: r.customer_email || "",
                              orderNumber: r.order_number || "",
                              returnDate: r.return_date,
                              notes: r.notes || "",
                            })
                            setItems(
                              r.return_items.map((it) => ({
                                sku: it.sku,
                                productName: it.product_name,
                                quantity: it.quantity.toString(),
                                reason: it.reason || "Other",
                                condition: it.condition || "Good",
                                unitPrice: (it.unit_price || 0).toString(),
                                totalRefund: (it.total_refund || 0).toString(),
                              })),
                            )
                            setIsEditOpen(true)
                          }}
                        />
                        <IconBtn
                          icon={Trash2}
                          onClick={async () => {
                            if (confirm(`Delete return ${r.return_number}?  This cannot be undone.`)) {
                              await supabaseStore.deleteReturn(r.id)
                              setReturns(await supabaseStore.getReturns())
                            }
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* dialogs */}
        <ReturnDialog
          title="Create New Return"
          open={isNewOpen}
          setOpen={setIsNewOpen}
          form={form}
          setForm={setForm}
          items={items}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          onSave={handleCreate}
        />
        {editingReturn && (
          <ReturnDialog
            title="Edit Return"
            open={isEditOpen}
            setOpen={setIsEditOpen}
            form={form}
            setForm={setForm}
            items={items}
            updateItem={updateItem}
            addItem={addItem}
            removeItem={removeItem}
            onSave={handleUpdate}
          />
        )}
        {selectedReturn && (
          <ViewDialog
            open={isViewOpen}
            setOpen={setIsViewOpen}
            returnOrder={selectedReturn}
            statusColor={statusColor}
          />
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                          Small reusable sub-components                     */
/* -------------------------------------------------------------------------- */

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardContent className="p-6 space-y-1">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function IconBtn({ icon: Icon, ...props }: React.ComponentProps<"button"> & { icon: typeof Eye }) {
  return (
    <Button variant="outline" size="sm" {...props}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}

/* ---------------------------- Dialog Components --------------------------- */

type DialogProps = {
  title: string
  open: boolean
  setOpen: (o: boolean) => void
  form: typeof initialForm
  setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>
  items: NewItem[]
  updateItem: (idx: number, k: keyof NewItem, v: string) => void
  addItem: () => void
  removeItem: (idx: number) => void
  onSave: () => void
}

const initialForm = {
  customerName: "",
  customerEmail: "",
  orderNumber: "",
  returnDate: "",
  notes: "",
}

function ReturnDialog({
  title,
  open,
  setOpen,
  form,
  setForm,
  items,
  updateItem,
  addItem,
  removeItem,
  onSave,
}: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>All fields marked * are required.</DialogDescription>
        </DialogHeader>

        {/* Header form */}
        <div className="grid gap-4 py-4">
          {/* row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Customer Name *"
              value={form.customerName}
              onChange={(v) => setForm((f) => ({ ...f, customerName: v }))}
            />
            <Field
              label="Customer Email"
              value={form.customerEmail}
              onChange={(v) => setForm((f) => ({ ...f, customerEmail: v }))}
            />
          </div>

          {/* row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Order Number"
              value={form.orderNumber}
              onChange={(v) => setForm((f) => ({ ...f, orderNumber: v }))}
            />
            <Field
              label="Return Date *"
              type="date"
              value={form.returnDate}
              onChange={(v) => setForm((f) => ({ ...f, returnDate: v }))}
            />
          </div>

          {/* notes */}
          <Field label="Notes" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

          {/* items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Return Items</h3>
              <Button variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-7 gap-2 p-4 border rounded-lg">
                    <Field label="SKU" value={it.sku} onChange={(v) => updateItem(idx, "sku", v)} />
                    <Field
                      label="Product Name"
                      value={it.productName}
                      onChange={(v) => updateItem(idx, "productName", v)}
                    />
                    <Field
                      label="Quantity"
                      type="number"
                      value={it.quantity}
                      onChange={(v) => updateItem(idx, "quantity", v)}
                    />
                    {/* condition */}
                    <SelectField
                      label="Condition"
                      value={it.condition}
                      options={["Good", "Used", "Damaged", "Defective"]}
                      onChange={(v) => updateItem(idx, "condition", v)}
                    />
                    {/* reason */}
                    <SelectField
                      label="Reason"
                      value={it.reason}
                      options={[
                        "Defective",
                        "Wrong Item",
                        "Not as Described",
                        "Changed Mind",
                        "Damaged in Transit",
                        "Quality Issues",
                        "Other",
                      ]}
                      onChange={(v) => updateItem(idx, "reason", v)}
                    />
                    <Field
                      label="Refund"
                      type="number"
                      value={it.totalRefund}
                      onChange={(v) => updateItem(idx, "totalRefund", v)}
                    />
                    <div className="flex items-end">
                      <IconBtn icon={Trash2} disabled={items.length === 1} onClick={() => removeItem(idx)} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ViewDialog({
  open,
  setOpen,
  returnOrder,
  statusColor,
}: {
  open: boolean
  setOpen: (o: boolean) => void
  returnOrder: Return
  statusColor: (s: string) => string
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Return Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Return #</p>
              <p className="font-medium">{returnOrder.return_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className={statusColor(returnOrder.status)}>{returnOrder.status}</Badge>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Cond.</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Refund</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnOrder.return_items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{it.sku}</TableCell>
                  <TableCell>{it.product_name}</TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{it.condition}</TableCell>
                  <TableCell>{it.reason}</TableCell>
                  <TableCell>${(it.total_refund || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ----------------------------- helper fields ----------------------------- */

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
