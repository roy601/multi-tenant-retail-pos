"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Edit, Eye, Package, Calendar, Printer, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"

// FIXED: More defensive type definition with purchase_date
type RawInventoryRow = {
  barcode: string
  product_name: string
  model_number?: string | null
  category?: string | null
  brand?: string | null
  supplier?: string | null
  sale_price?: number | null
  cost_price?: number | null
  quantity?: number | null
  color?: string | null
  purchase_date?: string | null
}

type Product = {
  productName: string
  modelNumber: string | null
  category: string | null
  brand: string | null
  supplier: string | null
  salePrice: number
  costPrice: number | null
  quantity: number
  color: string | null
  purchaseDate: string | null
}

const supabase = createClient()
const LOW_STOCK_THRESHOLD = 5

export function InventoryClient() {
  const { toast } = useToast()
  const { organization, hasPermission, isAdmin } = useRole()
  const organizationId = organization?.id || null
  
  // Date filtering
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [rows, setRows] = useState<RawInventoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadInventory() {
      if (!organizationId) return
      setIsLoading(true)
      setError(null)

      try {
        console.log(`🔍 Fetching inventory for organization: ${organizationId}`)
        
        // Use the secure RPC function to get scoped inventory
        const { data, error: rpcError } = await supabase.rpc('get_inventory_by_org', {
          p_org_id: organizationId
        })

        if (rpcError) {
          console.error("Inventory RPC fetch failed:", rpcError)
          throw new Error(`Failed to load inventory data: ${rpcError.message}`)
        }

        console.log(`✅ Loaded ${data?.length || 0} items for org ${organizationId}`)

        // Map RPC result to our UI structure
        const invData = (data ?? []).map((item: any) => ({
          barcode: item.barcode || '',
          product_name: item.product_name || 'Unknown Product',
          model_number: item.model_number || null,
          category: item.category || null,
          brand: item.brand || null,
          supplier: item.supplier || null,
          sale_price: item.sale_price || null,
          cost_price: item.cost_price || null,
          quantity: item.quantity || 0,
          color: item.color || null,
          purchase_date: item.purchase_date || null
        }))

        if (!mounted) return
        setRows(invData)
        setError(null)

      } catch (error: any) {
        console.error("Inventory load error:", error)
        if (!mounted) return
        
        setError(error.message || "Failed to load inventory data")
        toast({
          title: "Failed to load inventory",
          description: error.message || "Unknown error occurred",
          variant: "destructive",
        })
        setRows([])
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    if (organizationId) {
      loadInventory()
    }
    
    return () => {
      mounted = false
    }
  }, [toast, organizationId])

  // UPDATED: Apply flexible date filter to rows
  const dateFilteredRows = useMemo(() => {
    // If date filter is not enabled, show all rows
    if (!dateFilterEnabled) {
      return rows
    }

    // If no dates are selected, show all rows
    if (!startDate && !endDate) {
      return rows
    }

    return rows.filter((r) => {
      if (!r.purchase_date) return false
      const purchaseDate = new Date(r.purchase_date).toISOString().split('T')[0]
      
      // If only "To Date" is set, show all up to that date (from beginning to endDate)
      if (!startDate && endDate) {
        return purchaseDate <= endDate
      }
      
      // If only "From Date" is set, show all from that date onwards (from startDate to now)
      if (startDate && !endDate) {
        return purchaseDate >= startDate
      }
      
      // If both dates are set, show within range
      return purchaseDate >= startDate && purchaseDate <= endDate
    })
  }, [rows, dateFilterEnabled, startDate, endDate])

  // Get the date range description
  const getDateRangeDescription = () => {
    if (!dateFilterEnabled) return null
    if (!startDate && !endDate) return "All dates"
    if (!startDate && endDate) return `All inventory up to ${new Date(endDate).toLocaleDateString('en-GB')}`
    if (startDate && !endDate) return `All inventory from ${new Date(startDate).toLocaleDateString('en-GB')} onwards`
    return `${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`
  }

  // FIXED: Better grouping logic with validation
  const products: Product[] = useMemo(() => {
    const map = new Map<string, Product>()
    
    for (const r of dateFilteredRows) {
      if (!r.product_name) continue // Skip invalid entries
      
      const key = [
        r.product_name.trim().toLowerCase(),
        (r.model_number ?? "").trim().toLowerCase(),
        (r.brand ?? "").trim().toLowerCase(),
        (r.color ?? "").trim().toLowerCase(),
      ].join("|")

      const qty = Math.max(0, Number(r.quantity ?? 0)) // Ensure non-negative
      const sale = Math.max(0, Number(r.sale_price ?? 0))
      const cost = r.cost_price != null ? Math.max(0, Number(r.cost_price)) : null

      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          productName: r.product_name,
          modelNumber: r.model_number ?? null,
          category: r.category ?? null,
          brand: r.brand ?? null,
          supplier: r.supplier ?? null,
          salePrice: sale,
          costPrice: cost,
          quantity: qty,
          color: r.color ?? null,
          purchaseDate: r.purchase_date ?? null
        })
      } else {
        existing.quantity += qty
        // Use highest sale price if multiple entries
        if (sale > existing.salePrice) existing.salePrice = sale
        if (existing.costPrice == null && cost != null) existing.costPrice = cost
        // Keep most recent purchase date
        if (r.purchase_date && (!existing.purchaseDate || r.purchase_date > existing.purchaseDate)) {
          existing.purchaseDate = r.purchase_date
        }
      }
    }
    return Array.from(map.values())
  }, [dateFilteredRows])

  // FIXED: Better filtering with null safety
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !term ||
        p.productName.toLowerCase().includes(term) ||
        (p.modelNumber ?? "").toLowerCase().includes(term) ||
        (p.brand ?? "").toLowerCase().includes(term) ||
        (p.color ?? "").toLowerCase().includes(term)
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, categoryFilter])


  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.quantity || 0), 0),
    [products]
  )

  const totalSaleValue = useMemo(
    () => products.reduce((sum, p) => sum + (p.salePrice || 0) * (p.quantity || 0), 0),
    [products]
  )

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category ?? "Uncategorized")))
    return cats.sort()
  }, [products])

  const demoCount = useMemo(
    () => products.filter((p) => {
      const category = (p.category ?? "").toLowerCase()
      return category.includes("demo")
    }).length,
    [products]
  )

  // FIXED: Add low stock and out of stock counts
  const lowStockCount = useMemo(
    () => products.filter(p => p.quantity <= LOW_STOCK_THRESHOLD && p.quantity > 0).length,
    [products]
  )

  const outOfStockCount = useMemo(
    () => products.filter(p => p.quantity === 0).length,
    [products]
  )

  const totalQuantity = useMemo(
    () => products.reduce((sum, p) => sum + p.quantity, 0),
    [products]
  )

  const getStockStatus = (p: Product) => {
    if (p.quantity === 0) return { label: "Out of Stock", variant: "destructive" as const }
    if (p.quantity <= LOW_STOCK_THRESHOLD) return { label: "Low Stock", variant: "secondary" as const }
    return { label: "In Stock", variant: "outline" as const }
  }

  const handleEditProduct = (product: Product) => {
    if (!hasPermission("inventory_add_edit")) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit products.",
        variant: "destructive",
      })
      return
    }
    toast({
      title: "Edit Product",
      description: `Editing ${product.productName} (${product.modelNumber ?? "—"})`,
    })
  }

  const handleViewProduct = (product: Product) => {
    toast({
      title: "Product Details",
      description: `${product.productName} • ${product.modelNumber ?? "—"} • ${product.brand ?? "—"} • ${
        product.color ?? "—"
      }`,
    })
  }

  // Print inventory report - UPDATED with flexible date range text
  const handlePrintInventory = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const dateRangeText = getDateRangeDescription() || 'All Time Inventory'

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .title { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          .period { font-size: 11px; margin-bottom: 15px; color: #666; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 2px solid #333; padding: 10px; text-align: center; }
          .summary-label { font-size: 10px; color: #666; margin-bottom: 5px; }
          .summary-value { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid black; }
          th, td { border: 1px solid black; padding: 5px; text-align: left; font-size: 10px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          .amount-cell { text-align: right; font-family: monospace; }
          .total-row { font-weight: bold; background-color: #f0f0f0; }
          .stock-warning { color: red; font-weight: bold; }
          .stock-low { color: orange; }
          .stock-ok { color: green; }
          @media print { 
            body { margin: 10px; } 
            .summary { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${organization?.name || 'Company Name'}</div>
          <div class="title">Inventory Report</div>
          <div class="period">${dateRangeText}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="summary-label">Total Products</div>
            <div class="summary-value">${products.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Quantity</div>
            <div class="summary-value">${totalQuantity}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Cost Value</div>
            <div class="summary-value">৳${totalValue.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Sale Value</div>
            <div class="summary-value">৳${totalSaleValue.toLocaleString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Product Name</th>
              <th style="width: 12%;">Model</th>
              <th style="width: 10%;">Category</th>
              <th style="width: 10%;">Brand</th>
              <th style="width: 8%;">Color</th>
              <th style="width: 10%;">Supplier</th>
              <th style="width: 8%;">Cost Price</th>
              <th style="width: 8%;">Sale Price</th>
              <th style="width: 7%;">Qty</th>
              <th style="width: 12%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map((p) => {
              const status = getStockStatus(p)
              const statusClass = status.variant === 'destructive' ? 'stock-warning' : 
                                  status.variant === 'secondary' ? 'stock-low' : 'stock-ok'
              return `
                <tr>
                  <td>${p.productName}</td>
                  <td>${p.modelNumber ?? "—"}</td>
                  <td>${p.category ?? "—"}</td>
                  <td>${p.brand ?? "—"}</td>
                  <td>${p.color ?? "—"}</td>
                  <td>${p.supplier ?? "—"}</td>
                  <td class="amount-cell">${p.costPrice != null ? `৳${p.costPrice.toLocaleString()}` : "—"}</td>
                  <td class="amount-cell">৳${p.salePrice.toLocaleString()}</td>
                  <td class="amount-cell">${p.quantity}</td>
                  <td class="${statusClass}">${status.label}</td>
                </tr>
              `
            }).join('')}
            <tr class="total-row">
              <td colspan="6">Total</td>
              <td class="amount-cell">৳${totalValue.toLocaleString()}</td>
              <td class="amount-cell">৳${totalSaleValue.toLocaleString()}</td>
              <td class="amount-cell">${totalQuantity}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 20px; font-size: 10px;">
          <div><strong>Summary:</strong></div>
          <div>Total Products: ${products.length}</div>
          <div>Categories: ${categories.length}</div>
          <div>Low Stock Items: ${lowStockCount}</div>
          <div>Out of Stock Items: ${outOfStockCount}</div>
          <div style="margin-top: 10px;">Generated on: ${new Date().toLocaleString('en-GB')}</div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  // Export CSV - UPDATED with flexible date range in filename
  const handleExportCSV = () => {
    try {
      let dateRangeText = 'all_time'
      if (dateFilterEnabled) {
        if (!startDate && endDate) {
          dateRangeText = `upto_${endDate}`
        } else if (startDate && !endDate) {
          dateRangeText = `from_${startDate}`
        } else if (startDate && endDate) {
          dateRangeText = `${startDate}_to_${endDate}`
        }
      }

      const rows = filteredProducts.map((p) => {
        const status = getStockStatus(p)
        return [
          `"${p.productName}"`,
          `"${p.modelNumber ?? ""}"`,
          `"${p.category ?? ""}"`,
          `"${p.brand ?? ""}"`,
          `"${p.color ?? ""}"`,
          `"${p.supplier ?? ""}"`,
          p.costPrice ?? 0,
          p.salePrice,
          p.quantity,
          `"${status.label}"`
        ].join(',')
      })

      const header = 'Product Name,Model,Category,Brand,Color,Supplier,Cost Price,Sale Price,Quantity,Status'
      const csv = [header, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-${dateRangeText}-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: `Exported ${rows.length} products`
      })
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Could not export data",
        variant: "destructive"
      })
    }
  }

  // FIXED: Handle loading state
  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">Loading inventory data...</p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">Please wait...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // FIXED: Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">Failed to load inventory data</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your product inventory and stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin() && <Badge variant="secondary">Manager Access</Badge>}
        </div>
      </div>

      {/* Date Range Filter Card - UPDATED with better descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
          <CardDescription>
            Filter inventory by purchase date period (optional - leave dates empty to show all)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enable-date-filter"
                checked={dateFilterEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilterEnabled(e.target.checked)}
                className="h-4 w-4"
                title="Enable date filter"
              />
              <Label htmlFor="enable-date-filter" className="cursor-pointer">
                Enable Date Filter
              </Label>
            </div>
            {dateFilterEnabled && (
              <>
                <div>
                  <Label htmlFor="start-date" className="text-xs">From Date (optional)</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-48"
                    placeholder="Leave empty for all"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-xs">To Date (optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-48"
                    placeholder="Leave empty for all"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStartDate(today)
                    setEndDate(today)
                  }}
                  className="mt-5"
                >
                  Today
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStartDate("")
                    setEndDate("")
                  }}
                  className="mt-5"
                >
                  Clear Dates
                </Button>
              </>
            )}
          </div>
          {dateFilterEnabled && (
            <div className="mt-3 text-sm text-muted-foreground">
              <strong>Showing: </strong>{getDateRangeDescription()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIXED: Enhanced Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Unique grouped items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity}</div>
            <p className="text-xs text-muted-foreground">Units in stock</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sale Value</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">৳{totalSaleValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Potential revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Items unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, model, brand, or color…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={handlePrintInventory}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            {`${filteredProducts.length} of ${products.length} grouped products ${dateFilterEnabled ? `(date filtered)` : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Qty (Grouped)</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No products match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((p, idx) => {
                  const stockStatus = getStockStatus(p)
                  return (
                    <TableRow key={`${p.productName}|${p.modelNumber}|${p.brand}|${p.color}|${idx}`}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell>{p.modelNumber ?? "—"}</TableCell>
                      <TableCell>{p.category ?? "Uncategorized"}</TableCell>
                      <TableCell>{p.brand ?? "—"}</TableCell>
                      <TableCell>{p.color ?? "—"}</TableCell>
                      <TableCell>{p.costPrice != null ? `৳${p.costPrice.toLocaleString()}` : "—"}</TableCell>
                      <TableCell>৳{p.salePrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{p.quantity}</span>
                          <Badge variant={stockStatus.variant} className="text-xs">
                            {stockStatus.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{p.supplier ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewProduct(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(p)}
                            disabled={!hasPermission("inventory_add_edit")}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}