<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            margin: 0; padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F4F4F5; color: #111111;
            -webkit-font-smoothing: antialiased;
        }
        .outer { width: 100%; padding: 32px 16px; background-color: #F4F4F5; }
        .container { max-width: 560px; margin: 0 auto; }
        .brand-header { text-align: center; padding-bottom: 20px; }
        .brand-header .logo {
            display: inline-flex; align-items: center; gap: 8px;
            font-size: 20px; font-weight: 700; color: #111111; text-decoration: none;
        }
        .brand-header .logo-icon {
            width: 32px; height: 32px;
            background-color: #DCEB63;
            border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
        }
        .card {
            background-color: #FFFFFF; border-radius: 16px; padding: 36px 32px;
            box-shadow: 0 8px 24px rgba(32, 32, 24, 0.06);
        }
        .badge {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
            background-color: #DCEB63; color: #111111; margin-bottom: 16px;
        }
        h1 { font-size: 20px; font-weight: 700; color: #111111; margin: 0 0 8px; }
        .body-text { font-size: 15px; line-height: 1.6; color: #525252; margin-bottom: 8px; }
        .invoice-details {
            background-color: #FAFAFA; border: 1px solid #E7E6E0;
            border-radius: 12px; padding: 16px 20px; margin: 20px 0;
        }
        .invoice-details table { width: 100%; font-size: 13px; }
        .invoice-details td { padding: 4px 0; }
        .invoice-details td:last-child { text-align: right; font-weight: 600; color: #8B5CF6; }
        .invoice-details .label { color: #A1A1AA; font-weight: 400; }
        .divider { height: 1px; background-color: #E7E6E0; margin: 20px 0; }
        .footer {
            margin-top: 24px; padding-top: 16px; text-align: center; font-size: 12px;
            color: #A1A1AA; border-top: 1px solid #E7E6E0;
        }
    </style>
</head>
<body>
    <div class="outer">
        <div class="container">
            <div class="brand-header">
                <span class="logo">
                    <span class="logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                        </svg>
                    </span>
                    Agency Hub
                </span>
            </div>
            <div class="card">
                <span class="badge">Invoice</span>
                <h1>Invoice {{ $invoice->invoice_number }}</h1>
                <p class="body-text">A new invoice has been issued. Please find the PDF attached.</p>
                <div class="invoice-details">
                    <table>
                        <tr><td class="label">Status</td><td>{{ strtoupper($invoice->status) }}</td></tr>
                        <tr><td class="label">Issue Date</td><td>{{ $invoice->issue_date?->toDateString() ?? '-' }}</td></tr>
                        <tr><td class="label">Due Date</td><td>{{ $invoice->due_date?->toDateString() ?? '-' }}</td></tr>
                        <tr><td class="label">Total</td><td>{{ number_format((float) $invoice->total_amount, 2) }} {{ $invoice->currency }}</td></tr>
                        <tr><td class="label">Buyer</td><td>{{ $invoice->buyer_name }}</td></tr>
                    </table>
                </div>
                <div class="divider"></div>
                <div style="text-align: center;">
                    <p style="font-size: 13px; color: #525252; margin-bottom: 8px;">The PDF invoice is attached to this email.</p>
                </div>
                <div class="footer">
                    <p>This is an automated invoice from <strong>{{ config('app.name') }}</strong>.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
