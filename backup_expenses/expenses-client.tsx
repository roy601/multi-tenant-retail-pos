"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Filter, Download, Edit, Trash2, Calendar, DollarSign, Receipt, Building } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/component"

type ExpenseCategory = 
  | "salaries" 
  | "printer_papers" 
  | "water_bill" 
  | "mobile_bill" 
  | "internet_bill" 
  | "land_bill" 
  | "bank_charge" 
  | "shopping_bag" 
  | "other"

type UserRole = "owner" | "admin" | "manager" | "employee" | ""

type PaymentMethod = "cash" | "card" | "mobile_banking" | "bank_transfer"

type Expense = {
  id: string
  date: string
  category: ExpenseCategory
  customCategory?: string
  description: string
  amount: number
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
  userId?: string
  organizationId?: string
  createdAt: string
  updatedAt: string
}

const supabase = createClient()

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "salaries", label: "Salaries" },
  { value: "printer_papers", label: "Printer Papers" },
  { value: "water_bill", label: "Water Bill" },
  { value: "mobile_bill", label: "Mobile Bill" },
  { value: "internet_bill", label: "Internet Bill" },
  { value: "land_bill", label: "Land Bill" },
  { value: "bank_charge", label: "Bank Charge" },
  { value: "shopping_bag", label: "Shopping Bag" },
  { value: "other", label: "Other" },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "mobile_banking", label: "Mobile Banking" },
  { value: "bank_transfer", label: "Bank Transfer" },
]

