"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Filter, RotateCcw, Package, ShoppingCart, Calendar, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SalesReturnForm } from "@/components/sales-return-form"
import { PurchaseReturnForm } from "@/components/purchase-return-form"
import { createClient } from "@/utils/supabase/component"
import { useToast } from "@/hooks/use-toast"

type ReturnRecord = {
  id: string
  type: "sales" | "purchase"
  date: string            // ISO date string (yyyy-mm-dd...)
  invoiceNumber: string   // SALE-<id> or PUR-<id>
  customerSupplier: string
  productName: string     // first item name or "N items"
  quantity: number        // sum of return quantities
  amount: number          // total_refund_amount / total_credit_amount
  reason: string
  status: "pending" | "completed" | "processing" | "processed" | "cancelled" | string
}

const supabase = createClient()

export function ReturnsClient() {
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("All Periods") // "YYYY-MM"
  const [selectedSupplier, setSelectedSupplier] = useState("All")
  const [showSalesReturn, setShowSalesReturn] = useState(false)
  const [showPurchaseReturn, setShowPurchaseReturn] = useState(false)

  const [returns, setReturns] = useState<ReturnRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch returns from Supabase
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsLoading(true)

      // ---- Sales Returns
      const { data: sales, error: salesErr } = await supabase
        .from("sales_returns")
        .select(`
          id,
          return_date,
          original_sale_id,
          customer_name,
          customer_phone,
          return_reason,
          total_refund_amount,
          status,
          sales_return_items (
            id,
            product_name,
            quantity,
            total_refund_amount
          )
        `)
        .order("return_date", { ascending: false })

      if (salesErr) {
        toast({ title: "Failed to load sales returns", description: salesErr.message, variant: "destructive" })
      }

      // ---- Purchase Returns
      const { data: purchases, error: purchaseErr } = await supabase
        .from("purchase_returns")
        .select(`
          id,
          return_date,
          original_purchase_id,
          supplier,
          return_reason,
          total_credit_amount,
          status,
          purchase_return_items (
            id,
            product_name,
            return_quantity,
            total_credit_amount
          )
        `)
        .order("return_date", { ascending: false })

      if (purchaseErr) {
        toast({ title: "Failed to load purchase returns", description: purchaseErr.message, variant: "destructive" })
      }

      const mappedSales: ReturnRecord[] = (sales ?? []).map((r: any) => {
        const items = (r.sales_return_items ?? []) as Array<any>
        const qty = items.reduce((s, it) => s + Number(it.return_quantity ?? 0), 0)
        const productName =
          items.length === 0
            ? "—"
            : items.length === 1
            ? items[0].product_name ?? "—"
            : `${items.length} items`
        return {
          id: String(r.id),
          type: "sales",
          date: r.return_date ?? "",
          invoiceNumber: r.original_sale_id != null ? `SALE-${r.original_sale_id}` : "SALE-—",
          customerSupplier: r.customer_name || r.customer_phone || "—",
          productName,
          quantity: qty,
          amount: Number(r.total_refund_amount ?? 0),
          reason: r.return_reason ?? "—",
          status: r.status ?? "pending",
        }
      })

      const mappedPurchases: ReturnRecord[] = (purchases ?? []).map((r: any) => {
        const items = (r.purchase_return_items ?? []) as Array<any>
        const qty = items.reduce((s, it) => s + Number(it.return_quantity ?? 0), 0)
        const productName =
          items.length === 0
            ? "—"
            : items.length === 1
            ? items[0].product_name ?? "—"
            : `${items.length} items`
        return {
          id: String(r.id),
          type: "purchase",
          date: r.return_date ?? "",
          invoiceNumber: r.original_purchase_id != null ? `PUR-${r.original_purchase_id}` : "PUR-—",
          customerSupplier: r.supplier ?? "—",
          productName,
          quantity: qty,
          amount: Number(r.total_credit_amount ?? 0),
          reason: r.return_reason ?? "—",
          status: r.status ?? "pending",
        }
      })

      const combined = [...mappedSales, ...mappedPurchases].sort((a, b) => (a.date > b.date ? -1 : 1))

      if (mounted) {
        setReturns(combined)
        setIsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [toast])

  // Derived filter options
  const supplierOptions = useMemo(() => {
    const set = new Set<string>()
    returns.forEach((r) => {
      if (r.customerSupplier && r.customerSupplier !== "—") set.add(r.customerSupplier)
    })
    return ["All", ...Array.from(set).sort()]
  }, [returns])

  // Helpers
  const ym = (iso: string) => (iso ? iso.slice(0, 7) : "")
  const filteredReturns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return returns.filter((r) => {
      const matchesSearch =
        !term ||
        r.invoiceNumber.toLowerCase().includes(term) ||
        r.customerSupplier.toLowerCase().includes(term) ||
        r.productName.toLowerCase().includes(term)

      const matchesPeriod = selectedPeriod === "All Periods" || ym(r.date) === selectedPeriod
      const matchesSupplier = selectedSupplier === "All" || r.customerSupplier === selectedSupplier

      return matchesSearch && matchesPeriod && matchesSupplier
    })
  }, [returns, searchTerm, selectedPeriod, selectedSupplier])

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "completed" || s === "processed")
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    if (s === "processing")
      return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
    if (s === "pending")
      return <Badge className="bg-red-100 text-red-800">Pending</Badge>
    if (s === "cancelled")
      return <Badge variant="secondary">Cancelled</Badge>
    return <Badge variant="secondary">{status}</Badge>
  }

  const getTypeIcon = (type: string) =>
    type === "sales" ? (
      <ShoppingCart className="h-4 w-4 text-blue-600" />
    ) : (
      <Package className="h-4 w-4 text-green-600" />
    )

  // Period options (derive from data)
  const periodOptions = useMemo(() => {
    const set = new Set<string>()
    returns.forEach((r) => {
      const m = ym(r.date)
      if (m) set.add(m)
    })
    // Example labels are the raw YYYY-MM; keep consistent with filter value
    return ["All Periods", ...Array.from(set).sort().reverse()]
  }, [returns])

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Returns Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowSalesReturn(true)} className="bg-blue-600 hover:bg-blue-700">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Sales Return
          </Button>
          <Button variant="outline" onClick={() => setShowPurchaseReturn(true)}>
            <Package className="mr-2 h-4 w-4" />
            Purchase Return
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="supplier">Customer/Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer/supplier" />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedPeriod("All Periods")
                  setSelectedSupplier("All")
                }}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer/Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading returns…
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length > 0 ? (
                  filteredReturns.map((r) => (
                    <TableRow key={`${r.type}-${r.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(r.type)}
                          <span className="capitalize">{r.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.date?.slice(0, 10) || "—"}</TableCell>
                      <TableCell className="font-medium">{r.invoiceNumber}</TableCell>
                      <TableCell>{r.customerSupplier}</TableCell>
                      <TableCell>{r.productName}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>৳{Number(r.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No returns found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Sales Returns</p>
                <p className="text-2xl font-bold">{returns.filter((r) => r.type === "sales").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Purchase Returns</p>
                <p className="text-2xl font-bold">{returns.filter((r) => r.type === "purchase").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {
                    returns.filter((r) => {
                      const now = new Date()
                      const month = String(now.getMonth() + 1).padStart(2, "0")
                      const ymNow = `${now.getFullYear()}-${month}`
                      return r.date?.startsWith(ymNow)
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ৳
                  {returns
                    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Return Dialog */}
      <Dialog open={showSalesReturn} onOpenChange={setShowSalesReturn}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Sales Return</DialogTitle>
          </DialogHeader>
          <SalesReturnForm onClose={() => setShowSalesReturn(false)} />
        </DialogContent>
      </Dialog>

      {/* Purchase Return Dialog */}
      <Dialog open={showPurchaseReturn} onOpenChange={setShowPurchaseReturn}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Purchase Return</DialogTitle>
          </DialogHeader>
          <PurchaseReturnForm onClose={() => setShowPurchaseReturn(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
