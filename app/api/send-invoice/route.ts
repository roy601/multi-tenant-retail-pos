import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const {
      customerEmail,
      customerName,
      customerPhone,
      smtpEmail,
      smtpPassword,
      orgName,
      orgAddress,
      orgPhone,
      invoiceNumber,
      items,
      subtotal,
      totalDiscount,
      grandTotal,
      totalReceived,
      remainingDue,
    } = await req.json();

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "No customer email provided." },
        { status: 400 }
      );
    }

    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email not configured. Please add Gmail credentials in Settings → Email Settings.",
        },
        { status: 400 }
      );
    }

    const money = (n: any) => "&#2547;" + Number(n || 0).toFixed(2);
    const esc = (v: any) =>
      v == null
        ? ""
        : String(v)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const itemRows = (items || [])
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;vertical-align:top;">${idx + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
            <div style="font-weight:600;color:#1e293b;font-size:14px;">${esc(it.name)}</div>
            ${it.color ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(it.color)}</div>` : ""}
            ${it.barcode ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${esc(it.barcode)}</div>` : ""}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#1e293b;font-size:14px;vertical-align:top;">${it.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-size:14px;vertical-align:top;">${money(it.unitPrice)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-weight:600;font-size:14px;vertical-align:top;">${money(it.totalPrice)}</td>
        </tr>`
      )
      .join("");

    const htmlEmail = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${esc(orgName)}</div>
              ${orgAddress ? `<div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;">${esc(orgAddress)}</div>` : ""}
              ${orgPhone ? `<div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:2px;">Mobile: ${esc(orgPhone)}</div>` : ""}

              <!-- Invoice + Date row using table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="width:50%;">
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Invoice</div>
                    <div style="font-size:18px;font-weight:700;color:#ffffff;margin-top:4px;">${esc(invoiceNumber || "")}</div>
                  </td>
                  <td style="width:50%;text-align:right;">
                    <div style="font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:1px;">Date</div>
                    <div style="font-size:14px;font-weight:600;color:#ffffff;margin-top:4px;">${dateStr}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BILL TO -->
          <tr>
            <td style="padding:24px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Bill To</div>
              <div style="font-size:16px;font-weight:700;color:#1e293b;">${esc(customerName || "Customer")}</div>
              ${customerPhone ? `<div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(customerPhone)}</div>` : ""}
              <div style="font-size:13px;color:#64748b;margin-top:2px;">${esc(customerEmail)}</div>
            </td>
          </tr>

          <!-- ITEMS TABLE -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:5%;border-bottom:2px solid #e2e8f0;">#</th>
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;">Product</th>
                    <th style="padding:10px 12px;text-align:center;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:8%;border-bottom:2px solid #e2e8f0;">Qty</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:15%;border-bottom:2px solid #e2e8f0;">Unit</th>
                    <th style="padding:10px 12px;text-align:right;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:15%;border-bottom:2px solid #e2e8f0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No items</td></tr>`}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- TOTALS -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:4px 0;">
                      <tr>
                        <td style="padding:8px 16px;font-size:13px;color:#64748b;">Subtotal</td>
                        <td style="padding:8px 16px;font-size:13px;color:#64748b;text-align:right;">${money(subtotal)}</td>
                      </tr>
                      ${Number(totalDiscount) > 0 ? `<tr>
                        <td style="padding:8px 16px;font-size:13px;color:#64748b;">Discount</td>
                        <td style="padding:8px 16px;font-size:13px;color:#64748b;text-align:right;">-${money(totalDiscount)}</td>
                      </tr>` : ""}
                      <tr style="border-top:2px solid #e2e8f0;">
                        <td style="padding:10px 16px;font-size:15px;font-weight:800;color:#1e293b;">Total</td>
                        <td style="padding:10px 16px;font-size:15px;font-weight:800;color:#1e293b;text-align:right;">${money(grandTotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 16px;font-size:13px;color:#16a34a;">Received</td>
                        <td style="padding:8px 16px;font-size:13px;color:#16a34a;text-align:right;">${money(totalReceived)}</td>
                      </tr>
                      ${Number(remainingDue) > 0 ? `<tr>
                        <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#dc2626;">Due</td>
                        <td style="padding:8px 16px;font-size:13px;font-weight:600;color:#dc2626;text-align:right;">${money(remainingDue)}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px;background:#1e293b;text-align:center;">
              <div style="color:#94a3b8;font-size:13px;">Thank you for your purchase!</div>
              <div style="color:#64748b;font-size:11px;margin-top:6px;">If you have any questions, please contact us.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${orgName}" <${smtpEmail}>`,
      to: customerEmail,
      subject: `Invoice ${invoiceNumber || ""} from ${orgName}`,
      html: htmlEmail,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("send-invoice error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