export function ExpensesClient() {
  const { toast } = useToast()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showEditExpense, setShowEditExpense] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [userRole, setUserRole] = useState<UserRole>("")

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("this-month")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: "" as ExpenseCategory | "",
    customCategory: "",
    description: "",
    amount: "",
    paymentMethod: "" as PaymentMethod | "",
    notes: "",
  })

  // Load expenses from Supabase
  useEffect(() => {
    loadExpenses()
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error("No authenticated user found")
        setUserRole("employee")
        return
      }

      console.log("Checking role for user:", user.id)

      const { data, error } = await supabase
        .from("user_organizations")
        .select("role")
        .eq("user_id", user.id)
        .single()

      if (error) {
        console.error("Error fetching user role:", error)
        
        // If user not found in organizations, they need to be set up
        if (error.code === 'PGRST116') {
          console.log("User not found in any organization - setting up default...")
          setUserRole("employee")
          toast({
            title: "Setup Required",
            description: "Please contact your administrator to set up your organization access.",
            variant: "destructive",
          })
        } else {
          console.error("Unexpected error:", error)
          setUserRole("employee")
        }
        return
      }

      if (data && data.role) {
        console.log("User role found:", data.role)
        setUserRole(data.role)
      } else {
        console.log("No role data returned")
        setUserRole("employee")
      }
    } catch (error) {
      console.error("Error in checkUserRole:", error)
      setUserRole("employee") // Default fallback role
      toast({
        title: "Permission Error",
        description: "Could not determine your access level. Defaulting to employee access.",
        variant: "destructive",
      })
    }
  }

  // Helper functions for role-based permissions
  const canAddExpense = () => ["owner", "admin", "manager"].includes(userRole)
  const canEditExpense = () => ["owner", "admin", "manager"].includes(userRole)
  const canDeleteExpense = () => ["owner", "admin"].includes(userRole)

  const loadExpenses = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })

      if (error) throw error

      const mappedExpenses: Expense[] = (data || []).map((item: any) => ({
        id: item.id,
        date: item.date || item.created_at,
        category: item.category,
        customCategory: item.custom_category,
        description: item.description,
        amount: Number(item.amount),
        paymentMethod: item.payment_method,
        reference: item.reference,
        notes: item.notes,
        userId: item.user_id,
        organizationId: item.organization_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))

      setExpenses(mappedExpenses)
    } catch (error: any) {
      console.error("Error loading expenses:", error)
      toast({
        title: "Failed to load expenses",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const now = new Date()
    
    return expenses.filter((expense) => {
      // Text search
      const matchesSearch = !term || 
        expense.description.toLowerCase().includes(term) ||
        expense.category.toLowerCase().includes(term) ||
        (expense.customCategory?.toLowerCase().includes(term)) ||
        (expense.reference?.toLowerCase().includes(term))

      // Category filter
      const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory

      // Payment method filter
      const matchesPaymentMethod = selectedPaymentMethod === "all" || expense.paymentMethod === selectedPaymentMethod

      // Date filter
      let matchesPeriod = true
      const expenseDate = new Date(expense.date)
      
      if (selectedPeriod !== "all") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay())
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)

        switch (selectedPeriod) {
          case "today":
            matchesPeriod = expenseDate >= today
            break
          case "this-week":
            matchesPeriod = expenseDate >= startOfWeek
            break
          case "this-month":
            matchesPeriod = expenseDate >= startOfMonth
            break
          case "this-year":
            matchesPeriod = expenseDate >= startOfYear
            break
          case "custom":
            if (startDate && endDate) {
              const start = new Date(startDate)
              const end = new Date(endDate)
              matchesPeriod = expenseDate >= start && expenseDate <= end
            }
            break
        }
      }

      return matchesSearch && matchesCategory && matchesPaymentMethod && matchesPeriod
    })
  }, [expenses, searchTerm, selectedCategory, selectedPaymentMethod, selectedPeriod, startDate, endDate])

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const todayExpenses = expenses.filter(expense => {
    const today = new Date().toISOString().split('T')[0]
    return expense.date === today
  }).reduce((sum, expense) => sum + expense.amount, 0)

  const thisMonthExpenses = expenses.filter(expense => {
    const now = new Date()
    const expenseDate = new Date(expense.date)
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
  }).reduce((sum, expense) => sum + expense.amount, 0)

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: "",
      customCategory: "",
      description: "",
      amount: "",
      paymentMethod: "",
      notes: "",
    })
  }

  const handleAddExpense = async () => {
    // Check permissions - owners, admins, and managers can add expenses
    if (!canAddExpense()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to add expenses",
        variant: "destructive",
      })
      return
    }

    if (!formData.category || !formData.description || !formData.amount || !formData.paymentMethod) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const expenseData = {
        date: formData.date,
        category: formData.category,
        custom_category: formData.category === "other" ? formData.customCategory : null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.paymentMethod,
        notes: formData.notes || null,
        // user_id and organization_id will be set automatically by the trigger
      }

      const { error } = await supabase
        .from("expenses")
        .insert([expenseData])

      if (error) throw error

      toast({
        title: "Expense added",
        description: "Expense has been recorded successfully",
      })

      resetForm()
      setShowAddExpense(false)
      loadExpenses()
    } catch (error: any) {
      console.error("Error adding expense:", error)
      toast({
        title: "Failed to add expense",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleEditExpense = async () => {
    // Check permissions - owners, admins, and managers can edit expenses
    if (!canEditExpense()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit expenses",
        variant: "destructive",
      })
      return
    }

    if (!selectedExpense || !formData.category || !formData.description || !formData.amount || !formData.paymentMethod) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const expenseData = {
        date: formData.date,
        category: formData.category,
        custom_category: formData.category === "other" ? formData.customCategory : null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.paymentMethod,
        notes: formData.notes || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", selectedExpense.id)

      if (error) throw error

      toast({
        title: "Expense updated",
        description: "Expense has been updated successfully",
      })

      resetForm()
      setShowEditExpense(false)
      setSelectedExpense(null)
      loadExpenses()
    } catch (error: any) {
      console.error("Error updating expense:", error)
      toast({
        title: "Failed to update expense",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDeleteExpense = async (expense: Expense) => {
    // Check permissions - only owners and admins can delete
    if (!canDeleteExpense()) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete expenses",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Are you sure you want to delete this expense: ${expense.description}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id)

      if (error) throw error

      toast({
        title: "Expense deleted",
        description: "Expense has been deleted successfully",
      })

      loadExpenses()
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Failed to delete expense",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleExportExpenses = () => {
    try {
      const csvData = filteredExpenses.map(expense => ({
        Date: expense.date,
        Category: expense.category === "other" && expense.customCategory ? expense.customCategory : 
                 EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category,
        Description: expense.description,
        Amount: expense.amount,
        "Payment Method": PAYMENT_METHODS.find(p => p.value === expense.paymentMethod)?.label || expense.paymentMethod,
        Reference: expense.reference || "",
        Notes: expense.notes || "",
      }))

      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(","),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export successful",
        description: `Exported ${filteredExpenses.length} expense records`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export expense data",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      date: expense.date,
      category: expense.category,
      customCategory: expense.customCategory || "",
      description: expense.description,
      amount: expense.amount.toString(),
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || "",
    })
    setShowEditExpense(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setSelectedPaymentMethod("all")
    setSelectedPeriod("this-month")
    setStartDate("")
    setEndDate("")
  }

  const getCategoryDisplay = (expense: Expense) => {
    if (expense.category === "other" && expense.customCategory) {
      return expense.customCategory
    }
    return EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category
  }

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const colors = {
      cash: "bg-green-100 text-green-800",
      card: "bg-blue-100 text-blue-800",
      mobile_banking: "bg-purple-100 text-purple-800",
      bank_transfer: "bg-orange-100 text-orange-800",
    }
    return (
      <Badge className={colors[method]}>
        {PAYMENT_METHODS.find(p => p.value === method)?.label || method}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expenses</h1>
        </div>
        <div className="flex items-center justify-center h-32">
          <span>Loading expenses...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExpenses} disabled={filteredExpenses.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canAddExpense() && (
            <Button onClick={() => setShowAddExpense(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{todayExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Today's total expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{thisMonthExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current month total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Total</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{filteredExpenses.length > 0 ? (totalExpenses / filteredExpenses.length).toFixed(0) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-method">Payment</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedPeriod === "custom" && (
              <>
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
              </>
            )}
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            {filteredExpenses.length > 0 
              ? `Showing ${filteredExpenses.length} of ${expenses.length} expenses`
              : "No expenses found"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expenses found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryDisplay(expense)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground">{expense.notes}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">৳{expense.amount.toLocaleString()}</TableCell>
                    <TableCell>{getPaymentMethodBadge(expense.paymentMethod)}</TableCell>
                    <TableCell className="font-mono text-sm">{expense.reference || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEditExpense() && (
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteExpense() && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteExpense(expense)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Record a new business expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-date">Date*</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expense-category">Category*</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: ExpenseCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.category === "other" && (
              <div>
                <Label htmlFor="custom-category">Custom Category*</Label>
                <Input
                  id="custom-category"
                  placeholder="Enter custom category name"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="expense-description">Description*</Label>
              <Input
                id="expense-description"
                placeholder="Enter expense description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-amount">Amount*</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expense-payment-method">Payment Method*</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="expense-notes">Notes</Label>
              <Textarea
                id="expense-notes"
                placeholder="Additional notes about this expense"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddExpense(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} className="bg-green-600 hover:bg-green-700">
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditExpense} onOpenChange={setShowEditExpense}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-expense-date">Date*</Label>
                <Input
                  id="edit-expense-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-expense-category">Category*</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: ExpenseCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.category === "other" && (
              <div>
                <Label htmlFor="edit-custom-category">Custom Category*</Label>
                <Input
                  id="edit-custom-category"
                  placeholder="Enter custom category name"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-expense-description">Description*</Label>
              <Input
                id="edit-expense-description"
                placeholder="Enter expense description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-expense-amount">Amount*</Label>
                <Input
                  id="edit-expense-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-expense-payment-method">Payment Method*</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-expense-notes">Notes</Label>
              <Textarea
                id="edit-expense-notes"
                placeholder="Additional notes about this expense"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditExpense(false); resetForm(); setSelectedExpense(null); }}>
              Cancel
            </Button>
            <Button onClick={handleEditExpense} className="bg-green-600 hover:bg-green-700">
              Update Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}