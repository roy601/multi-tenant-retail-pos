"use client"

import { useEffect, useMemo, useState, Fragment } from "react"
import { CalendarDays, DollarSign, ShoppingCart, TrendingUp, Calendar, RefreshCw, Download, ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/component"
import { useToast } from "@/hooks/use-toast"
import { MainNav } from "@/components/main-nav"
import { useRole } from "@/components/role-provider"

// FIXED: Better type definitions matching actual Supabase response
type CustomerJoined = {
  id: number
  name: string | null
  phone_number: string | null
  email: string | null
}

type SaleCustomerJoined = {
  customer_id?: number | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customers: CustomerJoined[] | null
}

// NEW: Product detail type
type SoldProduct = {
  id: number
  barcode: string | null
  product_name: string
  model_number: string | null
  color: string | null
  quantity: number
  unit_price: number
  discount_percentage: number | null
  discount_amount: number | null
  total_price: number
  cost_price: number | null
  brand: string | null
  category: string | null
}

type SaleRow = {
  id: string | number
  created_at: string
  total_amount: number | null
  total_discount: number | null
  payment_method: string | null
  status: string | null
  sale_customers: SaleCustomerJoined[] | null
  sold_products: SoldProduct[] | null
}

type UiSale = {
  id: string
  dateISO: string
  timeLabel: string
  customer: string | null
  itemsCount: number
  total: number
  totalDiscount: number
  payment: string | null
  status: string | null
  products: SoldProduct[]
}

const supabase = createClient()

function bdAmount(n: number) {
  return `৳${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// FIXED: Better parsing with product details and total_discount
function parseSupabaseRows(rows: SaleRow[]): UiSale[] {
  return rows.map((r) => {
    let created: Date
    try {
      created = new Date(r.created_at ?? Date.now())
    } catch {
      created = new Date()
    }
    
    const dateISO = created.toISOString().slice(0, 10)
    const timeLabel = created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const sc = Array.isArray(r.sale_customers) && r.sale_customers.length > 0 ? r.sale_customers[0] : null
    let customerName: string | null = null
    
    if (sc) {
      customerName = sc.customer_name || sc.customer_phone
      
      if (!customerName && Array.isArray(sc.customers) && sc.customers.length > 0) {
        const customer = sc.customers[0]
        customerName = customer.name || customer.phone_number
      }
    }

    const products = Array.isArray(r.sold_products) ? r.sold_products : []
    const itemsCount = products.length
    const total = Number(r.total_amount ?? 0)
    const totalDiscount = Number(r.total_discount ?? 0)

    return {
      id: String(r.id),
      dateISO,
      timeLabel,
      customer: customerName,
      itemsCount,
      total,
      totalDiscount,
      payment: r.payment_method,
      status: r.status,
      products
    }
  })
}

export default function SalesPageClient() {
  const { toast } = useToast()
  const { organization } = useRole()
  const organizationId = organization?.id || null
  
  // filters
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true)
  const [query, setQuery] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uiSales, setUiSales] = useState<UiSale[]>([])
  
  // expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // FIXED: Better data loading with product details and total_discount
  async function loadSales() {
      if (!organizationId) return;
      setLoading(true)
      try {
        let query = supabase
          .from("sales")
          .select(`
            id,
            created_at,
            total_amount,
            total_discount,
            payment_method,
            status,
            sale_customers (
              customer_id,
              customer_name,
              customer_phone,
              customer_email,
              customers (
                id, name, phone_number, email
              )
            ),
            sold_products (
              id,
              barcode,
              product_name,
              model_number,
              color,
              quantity,
              unit_price,
              discount_percentage,
              discount_amount,
              total_price,
              cost_price,
              brand,
              category
            )
          `)
          .order("created_at", { ascending: false })

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query

      if (error) {
        console.error("Sales fetch error:", error)
        throw new Error(`Failed to fetch sales: ${error.message}`)
      }

      const rows = Array.isArray(data) ? data as SaleRow[] : []
      const parsedSales = parseSupabaseRows(rows)
      
      setUiSales(parsedSales)
      setError(null)
      
    } catch (e: any) {
      console.error("Load sales error:", e)
      setError(e.message || "Failed to load sales data")
      setUiSales([])
      
      toast({
        title: "Error loading sales",
        description: e.message || "Failed to fetch sales data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initLoad = async () => {
      if (organizationId) {
        await loadSales()
      }
      if (!mounted) return
    }
    
    initLoad()
    return () => {
      mounted = false
    }
  }, [organizationId])

  // Get unique brands and categories from all products
  const { brands, categories } = useMemo(() => {
    const brandSet = new Set<string>()
    const categorySet = new Set<string>()
    
    uiSales.forEach(sale => {
      sale.products.forEach(product => {
        if (product.brand) brandSet.add(product.brand)
        if (product.category) categorySet.add(product.category)
      })
    })
    
    return {
      brands: ["All Brands", ...Array.from(brandSet).sort()],
      categories: ["All Categories", ...Array.from(categorySet).sort()]
    }
  }, [uiSales])

  // FIXED: Better client-side filtering with date validation and product filters
  const filteredSales = useMemo(() => {
    let start: Date | null = null
    let end: Date | null = null
    
    if (dateFilterEnabled) {
      try {
        if (startDate) start = new Date(startDate)
        if (endDate) {
          end = new Date(endDate)
          end.setHours(23, 59, 59, 999) // Include the whole end day
        }
      } catch {
        // Invalid dates - ignore date filters
      }
    }
    
    const q = query.trim().toLowerCase()

    return uiSales.filter((s) => {
      let saleDate: Date
      try {
        saleDate = new Date(s.dateISO)
      } catch {
        return false
      }
      
      const inStart = !start || saleDate >= start
      const inEnd = !end || saleDate <= end
      
      // Brand and category filters - check if ANY product matches
      const brandOk = brandFilter === "all" || s.products.some(p => p.brand === brandFilter)
      const categoryOk = categoryFilter === "all" || s.products.some(p => p.category === categoryFilter)
      
      // Search across sale and product fields
      const saleSearchText = `${s.id} ${s.customer ?? ""} ${s.payment ?? ""} ${s.status ?? ""}`.toLowerCase()
      const productSearchText = s.products.map(p => 
        `${p.barcode ?? ""} ${p.product_name} ${p.model_number ?? ""} ${p.color ?? ""} ${p.brand ?? ""} ${p.category ?? ""}`
      ).join(" ").toLowerCase()
      
      const matchQ = !q || saleSearchText.includes(q) || productSearchText.includes(q)
      
      return inStart && inEnd && brandOk && categoryOk && matchQ
    })
  }, [uiSales, startDate, endDate, query, brandFilter, categoryFilter])

  // UPDATED: Calculate total items sold (sum of quantities) instead of transaction count
  const totalTransactions = filteredSales.length
  const totalItemsSold = filteredSales.reduce((sum, s) => {
    return sum + s.products.reduce((itemSum, p) => itemSum + Number(p.quantity || 0), 0)
  }, 0)
  const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number.isFinite(s.total) ? s.total : 0), 0)
  const todayISO = new Date().toISOString().slice(0, 10)
  const todaySales = filteredSales.filter((s) => s.dateISO === todayISO).length
  
  // UPDATED: Calculate total profit using revenue - cost formula
  const totalProfit = useMemo(() => {
    return filteredSales.reduce((sum, sale) => {
      // Calculate total cost for all products in the sale
      const totalCost = sale.products.reduce((costSum, product) => {
        const costPrice = Number(product.cost_price) || 0
        const quantity = Number(product.quantity) || 0
        return costSum + (costPrice * quantity)
      }, 0)
      
      // Profit = Revenue - Total Cost
      const saleProfit = sale.total - totalCost
      
      return sum + saleProfit
    }, 0)
  }, [filteredSales])

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setDateFilterEnabled(false)
    setQuery("")
    setBrandFilter("all")
    setCategoryFilter("all")
  }

  const toggleRow = (saleId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(saleId)) {
        next.delete(saleId)
      } else {
        next.add(saleId)
      }
      return next
    })
  }

  // NEW: Custom print function for sales history
  const handlePrintSalesHistory = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Determine date range display
    let dateRangeText = "All Time"
    if (startDate && endDate) {
      dateRangeText = `${new Date(startDate).toLocaleDateString('en-GB')} to ${new Date(endDate).toLocaleDateString('en-GB')}`
    } else if (startDate) {
      dateRangeText = `From ${new Date(startDate).toLocaleDateString('en-GB')}`
    } else if (endDate) {
      dateRangeText = `Up to ${new Date(endDate).toLocaleDateString('en-GB')}`
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales History Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .period { font-size: 12px; margin-bottom: 5px; }
          .filters { font-size: 11px; color: #666; margin-bottom: 15px; }
          .summary { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 11px; color: #666; margin-bottom: 5px; }
          .summary-value { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid black; }
          th, td { border: 1px solid black; padding: 6px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          .amount-cell { text-align: right; font-family: monospace; }
          .total-row { font-weight: bold; background-color: #f0f0f0; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${organization?.name || 'Company Name'}</div>
          ${organization?.address ? `<div class="address">${organization.address}</div>` : ''}
          <div class="title">Sales History Report</div>
          <div class="period">Period: ${dateRangeText}</div>
          ${brandFilter !== "all" || categoryFilter !== "all" || query ? `
            <div class="filters">
              ${brandFilter !== "all" ? `Brand: ${brandFilter} • ` : ''}
              ${categoryFilter !== "all" ? `Category: ${categoryFilter} • ` : ''}
              ${query ? `Search: "${query}"` : ''}
            </div>
          ` : ''}
        </div>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Transactions</div>
              <div class="summary-value">${totalTransactions}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Items Sold</div>
              <div class="summary-value">${totalItemsSold.toLocaleString()}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Revenue</div>
              <div class="summary-value">${bdAmount(totalRevenue)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Profit</div>
              <div class="summary-value">${bdAmount(totalProfit)}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Total</th>
              <th>Discount</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(sale => {
              const totalCost = sale.products.reduce((sum, p) => {
                const costPrice = Number(p.cost_price) || 0
                const quantity = Number(p.quantity) || 0
                return sum + (costPrice * quantity)
              }, 0)
              const saleProfit = sale.total - totalCost
              
              return `
                <tr>
                  <td>${sale.id}</td>
                  <td>${sale.dateISO} ${sale.timeLabel}</td>
                  <td>${sale.customer || '—'}</td>
                  <td>${sale.itemsCount}</td>
                  <td>${sale.payment || '—'}</td>
                  <td>${sale.status || '—'}</td>
                  <td class="amount-cell">${bdAmount(sale.total)}</td>
                  <td class="amount-cell">${bdAmount(sale.totalDiscount)}</td>
                  <td class="amount-cell">${bdAmount(saleProfit)}</td>
                </tr>
              `
            }).join('')}
            <tr class="total-row">
              <td colspan="6">TOTAL</td>
              <td class="amount-cell">${bdAmount(totalRevenue)}</td>
              <td class="amount-cell">${bdAmount(filteredSales.reduce((sum, s) => sum + s.totalDiscount, 0))}</td>
              <td class="amount-cell">${bdAmount(totalProfit)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #666;">
          Generated on ${new Date().toLocaleString('en-GB')}
        </div>
      </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  // UPDATED: CSV export with sale-level total_discount for profit calculation
  const handleExportCSV = () => {
    try {
      const rows: string[] = []
      
      filteredSales.forEach(s => {
        // Calculate total cost for the sale
        const totalCost = s.products.reduce((sum, p) => {
          const costPrice = Number(p.cost_price) || 0
          const quantity = Number(p.quantity) || 0
          return sum + (costPrice * quantity)
        }, 0)
        
        // Sale-level profit
        const saleProfit = s.total - totalCost
        
        s.products.forEach((p, idx) => {
          const costPrice = Number(p.cost_price) || 0
          const quantity = Number(p.quantity) || 0
          const lineCost = costPrice * quantity
          
          // Proportionally distribute the total discount across products based on their total_price
          const totalProductValue = s.products.reduce((sum, prod) => sum + Number(prod.total_price), 0)
          const proportionalDiscount = totalProductValue > 0 
            ? (Number(p.total_price) / totalProductValue) * s.totalDiscount 
            : 0
          
          // Line profit with proportional discount
          const lineProfit = p.total_price - lineCost - proportionalDiscount
          
          rows.push([
            s.id,
            s.dateISO,
            s.timeLabel,
            `"${s.customer || ''}"`,
            `"${p.product_name}"`,
            `"${p.model_number || ''}"`,
            `"${p.color || ''}"`,
            `"${p.barcode || ''}"`,
            `"${p.brand || ''}"`,
            `"${p.category || ''}"`,
            p.quantity,
            p.unit_price.toFixed(2),
            costPrice.toFixed(2),
            p.total_price.toFixed(2),
            proportionalDiscount.toFixed(2),
            lineProfit.toFixed(2),
            `"${s.payment || ''}"`,
            `"${s.status || ''}"`,
            idx === 0 ? s.total.toFixed(2) : '', // Sale total on first product
            idx === 0 ? s.totalDiscount.toFixed(2) : '', // Total discount on first product
            idx === 0 ? saleProfit.toFixed(2) : '' // Sale profit on first product
          ].join(','))
        })
      })
      
      const csv = [
        'Sale ID,Date,Time,Customer,Product Name,Model,Color,Barcode,Brand,Category,Qty,Unit Price,Cost Price,Line Total,Line Discount,Line Profit,Payment Method,Status,Sale Total,Sale Discount,Sale Profit',
        ...rows
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sales-report-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      
      toast({
        title: "Export successful",
        description: `Exported ${filteredSales.length} sales with product details and profit`
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export sales data",
        variant: "destructive"
      })
    }
  }

  // FIXED: Handle loading state
  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading sales data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadSales} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={handlePrintSalesHistory}
            disabled={filteredSales.length === 0}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filter Sales
          </CardTitle>
          <CardDescription>Filter by date range, brand, category, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Date Range Selection - Match Day Cashbook */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-date-filter"
                  checked={dateFilterEnabled}
                  onChange={(e) => setDateFilterEnabled(e.target.checked)}
                  className="h-4 w-4"
                  title="Enable date filter"
                />
                <Label htmlFor="enable-date-filter" className="cursor-pointer">
                  Enable Date Filter
                </Label>
              </div>

              {dateFilterEnabled && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <Label htmlFor="start-date">From Date (optional)</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-48 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">To Date (optional)</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-48 mt-1"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className="mt-7"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="mt-7"
                  >
                    Clear Dates
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end mt-2">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Invoice, customer, product…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Brand and Category Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="brand-filter">Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger id="brand-filter" className="mt-1">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands
                      .filter(b => b !== "All Brands")
                      .map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category-filter" className="mt-1">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories
                      .filter(c => c !== "All Categories")
                      .map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {((dateFilterEnabled && (startDate || endDate)) || query || brandFilter !== "all" || categoryFilter !== "all") && (
            <div className="mt-3 text-sm text-muted-foreground">
              Showing {filteredSales.length} of {uiSales.length} transactions
              {dateFilterEnabled && startDate && endDate && ` from ${startDate} to ${endDate}`}
              {dateFilterEnabled && startDate && !endDate && ` from ${startDate} onwards`}
              {dateFilterEnabled && !startDate && endDate && ` up to ${endDate}`}
              {brandFilter !== "all" && ` • Brand: ${brandFilter}`}
              {categoryFilter !== "all" && ` • Category: ${categoryFilter}`}
              {query && ` • matching "${query}"`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {startDate || endDate || query || brandFilter !== "all" || categoryFilter !== "all" 
                ? `From ${totalTransactions} transactions` 
                : `From ${totalTransactions} all time transactions`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bdAmount(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From all sales (including pending)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySales}</div>
            <p className="text-xs text-muted-foreground">Transactions today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bdAmount(totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {startDate || endDate || query || brandFilter !== "all" || categoryFilter !== "all" 
                ? "Revenue - Cost" 
                : "All time profit (revenue - cost)"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>
            {error 
              ? `Error: ${error}`
              : startDate || endDate || query || brandFilter !== "all" || categoryFilter !== "all"
                ? `Filtered sales transactions (${filteredSales.length} results) - Click rows to see product details`
                : "Complete list of all sales transactions - Click rows to see product details"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-red-700">Failed to load: {error}</div>
                <Button onClick={loadSales} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Invoice / ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-6 text-sm text-muted-foreground">
                      {error ? "Failed to load sales data." : "No sales found for the selected filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale, idx) => {
                    // Calculate sale profit
                    const totalCost = sale.products.reduce((sum, p) => {
                      const costPrice = Number(p.cost_price) || 0
                      const quantity = Number(p.quantity) || 0
                      return sum + (costPrice * quantity)
                    }, 0)
                    const saleProfit = sale.total - totalCost
                    
                    return (
                      <Fragment key={`sale-${sale.id}-${idx}`}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(sale.id)}
                        >
                          <TableCell>
                            {expandedRows.has(sale.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{sale.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{sale.dateISO}</span>
                              <span className="text-xs text-muted-foreground">{sale.timeLabel}</span>
                            </div>
                          </TableCell>
                          <TableCell>{sale.customer ?? "—"}</TableCell>
                          <TableCell>{sale.itemsCount} item{sale.itemsCount === 1 ? "" : "s"}</TableCell>
                          <TableCell>{sale.payment ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sale.status === "completed"
                                  ? "outline"
                                  : sale.status === "refunded"
                                  ? "destructive"
                                  : sale.status === "pending"
                                  ? "secondary"
                                  : "secondary"
                              }
                            >
                              {sale.status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{bdAmount(sale.total)}</TableCell>
                          <TableCell className="text-right text-red-600">{bdAmount(sale.totalDiscount)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{bdAmount(saleProfit)}</TableCell>
                        </TableRow>
                        
                        {/* Expanded Product Details */}
                        {expandedRows.has(sale.id) && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">Products in this sale:</h4>
                                  <div className="text-sm text-muted-foreground">
                                    Sale Discount: <span className="font-semibold text-red-600">{bdAmount(sale.totalDiscount)}</span>
                                    {" • "}
                                    Sale Profit: <span className="font-semibold text-green-600">{bdAmount(saleProfit)}</span>
                                  </div>
                                </div>
                                <div className="rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Barcode</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Color</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Cost Price</TableHead>
                                        <TableHead className="text-right">Line Total</TableHead>
                                        <TableHead className="text-right">Line Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sale.products.map((product) => {
                                        const costPrice = Number(product.cost_price) || 0
                                        const quantity = Number(product.quantity) || 0
                                        const lineCost = costPrice * quantity
                                        
                                        return (
                                          <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.product_name}</TableCell>
                                            <TableCell>{product.barcode ?? "—"}</TableCell>
                                            <TableCell>{product.model_number ?? "—"}</TableCell>
                                            <TableCell>{product.color ?? "—"}</TableCell>
                                            <TableCell>{product.brand ?? "—"}</TableCell>
                                            <TableCell>{product.category ?? "—"}</TableCell>
                                            <TableCell className="text-center">{product.quantity}</TableCell>
                                            <TableCell className="text-right">{bdAmount(product.unit_price)}</TableCell>
                                            <TableCell className="text-right">{bdAmount(costPrice)}</TableCell>
                                            <TableCell className="text-right font-medium">{bdAmount(product.total_price)}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{bdAmount(lineCost)}</TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}