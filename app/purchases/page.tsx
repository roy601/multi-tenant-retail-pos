"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Plus, ShoppingBag, Calendar, Building2, DollarSign, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { AddProductForm } from "@/components/add-product-form"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"

type PurchaseRow = {
  id: number
  supplier_id: string | null
  supplier: string | null
  suppliers: any
  product_name: string | null
  model_number: string | null
  category: string | null
  brand: string | null
  cost_price: number | null
  created_at: string
  color_variants?: { color: string | null, barcode: string | null }[] | null
}

type DisplayRow = {
  key: string
  barcode: string
  product_name: string | null
  model_number: string | null
  category: string | null
  brand: string | null
  color: string | null
  supplier: string | null
  cost_price: number | null
  created_at: string
}

const supabase = createClient()

function formatBDT(n: number | null | undefined) {
  const val = typeof n === "number" ? n : 0
  return `৳${val.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PurchasesPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"purchases" | "add-product">("purchases")
  const { organization, isLoading: roleLoading } = useRole()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<DisplayRow[]>([])
  const [purchases, setPurchases] = useState<{ id: number; supplier: string | null; created_at: string }[]>([])

  // Search and filters
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [supplierFilter, setSupplierFilter] = useState<string>("all")
  
  // Date range filters
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false)

  // open add-product via header button or ?tab=add-product
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "add-product") setActiveTab("add-product")
  }, [searchParams])

  // fetch ALL purchases with nested color_variants, paginated (uses cost_price)
  useEffect(() => {
    let mounted = true

    async function fetchAllPurchases() {
      if (roleLoading) return
      
      if (!organization) {
        setLoading(false)
        // Don't show error if just loading or no org selected yet (could be redirecting)
        return
      }

      setLoading(true)
      setError(null)

      const organizationId = organization.id

      const pageSize = 1000
      let from = 0
      let all: PurchaseRow[] = []

      while (true) {
        const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          supplier_id,
          supplier,
          suppliers(name),
          product_name,
          model_number,
          category,
          brand,
          cost_price,
          created_at,
          color_variants(color, barcode)
        `)
        .eq('organization_id', organizationId)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1)

        if (error) {
          if (mounted) setError(error.message)
          break
        }

        all = all.concat((data ?? []) as PurchaseRow[])
        if (!data || data.length < pageSize) break
        from += pageSize
      }

      if (!mounted) return

      // summary cards base
      setPurchases(
        all.map((p) => ({
          id: p.id,
          supplier: p.supplier ?? null,
          created_at: p.created_at,
        }))
      )

      // table rows (one per color; if no variant, a single row with color "—")
      const flattened: DisplayRow[] = all.flatMap((p) => {
        const base = {
          product_name: p.product_name ?? null,
          model_number: p.model_number ?? null,
          category: p.category ?? null,
          brand: p.brand ?? null,
          supplier: p.suppliers?.name ?? p.supplier ?? null,
          cost_price: p.cost_price != null ? Number(p.cost_price) : null,
          created_at: p.created_at,
        }
        const colors = p.color_variants ?? []
        if (colors.length === 0) {
          return [{ key: `p-${p.id}-none`, ...base, color: null, barcode: "" }]
        }
        return colors.map((cv, idx) => ({
          key: `p-${p.id}-${idx}`,
          ...base,
          color: cv.color ?? null,
          barcode: cv.barcode ?? ""
        }))
      })

      setRows(flattened)
      setLoading(false)
    }

    fetchAllPurchases()
    return () => {
      mounted = false
    }
  }, [organization, roleLoading])

  // filter option lists
  const categories = useMemo(() => {
    const s = new Set(rows.map((r) => (r.category ?? "").trim()).filter(Boolean))
    return ["All Categories", ...Array.from(s).sort()]
  }, [rows])

  const brands = useMemo(() => {
    const s = new Set(rows.map((r) => (r.brand ?? "").trim()).filter(Boolean))
    return ["All Brands", ...Array.from(s).sort()]
  }, [rows])

  const suppliers = useMemo(() => {
    const s = new Set(rows.map((r) => (r.supplier ?? "").trim()).filter(Boolean))
    return ["All Suppliers", ...Array.from(s).sort()]
  }, [rows])

  // apply filters + search + date range
  const filtered = useMemo(() => {
    let start: Date | null = null
    let end: Date | null = null
    
    try {
      if (startDate) start = new Date(startDate)
      if (endDate) end = new Date(endDate)
    } catch {
      // Invalid dates - ignore filters
    }
    
    const q = query.trim().toLowerCase()
    
    return rows.filter((r) => {
      // Date filtering
      let inStart = true;
      let inEnd = true;
      
      if (dateFilterEnabled && start && end) {
        let purchaseDate: Date
        try {
          purchaseDate = new Date(r.created_at)
        } catch {
          return false // Skip invalid dates
        }
        
        inStart = purchaseDate >= start
        inEnd = purchaseDate <= new Date(end.getTime() + 86399999) // include whole day
        
        if (!inStart || !inEnd) return false;
      }
      
      // Category, brand, supplier filters
      const catOk = categoryFilter === "all" || (r.category ?? "") === categoryFilter
      const brandOk = brandFilter === "all" || (r.brand ?? "") === brandFilter
      const supplierOk = supplierFilter === "all" || (r.supplier ?? "") === supplierFilter
      
      // Search query
      const haystack = `${r.barcode ?? ""} ${r.product_name ?? ""} ${r.model_number ?? ""} ${r.category ?? ""} ${r.brand ?? ""} ${r.color ?? ""} ${r.supplier ?? ""}`.toLowerCase()
      const qOk = !q || haystack.includes(q)
      
      return inStart && inEnd && catOk && brandOk && supplierOk && qOk
    })
  }, [rows, query, categoryFilter, brandFilter, supplierFilter, startDate, endDate])

  // summary cards
  
  const totalPurchases = useMemo(() => {
    // Get unique purchase IDs from filtered rows
    const uniquePurchaseIds = new Set(filtered.map(r => r.key.split('-')))
    return uniquePurchaseIds.size
  }, [filtered])

  // Total purchase value from filtered rows
  const totalPurchaseValue = useMemo(() => {
    return filtered.reduce((sum, r) => sum + (Number.isFinite(r.cost_price) ? r.cost_price! : 0), 0)
  }, [filtered])
  
  const thisMonthPurchases = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return purchases.filter((p) => {
      const d = new Date(p.created_at)
      return d.getFullYear() === y && d.getMonth() === m
    }).length
  }, [purchases])

  const totalSuppliers = useMemo(() => {
    // Determine unique suppliers based on the processed `rows`
    const s = new Set(rows.map((r) => (r.supplier ?? "").trim()).filter(Boolean))
    return s.size
  }, [rows])

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setQuery("")
    setCategoryFilter("all")
    setBrandFilter("all")
    setSupplierFilter("all")
  }

  const hasActiveFilters = startDate || endDate || query || categoryFilter !== "all" || brandFilter !== "all" || supplierFilter !== "all"

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Purchase Management</h2>
          {/* single Add Product button */}
          <Button onClick={() => setActiveTab("add-product")} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : totalPurchases}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchase Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : formatBDT(totalPurchaseValue)}</div>
              <p className="text-xs text-muted-foreground">{filtered.length} items filtered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : totalSuppliers}</div>
              <p className="text-xs text-muted-foreground">Unique suppliers</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            {/* no "Add Product" tab trigger; use the header button only */}
          </TabsList>

          {/* Purchases table with Supplier + Cost Price */}
          <TabsContent value="purchases" className="space-y-4">
            <div className="flex flex-col gap-4">
              {/* Date Range Filters */}
              <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enable-date-filter"
                    checked={dateFilterEnabled}
                    onChange={(e) => setDateFilterEnabled(e.target.checked)}
                    className="h-4 w-4"
                    title="Enable date filter"
                  />
                  <Label htmlFor="enable-date-filter" className="cursor-pointer font-medium">
                    Enable Date Filter
                  </Label>
                </div>

                {dateFilterEnabled && (
                  <div className="flex items-end gap-4 flex-wrap">
                    <div>
                      <Label htmlFor="start-date" className="text-xs mb-1 block">From Date</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date" className="text-xs mb-1 block">To Date</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[160px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setStartDate(today)
                        setEndDate(today)
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9"
                      onClick={() => {
                        setStartDate("")
                        setEndDate("")
                      }}
                    >
                      Clear Dates
                    </Button>
                  </div>
                )}
              </div>

              {/* Search and Filter Controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products, brand, category, supplier…"
                      className="pl-8 w-[220px] lg:w-[320px]"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories
                        .filter((c) => c !== "All Categories")
                        .map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands
                        .filter((b) => b !== "All Brands")
                        .map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers
                        .filter((s) => s !== "All Suppliers")
                        .map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {error ? (
                  <div className="p-6 text-sm text-red-600">Failed to load purchases: {error}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Cost Price</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="p-6 text-sm text-muted-foreground">
                            Loading products…
                          </TableCell>
                        </TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="p-6 text-sm text-muted-foreground">
                            No products found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((r) => (
                          <TableRow key={r.key}>
                            <TableCell className="font-medium">{r.product_name ?? "—"}</TableCell>
                            <TableCell>{r.category ?? "—"}</TableCell>
                            <TableCell>{r.model_number ?? "—"}</TableCell>
                            <TableCell>{r.color ?? "—"}</TableCell>
                            <TableCell>{r.barcode ?? "—"}</TableCell>
                            <TableCell>{r.supplier ?? "—"}</TableCell>
                            <TableCell>{formatBDT(r.cost_price)}</TableCell>
                            <TableCell>{new Date(r.created_at).toLocaleDateString("en-GB")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hidden Add Product content (opened via header button) */}
          <TabsContent value="add-product" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <AddProductForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
