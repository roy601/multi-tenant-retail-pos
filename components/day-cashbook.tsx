"use client";

import { useState, useEffect } from "react";
import { Calendar, Printer, RefreshCw, Lock, Edit2, Trash2, Check, X as XIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/component";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/components/role-provider";

const supabase = createClient();

type CashbookEntry = {
  particulars: string;
  debit: number;
  credit: number;
  sourceId?: string;       // id of the source expense or income record
  sourceType?: "expense" | "income"; // which table
};

type CashbookData = {
  startDate: string;
  endDate: string;
  entries: CashbookEntry[];
  totalDebit: number;
  totalCredit: number;
  cashInHand: number;
};

export function DayCashbook() {
  const { toast } = useToast();
  const { isAdmin, organization } = useRole();
  const organizationId = organization?.id || null;

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true);
  const [cashbookData, setCashbookData] = useState<CashbookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Manual BFC override (owner-only)
  const [manualBfcInput, setManualBfcInput] = useState<string>("");
  const [manualBfcActive, setManualBfcActive] = useState(false);
  const [manualBfcValue, setManualBfcValue] = useState<number | null>(null);

  // Inline edit state for expense / income rows
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");
  const [editingParticulars, setEditingParticulars] = useState<string>("");

  // isAuthorized now reflects owner role
  useEffect(() => {
    setIsAuthorized(isAdmin());
  }, []);

  useEffect(() => {
    if (dateFilterEnabled) {
      if (startDate && endDate) {
        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
          setError("Start date cannot be after end date");
          return;
        }
        loadCashbookData(startDate, endDate);
      } else if (startDate && !endDate) {
        // Only start date - from that date to today
        loadCashbookData(startDate, today);
      } else if (!startDate && endDate) {
        // Only end date - from beginning to that date
        loadCashbookData("2000-01-01", endDate);
      } else {
        // No dates - show all time
        loadCashbookData("2000-01-01", today);
      }
    }
  }, [startDate, endDate, dateFilterEnabled]);

  // Get the date range description
  const getDateRangeDescription = () => {
    if (!dateFilterEnabled) return "Date filter disabled";
    if (!startDate && !endDate) return "All time";
    if (!startDate && endDate)
      return `All data up to ${new Date(endDate).toLocaleDateString("en-GB")}`;
    if (startDate && !endDate)
      return `From ${new Date(startDate).toLocaleDateString("en-GB")} onwards`;
    return `${new Date(startDate).toLocaleDateString("en-GB")} to ${new Date(
      endDate
    ).toLocaleDateString("en-GB")}`;
  };

  const loadCashbookData = async (start: string, end: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get BFC from the day before start date
      const prevDate = new Date(start);
      prevDate.setDate(prevDate.getDate() - 1);
      const previousDate = prevDate.toISOString().split("T")[0];

      // Initialize default data
      let salesData: {
        totalSalesAmount: number;
        cashAmount: number;
        bankAmount: number;
        duesAmount: number;
      } = {
        totalSalesAmount: 0,
        cashAmount: 0,
        bankAmount: 0,
        duesAmount: 0,
      };
      let purchaseData = { totalAmount: 0, numPurchases: 0 };
      let returnsData = { salesReturns: 0, purchaseReturns: 0 };
      let expensesData: {
        individualExpenses: any[];
      } = {
        individualExpenses: [],
      };
      let incomeData: {
        individualIncomes: any[];
      } = {
        individualIncomes: [],
      };
      let bfcAmount = 0;

      try {
        const results = await Promise.all([
          getSalesData(start, end).catch((err) => {
            console.warn("Sales data error:", err);
            return salesData;
          }),

          getReturnsData(start, end).catch((err) => {
            console.warn("Returns data error:", err);
            return returnsData;
          }),
          getExpensesData(start, end).catch((err) => {
            console.warn("Expenses data error:", err);
            return expensesData;
          }),
          getIncomeData(start, end).catch((err) => {
            console.warn("Income data error:", err);
            return incomeData;
          }),
          getPreviousBalance(previousDate).catch((err) => {
            console.warn("Previous balance error:", err);
            return 0;
          }),
        ]);

        salesData = results[0] || salesData;
        returnsData = results[1] || returnsData;
        expensesData = results[2] || expensesData;
        incomeData = results[3] || incomeData;
        bfcAmount = results[4] || 0;
      } catch (err) {
        console.error("Error loading data:", err);
      }

      // Build entries array
      const entries: CashbookEntry[] = [];

      // Add BFC entry (opening balance) — use manual override if set by owner
      const effectiveBfc = manualBfcActive && manualBfcValue !== null ? manualBfcValue : bfcAmount;
      entries.push({
        particulars: `BFC (Brought Forward Cash)${manualBfcActive ? " [Manual Override]" : ""}`,
        debit: effectiveBfc >= 0 ? effectiveBfc : 0,
        credit: effectiveBfc < 0 ? Math.abs(effectiveBfc) : 0,
      });

      // Cash Sales (actual cash received, money IN)
      if (salesData.totalSalesAmount > 0) {
        entries.push({
          particulars: "Cash Sales",
          debit: salesData.totalSalesAmount,
          credit: 0,
        });
      }

      // UPDATED: Bank/Digital Payments (money goes to bank, not cash in hand - CREDIT)
      if (salesData.bankAmount > 0) {
        entries.push({
          particulars: "Bank/Digital Payments",
          debit: 0,
          credit: salesData.bankAmount,
        });
      }

      // Purchase Returns (money/credit coming back from suppliers)
      if (returnsData.purchaseReturns > 0) {
        entries.push({
          particulars: "Purchase Returns",
          debit: returnsData.purchaseReturns,
          credit: 0,
        });
      }

      // Add individual income transactions
      if (
        incomeData.individualIncomes &&
        incomeData.individualIncomes.length > 0
      ) {
        incomeData.individualIncomes.forEach((income: any) => {
          const incomeTypeLabel =
            income.income_type === "owner_income"
              ? "Owner Income"
              : "Party Income";
          const destinationLabel =
            income.destination_type === "bank" ? "Bank" : "Cash";
          const description = income.description
            ? ` - ${income.description}`
            : "";

          entries.push({
            particulars: `${incomeTypeLabel} (${destinationLabel})${description}`,
            debit: income.amount || 0,
            credit: 0,
            sourceId: income.id,
            sourceType: "income",
          });
        });
      }

      // Sales Returns (refunds paid to customers)
      if (returnsData.salesReturns > 0) {
        entries.push({
          particulars: "Sales Returns (Refunds)",
          debit: 0,
          credit: returnsData.salesReturns,
        });
      }

      // Add individual expense transactions
      if (
        expensesData.individualExpenses &&
        expensesData.individualExpenses.length > 0
      ) {
        expensesData.individualExpenses.forEach((expense: any) => {
          const category =
            expense.custom_category || expense.category || "Other";
          entries.push({
            particulars: `${category} - ${expense.description}`,
            debit: 0,
            credit: expense.amount || 0,
            sourceId: expense.id,
            sourceType: "expense",
          });
        });
      }

      // Calculate totals
      const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
      const cashInHand = totalDebit - totalCredit;

      const data: CashbookData = {
        startDate: start,
        endDate: end,
        entries: entries,
        totalDebit: totalDebit,
        totalCredit: totalCredit,
        cashInHand: cashInHand,
      };

      setCashbookData(data);
    } catch (err: any) {
      console.error("Error loading cashbook data:", err);
      setError(err.message || "Failed to load cashbook data");
      toast({
        title: "Error",
        description: "Failed to load cashbook data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSalesData = async (start: string, end: string) => {
    try {
      let query = supabase
        .from("sales")
        .select(
          `
          id, 
          total_amount, 
          cash_received, 
          card_received, 
          bank_transfer_received, 
          bkash_received, 
          nagad_received, 
          rocket_received, 
          upay_received, 
          due_amount, 
          invoice_number
        `
        )
        .gte("created_at", start)
        .lte("created_at", `${end}T23:59:59.999Z`)
        .eq("status", "completed");

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Sales data error:", error);
        throw error;
      }

      const sales = data || [];

      const totals = sales.reduce(
        (acc, sale) => {
          const totalAmount = sale.total_amount || 0;
          const cashAmount = sale.cash_received || 0;
          const bankAmount =
            (sale.card_received || 0) +
            (sale.bank_transfer_received || 0) +
            (sale.bkash_received || 0) +
            (sale.nagad_received || 0) +
            (sale.rocket_received || 0) +
            (sale.upay_received || 0);
          const duesAmount = sale.due_amount || 0;

          return {
            totalSalesAmount: acc.totalSalesAmount + totalAmount,
            cashAmount: acc.cashAmount + cashAmount,
            bankAmount: acc.bankAmount + bankAmount,
            duesAmount: acc.duesAmount + duesAmount,
          };
        },
        { totalSalesAmount: 0, cashAmount: 0, bankAmount: 0, duesAmount: 0 }
      );

      return totals;
    } catch (error) {
      console.error("getSalesData error:", error);
      return {
        totalSalesAmount: 0,
        cashAmount: 0,
        bankAmount: 0,
        duesAmount: 0,
      };
    }
  };

  // const getPurchaseData = async (start: string, end: string) => {
  //   try {
  //     const { data, error } = await supabase
  //       .from("purchases")
  //       .select(`
  //         id,
  //         cost_price,
  //         color_variants(purchase_id)
  //       `)
  //       .gte("created_at", start)
  //       .lte("created_at", `${end}T23:59:59.999Z`)

  //     if (error) {
  //       console.error("Purchase data error:", error)
  //       return { totalAmount: 0, numPurchases: 0 }
  //     }

  //     // Count total color_variants (products)
  //     let numPurchases = data.flatMap(p => p.color_variants ?? []).length

  //     // Calculate total amount: cost_price × number of variants for each purchase
  //     const totalAmount = data.reduce((sum, purchase) => {
  //       const numVariants = purchase.color_variants?.length ?? 0
  //       const costPrice = purchase.cost_price ?? 0
  //       return sum + (costPrice * numVariants)
  //     }, 0)

  //     return { totalAmount, numPurchases }
  //   } catch (error) {
  //     console.error("getPurchaseData error:", error)
  //     return { totalAmount: 0, numPurchases: 0 }
  //   }
  // }

  const getReturnsData = async (start: string, end: string) => {
    try {
      let salesReturnsQuery = supabase
        .from("sales_returns")
        .select("total_refund_amount")
        .gte("return_date", start)
        .lte("return_date", `${end}T23:59:59.999Z`)
        .eq("status", "processed");
        
      let purchaseReturnsQuery = supabase
        .from("purchase_returns")
        .select("total_credit_amount")
        .gte("return_date", start)
        .lte("return_date", end)
        .eq("status", "processed");

      if (organizationId) {
        salesReturnsQuery = salesReturnsQuery.eq("organization_id", organizationId);
        purchaseReturnsQuery = purchaseReturnsQuery.eq("organization_id", organizationId);
      }

      const [salesReturnsResult, purchaseReturnsResult] = await Promise.all([
        salesReturnsQuery.then((result) => (result.error ? { data: [] } : result)),
        purchaseReturnsQuery.then((result) => (result.error ? { data: [] } : result)),
      ]);

      const salesReturns = (salesReturnsResult.data || []).reduce(
        (sum, ret) => sum + (ret.total_refund_amount || 0),
        0
      );

      const purchaseReturns = (purchaseReturnsResult.data || []).reduce(
        (sum, ret) => sum + (ret.total_credit_amount || 0),
        0
      );

      return {
        salesReturns,
        purchaseReturns,
      };
    } catch (error) {
      console.error("getReturnsData error:", error);
      return { salesReturns: 0, purchaseReturns: 0 };
    }
  };

  const getExpensesData = async (start: string, end: string) => {
    try {
      let query = supabase
        .from("expenses")
        .select(
          "id, amount, category, custom_category, description, created_at"
        )
        .gte("date", start)
        .lte("date", end)
        .order("created_at", { ascending: true });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Expenses data error:", error);
        return { individualExpenses: [] };
      }

      const expenses = data || [];

      const individualExpenses = expenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount || 0,
        category: expense.category || "Other",
        custom_category: expense.custom_category,
        description: expense.description || "No description",
        created_at: expense.created_at,
      }));

      return { individualExpenses };
    } catch (error) {
      console.error("getExpensesData error:", error);
      return { individualExpenses: [] };
    }
  };

  const getIncomeData = async (start: string, end: string) => {
    try {
      let query = supabase
        .from("income_owner")
        .select(
          "id, amount, income_type, destination_type, description, created_at"
        )
        .gte("date", start)
        .lte("date", end)
        .order("created_at", { ascending: true });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Income data error:", error);
        return { individualIncomes: [] };
      }

      const incomes = data || [];

      const individualIncomes = incomes.map((income) => ({
        id: income.id,
        amount: income.amount || 0,
        income_type: income.income_type || "owner_income",
        destination_type: income.destination_type || "cash",
        description: income.description || "",
        created_at: income.created_at,
      }));

      return { individualIncomes };
    } catch (error) {
      console.error("getIncomeData error:", error);
      return { individualIncomes: [] };
    }
  };

  const getPreviousBalance = async (date: string) => {
    try {
      // Get all data up to and including the previous date
      const [salesResult, returnsResult, expensesResult, incomeResult] =
        await Promise.all([
          getSalesData("2000-01-01", date),
          getReturnsData("2000-01-01", date),
          getExpensesData("2000-01-01", date),
          getIncomeData("2000-01-01", date),
        ]);

      // Calculate total income amount
      const totalIncome = incomeResult.individualIncomes.reduce(
        (sum, income) => sum + income.amount,
        0
      );

      // UPDATED: Calculate total debits (money in) - now EXCLUDING bankAmount
      const totalDebits =
        salesResult.cashAmount + returnsResult.purchaseReturns + totalIncome;

      // UPDATED: Calculate total credits (money out) - now INCLUDING bankAmount
      const totalCredits =
        returnsResult.salesReturns +
        expensesResult.individualExpenses.reduce(
          (sum, exp) => sum + exp.amount,
          0
        ) +
        salesResult.duesAmount; // Bank payments reduce cash in hand

      // Cash in hand = Dr - Cr
      const balance = totalDebits - totalCredits;

      return balance;
    } catch (error) {
      console.error("getPreviousBalance error:", error);
      return 0;
    }
  };

  const handlePrint = () => {
    if (!cashbookData) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = generatePrintContent();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintContent = () => {
    if (!cashbookData) return "";

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatAmount = (amount: number) => amount.toFixed(2);

    const dateRangeText = getDateRangeDescription();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cash Book - ${dateRangeText}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 15px; 
            font-size: 12px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px;
          }
          .company-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .address { 
            font-size: 10px; 
            margin-bottom: 10px; 
          }
          .period {
            font-size: 11px;
            margin-bottom: 10px;
          }
          .title {
            border: 2px solid black;
            border-radius: 20px;
            padding: 5px 20px;
            display: inline-block;
            font-size: 14px;
            font-weight: bold;
          }
          .cashbook-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            border: 2px solid black;
          }
          .cashbook-table th, 
          .cashbook-table td { 
            border: 1px solid black; 
            padding: 6px; 
            text-align: left; 
            font-size: 11px;
          }
          .cashbook-table th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center;
          }
          .amount-cell { 
            text-align: right; 
            font-family: monospace;
          }
          .total-row { 
            font-weight: bold; 
            background-color: #f0f0f0;
            border-top: 2px solid black;
          }
          .cash-in-hand {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-top: 20px;
          }
          @media print {
            body { margin: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${organization?.name || 'Company Name'}</div>
          <div class="address">
            ${organization?.address || ''}
          </div>
          <div class="period">${dateRangeText}</div>
          <div class="title">CASH BOOK</div>
        </div>

        <table class="cashbook-table">
          <thead>
            <tr>
              <th style="width: 50%;">Particulars</th>
              <th style="width: 25%;">Dr.</th>
              <th style="width: 25%;">Cr.</th>
            </tr>
          </thead>
          <tbody>
            ${(cashbookData.entries || [])
              .map(
                (entry) => `
              <tr>
                <td>${entry.particulars}</td>
                <td class="amount-cell">${
                  entry.debit > 0 ? formatAmount(entry.debit) : ""
                }</td>
                <td class="amount-cell">${
                  entry.credit > 0 ? formatAmount(entry.credit) : ""
                }</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td></td>
              <td class="amount-cell">${formatAmount(
                cashbookData.totalDebit || 0
              )}</td>
              <td class="amount-cell">${formatAmount(
                cashbookData.totalCredit || 0
              )}</td>
            </tr>
          </tbody>
        </table>

        <div class="cash-in-hand">
          Cash In Hand &nbsp;&nbsp;&nbsp;&nbsp; ${formatAmount(
            cashbookData.cashInHand || 0
          )}
        </div>
      </body>
      </html>
    `;
  };

  const formatCurrency = (amount: number) => amount.toFixed(2);

  // Delete an expense or income row from the cashbook and from DB
  const deleteEntry = async (sourceId: string, sourceType: "expense" | "income") => {
    if (!confirm(`Delete this ${sourceType} entry? This cannot be undone.`)) return;
    try {
      const table = sourceType === "expense" ? "expenses" : "income_owner";
      const { error } = await supabase.from(table).delete().eq("id", sourceId);
      if (error) throw error;
      toast({ title: "Deleted", description: `${sourceType} entry removed.` });
      // Reload cashbook
      const s = startDate || "2000-01-01";
      const e = endDate || today;
      loadCashbookData(s, e);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to delete.", variant: "destructive" });
    }
  };

  // Save inline edit (amount) for an expense or income row
  const saveEdit = async () => {
    if (!editingRowId) return;
    const amount = parseFloat(editingAmount);
    if (!isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a positive number.", variant: "destructive" });
      return;
    }
    // Determine source type from the entry
    const entry = cashbookData?.entries.find(e => e.sourceId === editingRowId);
    if (!entry?.sourceType) return;
    const table = entry.sourceType === "expense" ? "expenses" : "income_owner";
    const field = entry.sourceType === "expense" ? "amount" : "amount";
    try {
      const { error } = await supabase.from(table).update({ [field]: amount }).eq("id", editingRowId);
      if (error) throw error;
      toast({ title: "Updated", description: "Entry updated successfully." });
      setEditingRowId(null);
      const s = startDate || "2000-01-01";
      const e = endDate || today;
      loadCashbookData(s, e);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to update.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cash Book</h1>
        <div className="flex items-center gap-2">
          {!isAuthorized && (
            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              <Lock className="h-4 w-4 mr-2" />
              Read Only
            </div>
          )}
          <Button
            variant="outline"
            onClick={() =>
              dateFilterEnabled &&
              loadCashbookData(startDate || "2000-01-01", endDate || today)
            }
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={handlePrint} disabled={!cashbookData}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <Label htmlFor="start-date">From Date (optional)</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">To Date (optional)</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className="mt-6"
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
                    className="mt-6"
                  >
                    Clear Dates
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>Showing: </strong>
                  {getDateRangeDescription()}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual BFC — Owner Only */}
      {isAuthorized && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Manual BFC Override (Owner)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <Label htmlFor="manual-bfc">BFC Amount (৳)</Label>
                <Input
                  id="manual-bfc"
                  type="number"
                  step="0.01"
                  placeholder="Auto-calculated"
                  value={manualBfcInput}
                  onChange={(e) => setManualBfcInput(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button
                onClick={() => {
                  const val = parseFloat(manualBfcInput);
                  if (!isFinite(val)) {
                    toast({ title: "Invalid", description: "Enter a valid number.", variant: "destructive" });
                    return;
                  }
                  setManualBfcValue(val);
                  setManualBfcActive(true);
                  // Rebuild cashbook with manual BFC
                  const s = startDate || "2000-01-01";
                  const e = endDate || today;
                  loadCashbookData(s, e);
                  toast({ title: "BFC Set", description: `Manual BFC ৳${val.toFixed(2)} applied.` });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Set BFC
              </Button>
              {manualBfcActive && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setManualBfcValue(null);
                    setManualBfcActive(false);
                    setManualBfcInput("");
                    const s = startDate || "2000-01-01";
                    const e = endDate || today;
                    loadCashbookData(s, e);
                    toast({ title: "BFC Cleared", description: "Auto-calculated BFC restored." });
                  }}
                >
                  Clear Override
                </Button>
              )}
              {manualBfcActive && (
                <span className="text-sm text-blue-700 font-medium">
                  Active override: ৳{manualBfcValue?.toFixed(2)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-red-600 font-medium">Error: {error}</div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading cashbook data...</p>
          </CardContent>
        </Card>
      )}

      {/* Main Cashbook */}
      {cashbookData && !loading && (
        <Card>
          <CardHeader className="text-center">
            <div className="text-center mb-6">
              <div className="text-xl font-bold">{organization?.name || 'Company Name'}</div>
              <div className="text-sm text-muted-foreground">{organization?.address || ''}</div>
              <div className="text-sm mt-1">{getDateRangeDescription() || 'All Time'}</div>
              <div className="inline-block border-2 border-black rounded-full px-6 py-1 font-bold">
                CASH BOOK
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table
                className="w-full border-2 border-black"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr className="bg-gray-100">
                    <th
                      className="border border-black px-3 py-2 text-center font-bold"
                      style={{ width: isAuthorized ? "44%" : "50%" }}
                    >
                      Particulars
                    </th>
                    <th
                      className="border border-black px-3 py-2 text-center font-bold"
                      style={{ width: isAuthorized ? "22%" : "25%" }}
                    >
                      Dr.
                    </th>
                    <th
                      className="border border-black px-3 py-2 text-center font-bold"
                      style={{ width: isAuthorized ? "22%" : "25%" }}
                    >
                      Cr.
                    </th>
                    {isAuthorized && (
                      <th
                        className="border border-black px-3 py-2 text-center font-bold"
                        style={{ width: "12%" }}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(cashbookData?.entries || []).map((entry, index) => {
                    const isEditing = editingRowId === entry.sourceId;
                    return (
                      <tr key={index}>
                        <td className="border border-black px-3 py-1 text-sm">
                          {entry.particulars}
                        </td>
                        <td className="border border-black px-3 py-1 text-right text-sm font-mono">
                          {isEditing && entry.debit > 0 ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              className="w-full h-7 text-right text-sm"
                            />
                          ) : (
                            entry.debit > 0 ? formatCurrency(entry.debit) : ""
                          )}
                        </td>
                        <td className="border border-black px-3 py-1 text-right text-sm font-mono">
                          {isEditing && entry.credit > 0 ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingAmount}
                              onChange={(e) => setEditingAmount(e.target.value)}
                              className="w-full h-7 text-right text-sm"
                            />
                          ) : (
                            entry.credit > 0 ? formatCurrency(entry.credit) : ""
                          )}
                        </td>
                        {isAuthorized && (
                          <td className="border border-black px-2 py-1 text-center">
                            {entry.sourceId && entry.sourceType ? (
                              isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={saveEdit}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-500" onClick={() => setEditingRowId(null)}>
                                    <XIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-blue-600"
                                    onClick={() => {
                                      setEditingRowId(entry.sourceId!);
                                      setEditingAmount(
                                        String(entry.debit > 0 ? entry.debit : entry.credit)
                                      );
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-600"
                                    onClick={() => deleteEntry(entry.sourceId!, entry.sourceType!)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-gray-100 font-bold border-t-2 border-black">
                    <td className="border border-black px-3 py-2"></td>
                    <td className="border border-black px-3 py-2 text-right font-mono">
                      {formatCurrency(cashbookData?.totalDebit || 0)}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-mono">
                      {formatCurrency(cashbookData?.totalCredit || 0)}
                    </td>
                    {isAuthorized && <td className="border border-black px-3 py-2"></td>}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash In Hand */}
            <div className="text-center mt-8 text-xl font-bold">
              Cash In Hand &nbsp;&nbsp;&nbsp;&nbsp;{" "}
              {formatCurrency(cashbookData?.cashInHand || 0)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
