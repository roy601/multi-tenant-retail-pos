"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Printer, Search, Trash2, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/component"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/components/role-provider"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()

type IncomeEntry = {
  id?: string
  date: string
  income_type: "owner_income" | "party_income"
  amount: number
  destination_type: "cash" | "bank"
  description?: string
  notes?: string
  supplier_id?: string | null
  supplier_name?: string | null
  created_at?: string
  updated_at?: string
}

type Supplier = {
  id: string
  name: string
}

// Income types
const incomeTypes = [
  { value: "owner_income", label: "Owner Income" },
  { value: "party_income", label: "Supplier Income" }
]

// Destination types
const destinationTypes = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" }
]

export function IncomeOwnerClient() {
  const { organization, isAdmin } = useRole()
  const { toast } = useToast()
  const organizationId = organization?.id || null

  const [incomes, setIncomes] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Search filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filterIncomeType, setFilterIncomeType] = useState("all")
  const [filterDestination, setFilterDestination] = useState("all")
  const [filterSupplier, setFilterSupplier] = useState("all")
  
  // ✅ NEW: Suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  // Add income form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIncome, setNewIncome] = useState({
    date: new Date().toISOString().split('T')[0],
    income_type: "" as "owner_income" | "party_income" | "",
    amount: 0,
    destination_type: "" as "cash" | "bank" | "",
    description: "",
    notes: "",
    supplier_id: "" // ✅ NEW: Added supplier_id
  })

  // ✅ NEW: Load suppliers from database
  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq('organization_id', organizationId)
        .order("name", { ascending: true })

      if (error) throw error
      setSuppliers((data as Supplier[]) || [])
    } catch (err: any) {
      console.error("Failed to load suppliers:", err)
    }
  }

  // Load data when organization context is ready
  useEffect(() => {
    if (organizationId) {
      loadSuppliers()
      
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today)
      setEndDate(today)
      searchIncomes(today, today)
    }
  }, [organizationId])

  // ✅ UPDATED: Auto-fill description when supplier is selected for Supplier Income
  useEffect(() => {
    if (newIncome.income_type === 'party_income' && newIncome.supplier_id) {
      const supplier = suppliers.find(s => s.id === newIncome.supplier_id)
      if (supplier) {
        setNewIncome(prev => ({
          ...prev,
          description: `${supplier.name}`
        }))
      }
    }
  }, [newIncome.supplier_id, newIncome.income_type, suppliers])

  const searchIncomes = async (start?: string, end?: string) => {
    const searchStart = start || startDate
    const searchEnd = end || endDate
    
    if (!searchStart) {
      setError("Please select a start date")
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData?.user) {
        throw new Error("Please sign in to view income records")
      }

      console.log("Searching income records for user:", userData.user.id)

      // ✅ UPDATED: Join with suppliers table to get supplier name
      let query = supabase
        .from("income_owner")
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .gte("date", searchStart)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (searchEnd && searchEnd !== searchStart) {
        query = query.lte("date", searchEnd)
      } else {
        query = query.lte("date", searchStart)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        console.error("Database query error:", queryError)
        throw new Error(`Database error: ${queryError.message}`)
      }

      // ✅ UPDATED: Map data to include supplier name
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        supplier_name: item.suppliers?.name || null
      }))

      console.log(`Found ${mappedData.length} income records`)
      setIncomes(mappedData)
      
    } catch (err: any) {
      const errorMessage = err?.message || "Error loading income records"
      console.error("Error loading income records:", err)
      setError(errorMessage)
      setIncomes([])
    } finally {
      setLoading(false)
    }
  }

  const addIncome = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData?.user) {
        toast({ title: "Authentication error", description: "Please sign in.", variant: "destructive" })
        return
      }

      console.log("Adding income for authenticated user")

      // Validation
      if (!newIncome.income_type) {
        toast({ title: "Missing information", description: "Please select an income type", variant: "destructive" })
        return
      }

      if (!newIncome.destination_type) {
        toast({ title: "Missing information", description: "Please select a destination (Cash or Bank)", variant: "destructive" })
        return
      }

      if (newIncome.amount <= 0) {
        toast({ title: "Invalid amount", description: "Please enter a valid amount greater than 0", variant: "destructive" })
        return
      }

      // ✅ NEW: Validate supplier for Supplier Income
      if (newIncome.income_type === 'party_income' && !newIncome.supplier_id) {
        toast({ title: "Missing information", description: "Please select a supplier for Supplier Income", variant: "destructive" })
        return
      }

      // Build income object
      const incomeToAdd: any = {
        date: newIncome.date,
        income_type: newIncome.income_type,
        amount: newIncome.amount,
        destination_type: newIncome.destination_type,
        description: newIncome.description.trim() || null,
        notes: newIncome.notes.trim() || null,
        supplier_id: newIncome.income_type === 'party_income' ? newIncome.supplier_id : null, // ✅ NEW: Save supplier_id
        organization_id: organizationId
      }

      console.log("Inserting income:", incomeToAdd)

      const { data, error } = await supabase
        .from("income_owner")
        .insert(incomeToAdd)
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .single()

      console.log("Insert result:", { data, error })

      if (error) {
        console.error("Insert error details:", error)
        toast({ title: "Failed to add income", description: error.message, variant: "destructive" })
        return
      }

      if (!data) {
        toast({ title: "Failed to add income", description: "No data returned", variant: "destructive" })
        return
      }

      // ✅ UPDATED: Map data to include supplier name
      const mappedIncome = {
        ...data,
        supplier_name: data.suppliers?.name || null
      }

      // Add to local state
      setIncomes([mappedIncome, ...incomes])
      
      // Reset form
      setNewIncome({
        date: newIncome.date,
        income_type: "" as "owner_income" | "party_income" | "",
        amount: 0,
        destination_type: "" as "cash" | "bank" | "",
        description: "",
        notes: "",
        supplier_id: "" // ✅ NEW: Reset supplier
      })
      
      console.log("Income added successfully:", data)
      toast({ title: "Success", description: "Income added successfully!" })
      
    } catch (err: any) {
      console.error("Unexpected error adding income:", err)
      toast({ title: "Error adding income", description: err?.message || "Unknown error", variant: "destructive" })
    }
  }

  const deleteIncome = async (id: string) => {
    if (!confirm("Are you sure you want to delete this income record?")) return

    try {
      const { error } = await supabase
        .from("income_owner")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        throw new Error("Failed to delete income record")
      }

      setIncomes(incomes.filter(i => i.id !== id))
      toast({ title: "Success", description: "Income record deleted successfully!" })
    } catch (err: any) {
      console.error("Error deleting income:", err)
      toast({ title: "Error", description: "Error deleting income record", variant: "destructive" })
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = generatePrintContent()
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }

  const generatePrintContent = () => {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      })
    }

    const totalAmount = filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0)

    const dateRange = startDate === endDate 
      ? formatDate(startDate)
      : `${formatDate(startDate)} --- ${formatDate(endDate)}`

    const getIncomeTypeLabel = (type: string) => {
      return type === "owner_income" ? "Owner Income" : "Supplier Income"
    }

    const getDestinationLabel = (income: IncomeEntry) => {
      return income.destination_type === "bank" ? "Bank" : "Cash"
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Income Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
          .address { font-size: 12px; margin-bottom: 8px; }
          .period { font-size: 12px; margin-bottom: 20px; }
          .title-oval { 
            border: 2px solid black; 
            border-radius: 50px; 
            padding: 8px 30px; 
            display: inline-block; 
            font-size: 18px; 
            font-weight: bold; 
          }
          .income-table { 
            width: 100%; 
            border-collapse: collapse; 
            border: 2px solid black; 
            margin-bottom: 30px; 
          }
          .income-table th, .income-table td { 
            border: 1px solid black; 
            padding: 8px; 
            text-align: left; 
          }
          .income-table th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center;
          }
          .amount-cell { text-align: right; }
          .total-row { 
            font-weight: bold; 
            background-color: #f0f0f0; 
          }
          .total-amount { 
            text-align: center; 
            margin: 30px 0; 
          }
          .total-title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 10px; 
          }
          .total-value { 
            font-size: 36px; 
            font-weight: bold; 
            border-top: 2px solid black; 
            padding-top: 10px; 
            display: inline-block; 
            min-width: 200px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${organization?.name || 'Company Name'}</div>
          <div class="address">
            ${organization?.address || ''}
          </div>
          <div class="period">PERIOD : ${dateRange}</div>
          <div class="title-oval">INCOME REPORT</div>
        </div>

        <table class="income-table">
          <thead>
            <tr>
              <th style="width: 12%;">Date</th>
              <th style="width: 15%;">Income Type</th>
              <th style="width: 18%;">Supplier</th>
              <th style="width: 15%;">Destination</th>
              <th style="width: 25%;">Description</th>
              <th style="width: 15%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredIncomes.map(income => `
              <tr>
                <td>${formatDate(income.date)}</td>
                <td>${getIncomeTypeLabel(income.income_type)}</td>
                <td>${income.supplier_name || '—'}</td>
                <td>${getDestinationLabel(income)}</td>
                <td>${income.description || '—'}</td>
                <td class="amount-cell">৳${income.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right; font-weight: bold;">TOTAL INCOME:</td>
              <td class="amount-cell">৳${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-amount">
          <div class="total-title">Total Income ৳${totalAmount.toFixed(2)}</div>
        </div>

      </body>
      </html>
    `
  }

  // ✅ UPDATED: Apply filters including supplier
  const filteredIncomes = incomes.filter((income) => {
    const matchesIncomeType = filterIncomeType === "all" || income.income_type === filterIncomeType
    const matchesDestination = filterDestination === "all" || income.destination_type === filterDestination
    const matchesSupplier = filterSupplier === "all" || income.supplier_id === filterSupplier
    return matchesIncomeType && matchesDestination && matchesSupplier
  })

  const totalAmount = filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0)

  const getIncomeTypeBadge = (type: string) => {
    return type === "owner_income" 
      ? <Badge className="bg-blue-100 text-blue-800">Owner Income</Badge>
      : <Badge className="bg-purple-100 text-purple-800">Supplier Income</Badge>
  }

  const getDestinationBadge = (destination: string) => {
    return destination === "cash"
      ? <Badge className="bg-green-100 text-green-800">Cash</Badge>
      : <Badge className="bg-orange-100 text-orange-800">Bank</Badge>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-red-600 font-medium">Error: {error}</div>
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Income Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="filter-income-type">Income Type</Label>
              <Select value={filterIncomeType} onValueChange={setFilterIncomeType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {incomeTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* ✅ NEW: Supplier filter */}
            <div>
              <Label htmlFor="filter-supplier">Supplier</Label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-destination">Destination</Label>
              <Select value={filterDestination} onValueChange={setFilterDestination}>
                <SelectTrigger>
                  <SelectValue placeholder="All Destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {destinationTypes.map(dest => (
                    <SelectItem key={dest.value} value={dest.value}>
                      {dest.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => searchIncomes()} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Search"}
              </Button>
              <Button onClick={handlePrint} variant="outline" disabled={filteredIncomes.length === 0}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Income Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Income
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              {showAddForm ? "Hide Form" : "Show Form"}
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="income-date">Date*</Label>
                <Input
                  id="income-date"
                  type="date"
                  value={newIncome.date}
                  onChange={(e) => setNewIncome({...newIncome, date: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="income-type">Income Type*</Label>
                <Select 
                  value={newIncome.income_type} 
                  onValueChange={(value: "owner_income" | "party_income") => 
                    setNewIncome({...newIncome, income_type: value, supplier_id: ""})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select income type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ✅ NEW: Supplier dropdown - only show for Supplier Income */}
              {newIncome.income_type === 'party_income' && (
                <div>
                  <Label htmlFor="supplier">Supplier*</Label>
                  <Select 
                    value={newIncome.supplier_id} 
                    onValueChange={(value) => setNewIncome({...newIncome, supplier_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No suppliers found
                        </SelectItem>
                      ) : (
                        suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="destination-type">Destination*</Label>
                <Select 
                  value={newIncome.destination_type} 
                  onValueChange={(value: "cash" | "bank") => 
                    setNewIncome({...newIncome, destination_type: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationTypes.map(dest => (
                      <SelectItem key={dest.value} value={dest.value}>
                        {dest.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (৳)*</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newIncome.amount}
                  onChange={(e) => setNewIncome({...newIncome, amount: Number(e.target.value) || 0})}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="description">
                Description {newIncome.income_type === 'party_income' ? '(Auto-filled)' : '(Optional)'}
              </Label>
              <Textarea
                id="description"
                value={newIncome.description}
                onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                placeholder="Enter income description"
                rows={3}
                readOnly={newIncome.income_type === 'party_income' && !!newIncome.supplier_id}
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={newIncome.notes}
                onChange={(e) => setNewIncome({...newIncome, notes: e.target.value})}
                placeholder="Additional notes about this income"
                rows={2}
              />
            </div>

            <div className="mt-4">
              <Button onClick={addIncome} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Income
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Income Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Income Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-600">৳{totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Entries</p>
              <p className="text-2xl font-semibold">{filteredIncomes.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Average per Entry</p>
              <p className="text-2xl font-semibold">
                ৳{filteredIncomes.length > 0 ? (totalAmount / filteredIncomes.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading income records...
            </div>
          ) : filteredIncomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No income records found for the selected filters
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Income Type</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isAdmin() && <TableHead className="text-center">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncomes.map((income) => (
                    <TableRow key={income.id}>
                      <TableCell>{income.date}</TableCell>
                      <TableCell>{getIncomeTypeBadge(income.income_type)}</TableCell>
                      <TableCell>{income.supplier_name || '—'}</TableCell>
                      <TableCell>{getDestinationBadge(income.destination_type)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {income.description || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ৳{income.amount.toFixed(2)}
                      </TableCell>
                      {isAdmin() && (
                        <TableCell className="text-center">
                          <Button
                            onClick={() => deleteIncome(income.id!)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-50">
                    <TableCell colSpan={5}>TOTAL INCOME</TableCell>
                    <TableCell className="text-right">৳{totalAmount.toFixed(2)}</TableCell>
                    {isAdmin() && <TableCell></TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
              
              <div className="mt-6 text-center">
                <div className="inline-block border-t-2 border-black pt-4">
                  <div className="text-lg font-semibold">Total Income ৳{totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}