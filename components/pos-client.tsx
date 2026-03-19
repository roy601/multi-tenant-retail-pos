"use client";

import { useState, useEffect } from "react";
import {
  Calculator,
  CreditCard,
  Receipt,
  QrCode,
  User,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { POSCalculator } from "@/components/pos-calculator";
import { CustomerSearch } from "@/components/customer-search";
import { ProductScanner } from "@/components/product-scanner";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/component";
import { useRole } from "@/components/role-provider";

type CartItem = {
  id: string;
  name: string;
  model: string;
  color: string;
  quantity: number;
  price: number;
  discount: number;
  barcode: string;
  cost_price?: number;
};

type Customer = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  dues: number;
};

type ProductResponse = {
  success: boolean;
  barcode?: string;
  name?: string;
  model?: string;
  color?: string;
  price?: number;
  available_quantity?: number;
  category?: string;
  brand?: string;
  message?: string;
};

type BankAccount = {
  id: string;
  bankName: string;
};

export function POSClient() {
  const supabase = createClient();
  const { toast } = useToast();
  const { organization, user: roleUser } = useRole();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [currentSaleId, setCurrentSaleId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const organizationId = organization?.id || null;

  // SMTP credentials loaded client-side (authenticated) to avoid RLS issues
  const [smtpCreds, setSmtpCreds] = useState<{ smtp_email: string; smtp_password: string } | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from("organizations")
      .select("smtp_email, smtp_password")
      .eq("id", organizationId)
      .single()
      .then(({ data }) => {
        if (data && (data as any).smtp_email) {
          setSmtpCreds({
            smtp_email: (data as any).smtp_email,
            smtp_password: (data as any).smtp_password,
          });
        }
      });
  }, [organizationId]);

  const [productForm, setProductForm] = useState({
    barcode: "",
    name: "",
    model: "",
    color: "",
    quantity: 1,
    price: 0,
    discount: 0,
  });

  const [paymentForm, setPaymentForm] = useState({
    method: "",
    cashReceived: 0,
    cardReceived: 0,
    bkashReceived: 0,
    nagadReceived: 0,
    rocketReceived: 0,
    upayReceived: 0,
    bankTransferReceived: 0,
    due: 0,
    cardBank: "",
    bankTransferBank: "",
    mobileBankingMethod: "",
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [heldSales, setHeldSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Sample bank accounts
  const [bankAccounts] = useState<BankAccount[]>([
    {
      id: "BANK-001",
      bankName: "BRAC Bank Limited - Star Power",
    },
    {
      id: "BANK-002",
      bankName: "BRAC Bank Limited - Star Communication",
    },
    {
      id: "BANK-003",
      bankName: "City Bank Limited - Star Power",
    },
    {
      id: "BANK-004",
      bankName: "City Bank Limited - Star Communication",
    },
    {
      id: "BANK-005",
      bankName: "Dutch-Bangla Bank Limited",
    },
  ]);

  const saleStarted = currentSaleId != null;

  // Totals with improved due logic
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const totalDiscount = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.discount,
    0
  );
  const netAmount = subtotal - totalDiscount;
  const previousDues = customer?.dues || 0;
  const total = netAmount + previousDues;

  const totalReceived =
    paymentForm.cashReceived +
    paymentForm.cardReceived +
    paymentForm.bkashReceived +
    paymentForm.nagadReceived +
    paymentForm.rocketReceived +
    paymentForm.upayReceived +
    paymentForm.bankTransferReceived;

  // Updated due calculation logic
  const totalPaid = totalReceived + paymentForm.due;
  const change = totalPaid > total ? totalPaid - total : 0;
  const remainingDue = Math.max(0, total - totalReceived);
  const newDuesForCustomer = remainingDue > 0 ? remainingDue : 0;

  // Check if payment method requires bank selection
  const requiresBankSelection = () => {
    return (
      paymentForm.method === "card" || paymentForm.method === "bank-transfer"
    );
  };

  // Check if payment method should show amount input immediately
  const showsAmountImmediately = () => {
    return ["cash", "mobile-banking"].includes(paymentForm.method);
  };

  // Handle payment method change
  const handlePaymentMethodChange = (method: string) => {
    setPaymentForm({
      ...paymentForm,
      method,
      cashReceived: 0,
      cardReceived: 0,
      bkashReceived: 0,
      nagadReceived: 0,
      rocketReceived: 0,
      upayReceived: 0,
      bankTransferReceived: 0,
      due: 0,
      cardBank: "",
      bankTransferBank: "",
      mobileBankingMethod: "",
    });
  };

  // Handle payment amount changes with auto-calculation
  const handlePaymentChange = (
    field: keyof typeof paymentForm,
    value: number | string
  ) => {
    const updatedPayment = { ...paymentForm, [field]: value };

    // For number fields, recalculate due amount
    if (typeof value === "number") {
      const newTotalReceived =
        (field === "cashReceived" ? value : updatedPayment.cashReceived) +
        (field === "cardReceived" ? value : updatedPayment.cardReceived) +
        (field === "bkashReceived" ? value : updatedPayment.bkashReceived) +
        (field === "nagadReceived" ? value : updatedPayment.nagadReceived) +
        (field === "rocketReceived" ? value : updatedPayment.rocketReceived) +
        (field === "upayReceived" ? value : updatedPayment.upayReceived) +
        (field === "bankTransferReceived"
          ? value
          : updatedPayment.bankTransferReceived);

      const autoCalculatedDue = Math.max(0, total - newTotalReceived);

      setPaymentForm({
        ...updatedPayment,
        due: field === "due" ? value : autoCalculatedDue,
      });
    } else {
      setPaymentForm(updatedPayment);
    }
  };

  // ---- Supabase helpers

  const startSaleForCustomer = async (cust: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  }) => {
    const { data, error } = await supabase.rpc("start_sale", {
      p_customer_id: cust.id,
      p_customer_name: cust.name,
      p_customer_phone: cust.phone || null,
      p_customer_email: cust.email || null,
    });
    if (error) throw new Error(error.message || "start_sale failed");

    const saleId = (data?.sale_id as number) || null;
    const inv =
      (data?.invoice_number as string) ||
      (saleId ? `INV-${String(saleId).padStart(6, "0")}` : null);
    if (!saleId) throw new Error("start_sale returned no sale_id");

    setCurrentSaleId(saleId);
    setInvoiceNumber(inv);
    return { saleId, invoiceNumber: inv };
  };

  const getProductByBarcode = async (
    barcode: string
  ): Promise<ProductResponse> => {
    try {
      // Try the RPC first (queries both inventory + color_variants on server)
      const { data, error } = await supabase.rpc("get_product_by_barcode", {
        p_barcode: barcode,
      });
      // If the RPC physically failed (e.g. syntax error or not found function)
      if (error) {
        console.error("RPC Error:", error);
      }

      const rpcResult = data as ProductResponse | null;

      // If RPC found the product successfully, return it
      if (rpcResult?.success) return rpcResult;

      // â”€â”€ Fallback 1: query inventory directly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const { data: invData, error: invError } = await supabase
        .from("inventory")
        .select(
          "barcode, product_name, model_number, color, sale_price, quantity, category, brand"
        )
        .eq("barcode", barcode)
        .maybeSingle();

      if (invError) {
        console.error("invError fallback:", invError);
      } else if (invData) {
        return {
          success: true,
          barcode: invData.barcode,
          name: invData.product_name,
          model: invData.model_number,
          color: invData.color,
          price: invData.sale_price,
          available_quantity: invData.quantity,
          category: invData.category,
          brand: invData.brand,
        };
      }

      // â”€â”€ Fallback 2: query color_variants + purchases directly â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const { data: cvData, error: cvError } = await supabase
        .from("color_variants")
        .select(
          `barcode, color, quantity,
           purchases (
             product_name, model_number, sale_price, category, brand
           )`
        )
        .eq("barcode", barcode)
        .maybeSingle();

      if (cvError) {
        console.error("cvError fallback:", cvError);
        return {
          success: false,
          message: `Lookup Error: ${cvError.message || cvError.details || 'Unknown DB error'}`
        };
      }

      if (cvData) {
        const purchase = Array.isArray(cvData.purchases)
          ? cvData.purchases[0]
          : (cvData.purchases as any);
        return {
          success: true,
          barcode: cvData.barcode,
          name: purchase?.product_name,
          model: purchase?.model_number,
          color: cvData.color,
          price: purchase?.sale_price,
          available_quantity: cvData.quantity,
          category: purchase?.category,
          brand: purchase?.brand,
        };
      }

      return { success: false, message: `Product not found (barcode: "${barcode}")` };
    } catch (error: any) {
      console.error("Error fetching product:", error);
      return {
        success: false,
        message: `Failed to fetch product: ${error.message || 'Unknown error'}`,
      };
    }
  };

  // ---- Update customer dues
  const updateCustomerDues = async (
    customerId: number,
    newDuesAmount: number
  ) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update({ dues: newDuesAmount })
        .eq("id", customerId);

      if (error) throw error;

      // Update local customer state
      if (customer && customer.id === customerId) {
        setCustomer({ ...customer, dues: newDuesAmount });
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to update customer dues";
      throw new Error(errorMsg);
    }
  };

  // ---- Printable receipt

  const openPrintableReceipt = async (
    saleId: number,
    options?: { autoPrint?: boolean; closeAfterPrint?: boolean }
  ) => {
    const autoPrint = !!options?.autoPrint;
    const closeAfterPrint = !!options?.closeAfterPrint;

    const esc = (v: any) =>
      v === null || v === undefined
        ? ""
        : String(v)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

    const money = (n: any) => {
      const num = Number(n || 0);
      return "৳" + num.toFixed(2);
    };

    try {
      const [{ data: sale }, { data: cust }, { data: items }] =
        await Promise.all([
          supabase.from("sales").select("*").eq("id", saleId).eq('organization_id', organizationId).single(),
          supabase
            .from("sale_customers")
            .select("*")
            .eq("sales_id", saleId)
            .eq('organization_id', organizationId)
            .single(),
          supabase.from("sold_products").select("*").eq("sales_id", saleId).eq('organization_id', organizationId),
        ]);

      // Pick barcode (or IMEI/EAN) from first sold item
      const firstItem = items?.[0] || {};
      const barcodeOrIMEI =
        firstItem.barcode || firstItem.imei || firstItem.ean || "";

      // Use barcode instead of invoice number
      const inv =
        barcodeOrIMEI ||
        sale?.invoice_number ||
        `CVSL-${String(saleId).padStart(6, "0")}`;

      const dateStr = new Date(
        sale?.sale_date || sale?.created_at || Date.now()
      ).toLocaleDateString();

      // build rows with IMEI / EAN on second line for item column (if present)
      const rows =
        (items || [])
          .map((it: any, idx: number) => {
            const product = esc(it.product_name || "");
            const imeiOrCode = esc(it.imei || it.barcode || it.ean || "");
            const color = esc(it.color || "");
            const qty = Number(it.quantity || 0);
            const unit = money(it.unit_price);
            const total = money(it.total_price);

            const itemCell = `
              <div style="font-weight:600;">${product}</div>
              ${imeiOrCode ? `<div style="font-size:12px;color:#333;margin-top:2px;">${imeiOrCode}</div>` : ""}
              ${color ? `<div style="font-size:12px;color:#333;margin-top:2px;">${color}</div>` : ""}
            `;

            return `
            <tr class="item-row">
              <td class="row-sl">${idx + 1}</td>
              <td class="row-desc">${itemCell}</td>
              <td class="row-qty">${qty}</td>
              <td class="row-price">${unit}</td>
              <td class="row-amt">${total}</td>
            </tr>`;
          })
          .join("") ||
        `<tr><td colspan="5" style="padding:18px;text-align:center;color:#666;">No items found</td></tr>`;

      // Company details
      const companyName = esc(organization?.name || "Star Power");

      const phoneRaw = organization?.phone ? organization.phone : "01727-678944, 01678-077128";
      const addressRaw = organization?.address || "Shop # 507/B (5th Floor), Sector-7, Road # 03, North Tower, Uttara, Dhaka-1230";

      // totals
      const subtotal = sale?.subtotal ?? sale?.sub_total ?? 0;
      const discount = sale?.total_discount ?? sale?.discount ?? 0;
      const previousDues = sale?.previous_dues ?? 0;
      const grandTotal =
        sale?.total_amount ??
        sale?.grand_total ??
        subtotal - discount + previousDues;
      const received = sale?.total_received ?? sale?.received ?? 0;
      const dues =
        sale?.due_amount ??
        sale?.remaining_due ??
        Math.max(0, grandTotal - received);

      const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(inv)} - Receipt</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { font-family: "Arial", sans-serif; margin: 0; padding: 0; color:#111; background:#fff; }
  .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; box-sizing: border-box; }
  
  /* Top Header */
  .company-name { font-weight: bold; font-size: 32px; color: #1e40af; letter-spacing: 1px; margin-bottom: 4px; }
  .company-address { font-size: 14px; color: #1e40af; margin-bottom: 2px; }
  .company-mobile { font-size: 14px; color: #1e40af; margin-bottom: 15px; }
  
  /* Thick Blue Line */
  .divider { border-top: 2px solid #1e40af; border-bottom: 1px solid #1e40af; height: 3px; margin-bottom: 20px; }

  /* Middle Section */
  .top-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
  
  .customer-box { flex: 1; border: 1px solid #1e40af; border-collapse: collapse; width: 100%; }
  .customer-box td { border: 1px solid #1e40af; padding: 6px 10px; font-size: 14px; color: #1e40af; height: 32px; }
  .customer-box td.label { width: 140px; }
  .customer-box td.value { color: #000; font-weight: bold; }

  .invoice-right { text-align: right; width: 250px; display: flex; align-items: flex-end; justify-content: flex-end;}
  .invoice-title { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 4px; text-transform: uppercase; margin-right: 12px; line-height: 1;}
  
  .invoice-box { border: 1px solid #1e40af; border-collapse: collapse; width: 160px; }
  .invoice-box td { border: 1px solid #1e40af; padding: 4px 10px; font-size: 14px; color: #1e40af; height: 28px; text-align: center; }
  .invoice-box td.label { width: 80px; text-align: left;}
  .invoice-box td.value { color: #000; font-weight: bold; font-size: 16px; }

  /* Main Table */
  table.items { width:100%; border-collapse:collapse; margin-top:10px; font-size:14px; border: 1px solid #1e40af; }
  table.items th, table.items td { border: 1px solid #1e40af; padding:8px 10px; vertical-align:top; }
  table.items th { color: #1e40af; font-weight:bold; text-align:center; height: 40px; vertical-align: middle; }
  
  .row-sl { text-align: center; width: 5%; border-right: 1px solid #1e40af;}
  .row-desc { width: 50%; border-right: 1px solid #1e40af;}
  .row-qty { text-align: center; width: 10%; border-right: 1px solid #1e40af;}
  .row-price { text-align: center; width: 15%; border-right: 1px solid #1e40af;}
  .row-amt { text-align: center; width: 20%; }

  /* Ensure rows don't have bottom borders inside the list */
  table.items tr.item-row td { height: auto; padding: 10px; border-bottom: none !important; border-top: none !important;}
  table.items tr.empty-row td { height: 100%; min-height: 250px; padding: 0; border-bottom: 1px solid #1e40af; border-top: none !important;}

  /* Totals styling */
  .totals-wrapper { display: flex; border: 1px solid #1e40af; border-top: none;}
  .totals-left { flex: 1; border-right: 1px solid #1e40af; }
  .totals-right { width: 35%; display: flex; flex-direction: column;}
  
  .total-row { display: flex; border-bottom: 1px solid #1e40af; }
  .total-row:last-child { border-bottom: none; }
  .total-label { flex: 1; padding: 8px 10px; text-align: right; color: #1e40af; font-weight: bold; font-size: 14px; border-right: 1px solid #1e40af; }
  .total-value { width: 120px; padding: 8px 10px; text-align: right; font-weight: bold; color: #000; }

  /* Footer */
  .footer { margin-top: 30px; font-size: 13px; color: #1e40af; clear: both; display: flex; justify-content: space-between; align-items: flex-end;}
  .footer-text { max-width: 60%; line-height: 1.5; font-weight: 500;}
  .signature-box { text-align: center; border-top: 1px solid #1e40af; padding-top: 5px; width: 180px; color: #1e40af; font-size: 14px;}

  @media print {
    body { margin:0; }
    .page { padding: 10px; max-width: 100%;}
    button { display:none; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="company-name">${companyName}</div>
    <div class="company-address">${esc(addressRaw)}</div>
    <div class="company-mobile">Mobile: ${esc(phoneRaw)}</div>
    
    <div class="divider"></div>

    <div class="top-section">
      <div style="flex: 1;">
        <table class="customer-box">
          <tr>
            <td class="label">Name</td>
            <td class="value">${esc(cust?.customer_name || cust?.name || "")}</td>
          </tr>
          <tr>
            <td class="label">Address/ Contract Number</td>
            <td class="value">
              ${esc(cust?.customer_address || cust?.address || cust?.contract_number || "")} 
              ${cust?.customer_phone ? esc(cust.customer_phone) : ""}
            </td>
          </tr>
        </table>
      </div>
      <div class="invoice-right">
        <div class="invoice-title">INVOICE</div>
        <table class="invoice-box">
          <tr>
            <td class="label">Invoice No</td>
            <td class="value">${esc(inv)}</td>
          </tr>
          <tr>
            <td class="label">Invoice Date</td>
            <td class="value">${esc(dateStr)}</td>
          </tr>
        </table>
      </div>
    </div>

    <table class="items" role="table">
      <thead>
        <tr>
          <th style="width:5%">SL</th>
          <th style="width:50%">Item/Model/Color</th>
          <th style="width:10%">Qty</th>
          <th style="width:15%">Price</th>
          <th style="width:20%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="empty-row" style="height: 250px;">
          <td class="row-sl"></td>
          <td class="row-desc"></td>
          <td class="row-qty"></td>
          <td class="row-price"></td>
          <td class="row-amt"></td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrapper">
      <div class="totals-left"></div>
      <div class="totals-right">
        <div class="total-row">
          <div class="total-label">Total:</div>
          <div class="total-value">${money(grandTotal)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Received:</div>
          <div class="total-value">${money(received)}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Dues</div>
          <div class="total-value">${money(dues)}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">
       বিঃদ্রঃ কোন সমস্যা হলে অবশ্যই কোম্পানির সার্ভিস সেন্টারে যেতে হবে।<br>
        বিক্রিত মাল ফেরত বা বদলানো হইবে না।<br><br>
        If you find any issue in this invoice, Contact Cell: ${esc(phoneRaw)}
      </div>
      <div class="signature-box">
        Authorised Signature
      </div>
    </div>
  </div>

  <script>
    (function(){
      try {
        const auto = ${autoPrint ? "true" : "false"};
        const closeAfter = ${closeAfterPrint ? "true" : "false"};
        if (auto) {
          setTimeout(() => {
            window.print();
            if (closeAfter) setTimeout(() => window.close(), 600);
          }, 400);
        }
      } catch(e){
        console.error(e);
      }
    })();
  </script>
</body>
</html>`;

      // Open in new tab
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch (err) {
      console.error("print receipt error:", err);
      alert("Failed to open printable receipt.");
    }
  };

  // ---- Barcode behavior

  // typing only (no fetch)
  const handleBarcodeInput = (value: string) => {
    setProductForm((f) => ({ ...f, barcode: value }));
  };

  // lookup on click / scanner confirm - NO CUSTOMER CHECK
  const lookupByBarcode = async (rawBarcode: string) => {
    const barcode = rawBarcode.trim();
    if (!barcode) return;

    setIsLoading(true);
    try {
      const res = await getProductByBarcode(barcode);
      if (res.success && res.name) {
        setProductForm((prev) => ({
          ...prev,
          barcode: res.barcode ?? barcode,
          name: res.name ?? prev.name,
          model: res.model ?? prev.model,
          color: res.color ?? prev.color,
          price: res.price ?? prev.price,
          // quantity remains prev.quantity
        }));
        toast({
          title: "Product Loaded",
          description: `${res.name}${res.color ? ` - ${res.color}` : ""}`,
        });
      } else {
        toast({
          title: "Not Found",
          description: res.message || "Barcode not found in inventory.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Lookup failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Cart / sale

  // Helper function that accepts saleId as parameter to avoid state timing issues
  const processSaleItemWithId = async (item: CartItem, saleId: number) => {
    try {
      // For items without barcodes, just insert into sold_products
      if (!item.barcode || item.barcode.trim() === "") {
        const { error: insertError } = await supabase
          .from("sold_products")
          .insert({
            organization_id: organizationId,
            sales_id: saleId,
            barcode: null,
            product_name: item.name,
            model_number: item.model || null,
            color: item.color || null,
            quantity: item.quantity,
            unit_price: item.price,
            discount_amount: item.discount,
            discount_percentage: 0,
            total_price: item.quantity * item.price - item.discount,
            cost_price: null,
          });

        if (insertError) throw insertError;

        toast({
          title: "Item Added",
          description: `${item.name} - Qty: ${item.quantity}`,
        });
        return true;
      }

      // For barcoded items, check inventory first
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select(
          "product_name, model_number, color, quantity, sale_price, cost_price"
        )
        .eq("barcode", item.barcode)
        .single();

      let productInfo = null;
      let availableQty = 0;

      if (inventoryError) {
        if (inventoryError.code === "PGRST116") {
          // Not found in inventory, try color_variants
          const { data: variantData, error: variantError } = await supabase
            .from("color_variants")
            .select(
              `
            color,
            quantity,
            purchases (
              product_name,
              model_number,
              sale_price,
              cost_price
            )
          `
            )
            .eq("barcode", item.barcode)
            .maybeSingle();

          if (variantError || !variantData) {
            console.error("Variant error:", variantError);
            throw new Error(`Product not found with barcode: ${item.barcode} ${variantError?.message ? `(${variantError.message})` : ''}`);
          }

          const purchase = Array.isArray(variantData.purchases)
            ? variantData.purchases[0]
            : (variantData.purchases as any);

          if (!purchase) {
            throw new Error(`Product not found with barcode: ${item.barcode}`);
          }

          productInfo = {
            product_name: purchase.product_name,
            model_number: purchase.model_number,
            color: variantData.color,
            sale_price: purchase.sale_price,
            cost_price: purchase.cost_price,
            source: "color_variants",
          };
          availableQty = variantData.quantity || 0;
        } else {
          throw inventoryError;
        }
      } else {
        // Found in inventory
        productInfo = {
          ...inventoryData,
          source: "inventory",
        };
        availableQty = inventoryData.quantity || 0;
      }

      // Check stock availability
      if (availableQty < item.quantity) {
        throw new Error(
          `Insufficient stock. Available: ${availableQty}, Required: ${item.quantity}`
        );
      }

      // Convert barcode to numeric for sold_products table
      let barcodeNumeric = null;
      try {
        barcodeNumeric = parseFloat(item.barcode);
        if (isNaN(barcodeNumeric)) {
          barcodeNumeric = null;
        }
      } catch (e) {
        barcodeNumeric = null;
      }

      // Insert into sold_products
      const { error: insertError } = await supabase
        .from("sold_products")
        .insert({
          organization_id: organizationId,
          sales_id: saleId,
          barcode: barcodeNumeric,
          product_name: productInfo.product_name,
          model_number: productInfo.model_number,
          color: productInfo.color,
          quantity: item.quantity,
          unit_price: productInfo.sale_price || item.price,
          discount_percentage: 0,
          discount_amount: 0,
          total_price: item.quantity * (productInfo.sale_price || item.price),
          cost_price: productInfo.cost_price,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to add item to sale: ${insertError.message}`);
      }

      // Update stock
      const newQuantity = availableQty - item.quantity;

      if (productInfo.source === "inventory") {
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("barcode", item.barcode);

        if (updateError) {
          console.error("Inventory update error:", updateError);
          // Don't throw here - the sale item was added successfully
          toast({
            title: "Warning",
            description: "Item added but inventory quantity not updated",
            variant: "default",
          });
        }
      } else {
        const { error: updateError } = await supabase
          .from("color_variants")
          .update({ quantity: newQuantity })
          .eq("barcode", item.barcode);

        if (updateError) {
          console.error("Color variants update error:", updateError);
          toast({
            title: "Warning",
            description: "Item added but stock quantity not updated",
            variant: "default",
          });
        }
      }

      toast({
        title: "Item Added",
        description: `${productInfo.product_name} - Qty: ${item.quantity}`,
      });

      return true;
    } catch (error) {
      console.error("Error processing sale item:", error);

      let errorMessage = "Failed to process sale item";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Processing Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Specifically for HOLDING a sale: saves item to sold_products 
   * WITHOUT updating inventory/stock.
   */
  const saveHeldItem = async (item: CartItem, saleId: number) => {
    try {
      // Convert barcode to numeric for sold_products table
      let barcodeNumeric = null;
      try {
        if (item.barcode) {
          barcodeNumeric = parseFloat(item.barcode);
          if (isNaN(barcodeNumeric)) barcodeNumeric = null;
        }
      } catch (e) {
        barcodeNumeric = null;
      }

      const { error: insertError } = await supabase
        .from("sold_products")
        .insert({
          organization_id: organizationId,
          sales_id: saleId,
          barcode: barcodeNumeric,
          product_name: item.name,
          model_number: item.model || null,
          color: item.color || null,
          quantity: item.quantity,
          unit_price: item.price,
          discount_percentage: 0,
          discount_amount: item.discount,
          total_price: item.quantity * item.price - item.discount,
          cost_price: item.cost_price || null,
        });

      if (insertError) throw insertError;
      return true;
    } catch (error: any) {
      console.error("saveHeldItem error:", error);
      throw error;
    }
  };

  // âœ… UPDATED: No customer check, no sale start
  const addToCart = async () => {
    if (!productForm.name || productForm.price <= 0) {
      toast({
        title: "Error",
        description: "Please enter product name and price",
        variant: "destructive",
      });
      return;
    }

    // Optional stock check (for barcoded items)
    if (productForm.barcode.trim().length > 0) {
      const productResponse = await getProductByBarcode(
        productForm.barcode.trim()
      );
      if (
        productResponse.success &&
        productResponse.available_quantity !== undefined
      ) {
        if (productResponse.available_quantity < productForm.quantity) {
          toast({
            title: "Insufficient Stock",
            description: `Only ${productResponse.available_quantity} units available in inventory`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const newItem: CartItem = {
      id: Date.now().toString(),
      name: productForm.name,
      model: productForm.model,
      color: productForm.color,
      quantity: productForm.quantity,
      price: productForm.price,
      discount: productForm.discount,
      barcode: productForm.barcode.trim(),
    };

    setCartItems((prev) => [...prev, newItem]);
    setProductForm((prev) => ({
      ...prev,
      barcode: "",
      name: "",
      model: "",
      color: "",
      price: 0,
      discount: 0,
    }));
    toast({
      title: "Product Added",
      description: `${newItem.name} added to cart`,
    });
  };

  const removeFromCart = (id: string) =>
    setCartItems((prev) => prev.filter((item) => item.id !== id));

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setPaymentForm({
      method: "",
      cashReceived: 0,
      cardReceived: 0,
      bkashReceived: 0,
      nagadReceived: 0,
      rocketReceived: 0,
      upayReceived: 0,
      bankTransferReceived: 0,
      due: 0,
      cardBank: "",
      bankTransferBank: "",
      mobileBankingMethod: "",
    });
  };

  const newSale = async () => {
    clearCart();
    setProductForm({
      barcode: "",
      name: "",
      model: "",
      color: "",
      quantity: 1,
      price: 0,
      discount: 0,
    });
    setCustomer(null);
    setCurrentSaleId(null);
    setInvoiceNumber(null);
    toast({
      title: "New Sale",
      description: "Ready for new transaction",
    });
  };

  // âœ… UPDATED: Check customer and start sale at completion
  const completeSale = async () => {
    // Require customer at completion
    if (!customer) {
      toast({
        title: "Customer Required",
        description: "Please select or save a customer before completing the sale.",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before completing sale.",
        variant: "destructive",
      });
      return;
    }

    // Use local variable to track active sale ID to avoid state timing issues
    let activeSaleId = currentSaleId;
    let activeInvoiceNumber = invoiceNumber;

    // Start sale if not already started
    if (!saleStarted) {
      try {
        const { saleId, invoiceNumber: inv } = await startSaleForCustomer(
          customer as Required<Customer>
        );
        activeSaleId = saleId; // Use this directly, don't wait for state
        activeInvoiceNumber = inv;
        console.log(`Sale started: ID ${saleId}, Invoice ${inv}`);
      } catch (e: any) {
        toast({
          title: "Couldn't start sale",
          description: e?.message ?? "start_sale failed",
          variant: "destructive",
        });
        return;
      }
    }

    // Verify we have a sale ID before proceeding
    if (!activeSaleId) {
      toast({
        title: "Error",
        description: "Failed to initialize sale. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validation: ensure payment is sufficient or due is acknowledged
    if (totalReceived < total && remainingDue === 0) {
      toast({
        title: "Insufficient Payment",
        description: `Payment received (৳${totalReceived.toFixed(
          2
        )}) is less than total (৳${total.toFixed(
          2
        )}). Please add remaining amount to due or increase payment.`,
        variant: "destructive",
      });
      return;
    }

    // Validation for card/bank transfer methods
    if (
      (paymentForm.method === "card" ||
        paymentForm.method === "bank-transfer") &&
      !paymentForm.cardBank &&
      !paymentForm.bankTransferBank
    ) {
      toast({
        title: "Bank Selection Required",
        description: "Please select a bank for card or bank transfer payment.",
        variant: "destructive",
      });
      return;
    }

    // Validation for mobile banking method
    if (
      paymentForm.method === "mobile-banking" &&
      !paymentForm.mobileBankingMethod
    ) {
      toast({
        title: "Mobile Banking Method Required",
        description: "Please select a mobile banking method.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Process each cart item using activeSaleId
      let allProcessed = true;
      for (const item of cartItems) {
        if (item.barcode) {
          const ok = await processSaleItemWithId(item, activeSaleId);
          if (!ok) {
            allProcessed = false;
            break;
          }
        } else {
          const { error } = await supabase.from("sold_products").insert({
            sales_id: activeSaleId,
            barcode: item.barcode || null,
            product_name: item.name,
            color: item.color,
            quantity: item.quantity,
            unit_price: item.price,
            discount_percentage: item.discount,
            discount_amount: (item.quantity * item.price * item.discount) / 100,
            total_price:
              item.quantity * item.price -
              (item.quantity * item.price * item.discount) / 100,
          });
          if (error) {
            console.error("Error adding sold product:", error);
            allProcessed = false;
            break;
          }
        }
      }
      if (!allProcessed) {
        toast({
          title: "Error",
          description: "Some items could not be processed",
          variant: "destructive",
        });
        return;
      }

      // Determine the final payment method for the database
      let finalPaymentMethod = paymentForm.method;
      if (paymentForm.method === "mobile-banking") {
        finalPaymentMethod = paymentForm.mobileBankingMethod;
      }

      // Update sale totals and status with improved due handling
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          subtotal,
          total_discount: totalDiscount,
          previous_dues: previousDues,
          net_amount: netAmount,
          total_amount: total,
          cash_received: paymentForm.cashReceived,
          card_received: paymentForm.cardReceived,
          bkash_received: paymentForm.bkashReceived,
          nagad_received: paymentForm.nagadReceived,
          rocket_received: paymentForm.rocketReceived,
          upay_received: paymentForm.upayReceived,
          bank_transfer_received: paymentForm.bankTransferReceived,
          total_received: totalReceived,
          due_amount: remainingDue,
          change_amount: change,
          payment_method: finalPaymentMethod,
          card_bank: paymentForm.cardBank,
          bank_transfer_bank: paymentForm.bankTransferBank,
          status: "completed",
        })
        .eq("id", activeSaleId);
      if (saleError) throw saleError;

      // Update customer dues if there's remaining due or previous dues were cleared
      if (customer?.id) {
        await updateCustomerDues(customer.id, newDuesForCustomer);
      }

      // Ensure invoice number is present
      let inv = activeInvoiceNumber;
      if (!inv && activeSaleId) {
        const { data: sRow } = await supabase
          .from("sales")
          .select("invoice_number")
          .eq("id", activeSaleId)
          .single();
        inv =
          sRow?.invoice_number ||
          `INV-${String(activeSaleId).padStart(6, "0")}`;
        setInvoiceNumber(inv);
      }

      const completionMessage =
        remainingDue > 0
          ? `Sale completed with ৳${remainingDue.toFixed(2)} due remaining`
          : "Sale completed successfully";

      toast({
        title: "Sale Completed",
        description: `Invoice: ${inv} • ${completionMessage}`,
      });

      // Auto-send invoice to customer email
      if (activeSaleId) {
        // ALWAYS auto-print the invoice immediately
        openPrintableReceipt(activeSaleId, { autoPrint: true });

        if (customer?.email) {
          // fire-and-forget â€” don't block the UI
          fetch("/api/send-invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              saleId: activeSaleId,
              organizationId,
              customerEmail: customer.email,
              customerName: customer.name,
              customerPhone: customer.phone,
              smtpEmail: smtpCreds?.smtp_email,
              smtpPassword: smtpCreds?.smtp_password,
              orgName: organization?.name,
              orgAddress: organization?.address,
              orgPhone: organization?.phone,
              invoiceNumber: inv,
              items: cartItems.map((item) => ({
                name: item.name,
                color: item.color,
                barcode: item.barcode,
                quantity: item.quantity,
                unitPrice: item.price,
                discount: item.discount,
                totalPrice: item.quantity * item.price - item.quantity * item.discount,
              })),
              subtotal,
              totalDiscount,
              grandTotal: total,
              totalReceived,
              remainingDue,
            }),
          })
            .then((res) => res.json())
            .then((result) => {
              if (result.success) {
                toast({
                  title: "Invoice Sent",
                  description: `Invoice emailed to ${customer.email}`,
                });
              } else {
                toast({
                  title: "Email Failed",
                  description: result.error || "Could not send invoice email.",
                  variant: "destructive",
                });
              }
            })
            .catch(() => {
              toast({
                title: "Email Failed",
                description: "Network error while sending invoice email.",
                variant: "destructive",
              });
            });
        } else {
          toast({
            title: "No Email on File",
            description: "Invoice not emailed â€” customer has no email address.",
            variant: "default",
          });
        }
      }

      // Reset for next transaction
      await newSale();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to complete sale";

      // More specific error handling
      if (
        errorMessage.includes("column") &&
        errorMessage.includes("does not exist")
      ) {
        toast({
          title: "Database Schema Error",
          description:
            "Some database columns are missing. Please check your sales table schema.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("permission")) {
        toast({
          title: "Permission Error",
          description:
            "Insufficient permissions to complete sale. Contact administrator.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sale Error",
          description: `Sale may have partially completed. Error: ${errorMessage}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const holdSale = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to cart before holding sale.",
        variant: "destructive",
      });
      return;
    }

    // Require customer for held sales too
    if (!customer) {
      toast({
        title: "Customer Required",
        description: "Please select or save a customer before holding the sale.",
        variant: "destructive",
      });
      return;
    }

    // Start sale if not started
    let activeSaleId = currentSaleId;
    if (!saleStarted) {
      try {
        const { saleId } = await startSaleForCustomer(customer as Required<Customer>);
        activeSaleId = saleId;
      } catch (e: any) {
        toast({
          title: "Couldn't start sale",
          description: e?.message ?? "start_sale failed",
          variant: "destructive",
        });
        return;
      }
    }

    if (!activeSaleId) return;

    setIsLoading(true);
    try {
      // 1. Delete existing sold products for this sale to avoid duplicates
      await supabase.from("sold_products").delete().eq("sales_id", activeSaleId);

      // 2. Persist all current cart items (WITHOUT inventory update)
      for (const item of cartItems) {
        await saveHeldItem(item, activeSaleId);
      }

      // 3. Update sale status to 'held'
      const { error } = await supabase
        .from("sales")
        .update({
          subtotal,
          total_discount: totalDiscount,
          previous_dues: previousDues,
          net_amount: netAmount,
          total_amount: total,
          status: "held",
        })
        .eq("id", activeSaleId);

      if (error) throw error;

      toast({ title: "Sale Held", description: "Sale items saved. You can resume this sale later." });
      await newSale();
    } catch (error: any) {
      console.error("Error holding sale:", error);
      toast({
        title: "Error",
        description: "Failed to hold sale: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeldSales = async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_customers (*)
        `)
        .eq("organization_id", organizationId)
        .eq("status", "held")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHeldSales(data || []);
      setShowHeldSales(true);
    } catch (error: any) {
      console.error("Error fetching held sales:", error);
      toast({ title: "Error", description: "Failed to fetch held sales", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resumes a previously held sale by loading its items and customer data.
   */
  const resumeSale = async (sale: any) => {
    try {
      setIsLoading(true);

      // 1. Fetch products for this sale
      const { data: soldProducts, error: productsError } = await supabase
        .from("sold_products")
        .select("*")
        .eq("sales_id", sale.id);

      if (productsError) throw productsError;

      // 2. Fetch customer info from sale_customers
      const { data: saleCustomer, error: customerError } = await supabase
        .from("sale_customers")
        .select("*")
        .eq("sales_id", sale.id)
        .maybeSingle();

      if (customerError) console.error("Error fetching sale customer:", customerError);

      // 3. Update state
      if (saleCustomer) {
        setCustomer({
          id: saleCustomer.customer_id,
          name: saleCustomer.customer_name || "",
          phone: saleCustomer.customer_phone || "",
          email: saleCustomer.customer_email || "",
          dues: 0,
        });
      }

      const items: CartItem[] = (soldProducts || []).map(p => ({
        id: p.barcode ? String(p.barcode) : `temp-${Math.random()}`,
        name: p.product_name,
        model: p.model_number || "",
        color: p.color || "",
        quantity: p.quantity,
        price: p.unit_price,
        discount: p.discount_amount || 0,
        barcode: p.barcode ? String(p.barcode) : "",
        cost_price: p.cost_price,
      }));

      setCartItems(items);
      setCurrentSaleId(sale.id);
      setInvoiceNumber(sale.invoice_number);

      toast({ title: "Sale Resumed", description: `Loaded Invoice ${sale.invoice_number}` });
    } catch (error: any) {
      console.error("Error resuming sale:", error);
      toast({ title: "Error", description: "Failed to resume sale", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const printReceipt = async () => {
    let saleIdToPrint = currentSaleId;

    if (!saleIdToPrint) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("sales")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            toast({
              title: "No sales found",
              description: "There are no completed sales in this shop yet.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          return;
        }

        if (data) {
          saleIdToPrint = data.id;
        }
      } catch (err: any) {
        console.error("Error fetching last sale:", err);
        toast({
          title: "Error",
          description: "Failed to fetch the last receipt.",
          variant: "destructive",
        });
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (saleIdToPrint) {
      await openPrintableReceipt(saleIdToPrint);
    }
  };

  // ---- Customer selection / save

  const handleCustomerSelect = (selectedCustomer: Customer) => {
    if (!selectedCustomer.id) {
      toast({
        title: "Missing customer ID",
        description: "Selected customer must have an ID.",
        variant: "destructive",
      });
      return;
    }
    setCustomer(selectedCustomer);
    setShowCustomerSearch(false);
  };

  const saveCustomer = async () => {
    const customerName = (
      document.getElementById("customer-name") as HTMLInputElement
    )?.value;
    const customerPhone = (
      document.getElementById("customer-phone") as HTMLInputElement
    )?.value;
    const customerEmail = (
      document.getElementById("customer-email") as HTMLInputElement
    )?.value;

    if (!customerName) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc("upsert_customer", {
        p_name: customerName,
        p_phone: customerPhone || null,
        p_email: customerEmail || null,
        p_organization_id: organizationId,
      });
      if (error) throw new Error(error.message || "upsert_customer failed");
      if (!data?.success || !data?.customer?.id)
        throw new Error("upsert_customer returned no customer id");

      const saved: Customer = {
        id: data.customer.id,
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email,
        dues: data.customer.dues ?? 0,
      };
      setCustomer(saved);
      toast({ title: "Customer Saved", description: `Saved ${saved.name}.` });
    } catch (e: any) {
      console.error("Error saving customer:", e);
      toast({
        title: "Error saving customer",
        description: e?.message ?? "Failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={newSale}
            className="bg-green-50 hover:bg-green-100"
            disabled={isLoading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Sale
          </Button>
          <Button variant="outline" onClick={printReceipt}>
            <Receipt className="mr-2 h-4 w-4" />
            Last Receipt
          </Button>
          <Button variant="outline" onClick={() => setShowCalculator(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Calculator
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {customer.email}
                    </p>
                    {customer.dues > 0 && (
                      <p className="text-sm text-red-600">
                        Previous Dues: ৳{customer.dues.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Customer selected
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomer(null);
                      setCurrentSaleId(null);
                      setInvoiceNumber(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input id="customer-name" placeholder="Enter customer name" />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone Number</Label>
                  <Input id="customer-phone" placeholder="Enter phone number" />
                </div>
                <div>
                  <Label htmlFor="customer-email">Email Address</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={saveCustomer}
                  >
                    Save Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomerSearch(true)}
                  >
                    Search
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Entry */}
        <Card>
          <CardHeader>
            <CardTitle>Product Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  placeholder="Scan or enter barcode"
                  value={productForm.barcode}
                  onChange={(e) => handleBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && productForm.barcode.trim()) {
                      lookupByBarcode(productForm.barcode);
                    }
                  }}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => lookupByBarcode(productForm.barcode)}
                  disabled={isLoading || !productForm.barcode.trim()}
                >
                  Load
                </Button>
                <Button
                  size="icon"
                  onClick={() => setShowScanner(true)}
                  disabled={isLoading}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  ðŸ” Looking up product...
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Auto-filled from barcode or enter manually"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                className={
                  productForm.barcode && productForm.name ? "bg-green-50" : ""
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="Auto-filled from barcode"
                  value={productForm.color}
                  onChange={(e) =>
                    setProductForm({ ...productForm, color: e.target.value })
                  }
                  className={
                    productForm.barcode && productForm.color
                      ? "bg-green-50"
                      : ""
                  }
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-transparent"
                    onClick={() =>
                      setProductForm({
                        ...productForm,
                        quantity: Math.max(1, productForm.quantity - 1),
                      })
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    className="text-center mx-1"
                    value={productForm.quantity}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        quantity: Math.max(
                          1,
                          Number.parseInt(e.target.value) || 1
                        ),
                      })
                    }
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-transparent"
                    onClick={() =>
                      setProductForm({
                        ...productForm,
                        quantity: productForm.quantity + 1,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="sale-price">Sale Price</Label>
                <Input
                  id="sale-price"
                  type="number"
                  placeholder="Auto-filled from barcode"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      price: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                  className={
                    productForm.barcode && productForm.price > 0
                      ? "bg-green-50"
                      : ""
                  }
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount (TK)</Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="0"
                  value={productForm.discount}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      discount: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {productForm.barcode && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  ✓ Product loaded from inventory
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Barcode: {productForm.barcode}
                  {productForm.model ? ` • Model: ${productForm.model}` : ""}
                </p>
              </div>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={addToCart}
              disabled={isLoading}
            >
              Add to Cart
            </Button>
          </CardContent>
        </Card>

        {/* Cart & Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cart & Payment</CardTitle>
              {cartItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCart}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart Items */}
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-sm border-b pb-2"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.name} - {item.color}
                        </p>
                        <p className="text-muted-foreground">
                          ৳{item.price.toFixed(2)} × {item.quantity}
                          {item.discount > 0 && ` (-৳${item.discount})`}
                        </p>
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground">
                            Barcode: {item.barcode}
                          </p>
                        )}
                        {item.model && (
                          <p className="text-xs text-muted-foreground">
                            Model: {item.model}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No items in cart
                  </p>
                )}
              </div>
            </div>

            {/* Totals with improved due display */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>৳{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-৳{totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Amount:</span>
                <span>৳{netAmount.toFixed(2)}</span>
              </div>
              {previousDues > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Previous Dues:</span>
                  <span>৳{previousDues.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>৳{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={handlePaymentMethodChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="mobile-banking">Mobile Banking</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="split">Split Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Banking Method Selection */}
            {paymentForm.method === "mobile-banking" && (
              <div>
                <Label htmlFor="mobile-banking-method">
                  Mobile Banking Method
                </Label>
                <Select
                  value={paymentForm.mobileBankingMethod}
                  onValueChange={(value) =>
                    handlePaymentChange("mobileBankingMethod", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mobile banking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="upay">Upay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bank Selection for Card and Bank Transfer */}
            {requiresBankSelection() && (
              <div>
                <Label htmlFor="bank-select">
                  {paymentForm.method === "card"
                    ? "Select Card Bank"
                    : "Select Bank for Transfer"}
                </Label>
                <Select
                  value={
                    paymentForm.method === "card"
                      ? paymentForm.cardBank
                      : paymentForm.bankTransferBank
                  }
                  onValueChange={(value) => {
                    if (paymentForm.method === "card") {
                      handlePaymentChange("cardBank", value);
                    } else {
                      handlePaymentChange("bankTransferBank", value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.bankName}>
                        {bank.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Amounts */}
            {paymentForm.method === "split" ? (
              // Split Payment - Show all payment methods
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cash-received">Cash</Label>
                    <Input
                      id="cash-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.cashReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "cashReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-received">Card</Label>
                    <div className="space-y-2">
                      <Select
                        value={paymentForm.cardBank}
                        onValueChange={(value) =>
                          handlePaymentChange("cardBank", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((bank) => (
                            <SelectItem key={bank.id} value={bank.bankName}>
                              {bank.bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="card-received"
                        type="number"
                        placeholder="0.00"
                        value={paymentForm.cardReceived}
                        onChange={(e) =>
                          handlePaymentChange(
                            "cardReceived",
                            Number.parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!paymentForm.cardBank}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="bkash-received">bKash</Label>
                    <Input
                      id="bkash-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.bkashReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "bkashReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="nagad-received">Nagad</Label>
                    <Input
                      id="nagad-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.nagadReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "nagadReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="rocket-received">Rocket</Label>
                    <Input
                      id="rocket-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.rocketReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "rocketReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="upay-received">Upay</Label>
                    <Input
                      id="upay-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.upayReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "upayReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bank-transfer-received">Bank Transfer</Label>
                  <div className="space-y-2">
                    <Select
                      value={paymentForm.bankTransferBank}
                      onValueChange={(value) =>
                        handlePaymentChange("bankTransferBank", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.bankName}>
                            {bank.bankName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="bank-transfer-received"
                      type="number"
                      placeholder="0.00"
                      value={paymentForm.bankTransferReceived}
                      onChange={(e) =>
                        handlePaymentChange(
                          "bankTransferReceived",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                      disabled={!paymentForm.bankTransferBank}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Single Payment Method
              <>
                {showsAmountImmediately() && (
                  <div>
                    <Label htmlFor="payment-amount">
                      {paymentForm.method === "cash"
                        ? "Cash Amount"
                        : `Mobile Banking (${paymentForm.mobileBankingMethod}) Amount`}
                    </Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="0.00"
                      value={
                        paymentForm.method === "cash"
                          ? paymentForm.cashReceived
                          : paymentForm.bkashReceived +
                          paymentForm.nagadReceived +
                          paymentForm.rocketReceived +
                          paymentForm.upayReceived
                      }
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0;
                        if (paymentForm.method === "cash") {
                          handlePaymentChange("cashReceived", value);
                        } else if (paymentForm.method === "mobile-banking") {
                          // Distribute the amount to the selected mobile banking method
                          const method = paymentForm.mobileBankingMethod;
                          if (method === "bkash")
                            handlePaymentChange("bkashReceived", value);
                          else if (method === "nagad")
                            handlePaymentChange("nagadReceived", value);
                          else if (method === "rocket")
                            handlePaymentChange("rocketReceived", value);
                          else if (method === "upay")
                            handlePaymentChange("upayReceived", value);
                        }
                      }}
                      disabled={
                        paymentForm.method === "mobile-banking" &&
                        !paymentForm.mobileBankingMethod
                      }
                    />
                  </div>
                )}

                {requiresBankSelection() &&
                  (paymentForm.cardBank || paymentForm.bankTransferBank) && (
                    <div>
                      <Label htmlFor="payment-amount">
                        {paymentForm.method === "card"
                          ? "Card"
                          : "Bank Transfer"}{" "}
                        Amount
                      </Label>
                      <Input
                        id="payment-amount"
                        type="number"
                        placeholder="0.00"
                        value={
                          paymentForm.method === "card"
                            ? paymentForm.cardReceived
                            : paymentForm.bankTransferReceived
                        }
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value) || 0;
                          if (paymentForm.method === "card") {
                            handlePaymentChange("cardReceived", value);
                          } else {
                            handlePaymentChange("bankTransferReceived", value);
                          }
                        }}
                      />
                    </div>
                  )}
              </>
            )}

            {/* Due Amount */}
            <div>
              <Label htmlFor="due">Due Amount</Label>
              <Input
                id="due"
                type="number"
                placeholder="0.00"
                value={paymentForm.due}
                onChange={(e) =>
                  handlePaymentChange(
                    "due",
                    Number.parseFloat(e.target.value) || 0
                  )
                }
                className={
                  remainingDue > 0 ? "bg-yellow-50 border-yellow-300" : ""
                }
              />
              {remainingDue > 0 && (
                <p className="text-xs text-yellow-700 mt-1">
                  Suggested due: ৳{remainingDue.toFixed(2)}
                </p>
              )}
            </div>

            {/* Payment Summary */}
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Received:</span>
                <span>৳{totalReceived.toFixed(2)}</span>
              </div>
              {remainingDue > 0 ? (
                <div className="flex justify-between font-bold text-orange-600">
                  <span>Remaining Due:</span>
                  <span>৳{remainingDue.toFixed(2)}</span>
                </div>
              ) : change > 0 ? (
                <div className="flex justify-between font-bold text-green-600">
                  <span>Change to Return:</span>
                  <span>৳{change.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between font-bold text-green-600">
                  <span>Fully Paid</span>
                  <span>✓</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                onClick={completeSale}
                disabled={cartItems.length === 0 || isLoading}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {isLoading
                  ? "Processing..."
                  : !customer
                    ? "Select Customer to Complete"
                    : "Complete Sale"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={holdSale}
                  disabled={cartItems.length === 0 || isLoading}
                >
                  Hold Sale
                </Button>
                <Button variant="outline" onClick={printReceipt}>
                  Print Receipt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-16 bg-transparent"
              onClick={newSale}
              disabled={isLoading}
            >
              <div className="text-center">
                <RotateCcw className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">New Sale</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-16 bg-transparent"
              onClick={() => setShowCalculator(true)}
            >
              <div className="text-center">
                <Calculator className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Calculator</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-16 bg-transparent"
              onClick={() => setShowCustomerSearch(true)}
            >
              <div className="text-center">
                <User className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Customer List</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-16 bg-transparent"
              onClick={() => setShowScanner(true)}
            >
              <div className="text-center">
                <QrCode className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Scan Product</span>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-16 bg-transparent border-orange-200 hover:bg-orange-50 col-span-2 md:col-span-1"
              onClick={fetchHeldSales}
              disabled={isLoading}
            >
              <div className="text-center text-orange-700">
                <RotateCcw className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Held Sales</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <POSCalculator open={showCalculator} onOpenChange={setShowCalculator} />
      <CustomerSearch
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        onSelectCustomer={(customer: any) => handleCustomerSelect(customer)}
      />
      <ProductScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanResult={(result) => lookupByBarcode(result)}
      />

      <Dialog open={showHeldSales} onOpenChange={setShowHeldSales}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Held Sales</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[400px] overflow-y-auto">
            {heldSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No held sales found.</p>
            ) : (
              <div className="space-y-2">
                {heldSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      resumeSale(sale);
                      setShowHeldSales(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">#{sale.invoice_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.sale_customers?.[0]?.customer_name || "Walk-in Customer"} •
                        {new Date(sale.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">৳{sale.total_amount?.toFixed(2)}</div>
                      <Button variant="ghost" size="sm" className="h-7 text-blue-600 font-medium">
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
