<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        @page { margin: 18mm 14mm 22mm; }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 9.5px;
            color: #111;
            line-height: 1.5;
        }

        /* ===== Header ===== */
        .header-table { width: 100%; margin-bottom: 16px; border-bottom: 3px solid #DCEB63; padding-bottom: 12px; }
        .header-table td { vertical-align: top; }
        .brand-icon {
            display: inline-block; width: 28px; height: 28px;
            background-color: #DCEB63; border-radius: 7px;
            vertical-align: middle; margin-right: 6px;
        }
        .brand-name { font-size: 17px; font-weight: 700; vertical-align: middle; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 20px; font-weight: 700; margin: 0; color: #111; }
        .doc-title .status {
            display: inline-block; padding: 2px 10px; border-radius: 10px;
            font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;
        }
        .status-draft { background-color: #F4F4F5; color: #525252; }
        .status-sent { background-color: #DCEB63; color: #111; }
        .status-paid { background-color: #22C55E; color: #fff; }

        /* ===== Details ===== */
        .details-table { width: 100%; margin-bottom: 16px; }
        .details-table td { width: 25%; vertical-align: top; }
        .details-table .label {
            font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px;
            color: #A1A1AA; display: block; margin-bottom: 2px;
        }
        .details-table .value { font-size: 9.5px; color: #111; }

        /* ===== Addresses ===== */
        .addresses-table { width: 100%; margin-bottom: 16px; }
        .addresses-table td { width: 50%; vertical-align: top; }
        .addresses-table .box {
            border: 1px solid #E7E6E0; border-radius: 8px;
            padding: 10px 12px; background-color: #FAFAFA;
        }
        .addresses-table .box.first { margin-right: 8px; }
        .addresses-table .box.last { margin-left: 8px; }
        .addresses-table .box .title {
            font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px;
            color: #A1A1AA; display: block; margin-bottom: 3px;
        }
        .addresses-table .box .addr { font-size: 8.5px; color: #111; line-height: 1.5; }

        /* ===== Items Table ===== */
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.items thead th {
            background-color: #DCEB63; color: #111;
            padding: 7px 8px; text-align: left; font-weight: 700;
            font-size: 8px; text-transform: uppercase;
        }
        table.items thead th:last-child { text-align: right; }
        table.items tbody td {
            padding: 6px 8px; border-bottom: 1px solid #E7E6E0;
            font-size: 8.5px; color: #111;
        }
        table.items tbody td:last-child { text-align: right; }

        /* ===== Totals ===== */
        table.totals { width: 240px; margin-left: auto; border-collapse: collapse; }
        table.totals td { padding: 5px 8px; font-size: 8.5px; color: #111; }
        table.totals td:last-child { text-align: right; font-weight: 600; }
        table.totals .total-row td {
            border-top: 2px solid #111; font-weight: 700; font-size: 10px; padding-top: 6px;
        }
        table.totals .total-row td:last-child { color: #8B5CF6; font-size: 12px; }
        table.totals .sub-label { color: #A1A1AA; }

        /* ===== Notes ===== */
        .notes-box {
            margin-top: 20px; padding: 12px; border: 1px solid #E7E6E0;
            border-radius: 8px; background-color: #FAFAFA;
        }
        .notes-box .title {
            font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px;
            color: #A1A1AA; display: block; margin-bottom: 3px;
        }
        .notes-box p { font-size: 8.5px; color: #525252; margin: 0; }

        /* ===== Footer ===== */
        .footer {
            position: fixed; bottom: -18mm; left: 0; right: 0;
            text-align: center; font-size: 7px; color: #A1A1AA;
            padding-top: 5px; border-top: 1px solid #E7E6E0;
        }
        .footer .page:after { content: "Page " counter(page); }
    </style>
</head>
<body>
    <!-- ===== HEADER ===== -->
    <table class="header-table">
        <tr>
            <td style="width:50%;">
                <span class="brand-icon"></span>
                <span class="brand-name">Agency Hub</span>
            </td>
            <td class="doc-title" style="width:50%;">
                <h1>INVOICE</h1>
                <span class="status status-{{ $invoice->status }}">{{ $invoice->status }}</span>
            </td>
        </tr>
    </table>

    <!-- ===== DETAILS ===== -->
    <table class="details-table">
        <tr>
            <td><span class="label">Invoice #</span><span class="value">{{ $invoice->invoice_number }}</span></td>
            <td><span class="label">Issue Date</span><span class="value">{{ $invoice->issue_date?->toDateString() ?? '-' }}</span></td>
            <td><span class="label">Due Date</span><span class="value">{{ $invoice->due_date?->toDateString() ?? '-' }}</span></td>
            <td><span class="label">Currency</span><span class="value">{{ $invoice->currency }}</span></td>
        </tr>
    </table>

    <!-- ===== ADDRESSES ===== -->
    <table class="addresses-table">
        <tr>
            <td>
                <div class="box first">
                    <span class="title">Seller</span>
                    <div class="addr">
                        {{ $invoice->seller_name }}<br>
                        {{ $invoice->seller_email }}<br>
                        @if($invoice->seller_vat_id){{ $invoice->seller_vat_id }}<br>@endif
                        {!! nl2br(e($invoice->seller_address ?? '')) !!}
                    </div>
                </div>
            </td>
            <td>
                <div class="box last">
                    <span class="title">Buyer</span>
                    <div class="addr">
                        {{ $invoice->buyer_name }}<br>
                        {{ $invoice->buyer_email }}<br>
                        @if($invoice->buyer_vat_id){{ $invoice->buyer_vat_id }}<br>@endif
                        {!! nl2br(e($invoice->buyer_address ?? '')) !!}
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- ===== ITEMS ===== -->
    <table class="items">
        <thead>
            <tr>
                <th style="width:46%;">Description</th>
                <th style="width:12%;">Unit</th>
                <th style="width:10%;">Qty</th>
                <th style="width:13%;">Unit Price</th>
                <th style="width:8%;">Tax %</th>
                <th style="width:11%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td>{{ strtoupper($item->unit_type ?? 'quantity') }}</td>
                    <td>{{ number_format((float) $item->quantity, 2) }}</td>
                    <td>{{ number_format((float) $item->unit_price, 2) }}</td>
                    <td>{{ number_format((float) $item->tax_percent, 2) }}</td>
                    <td>{{ number_format((float) $item->line_total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- ===== TOTALS ===== -->
    <table class="totals">
        <tr><td class="sub-label">Subtotal</td><td>{{ number_format((float) $invoice->subtotal_amount, 2) }} {{ $invoice->currency }}</td></tr>
        <tr><td class="sub-label">Tax</td><td>{{ number_format((float) $invoice->tax_amount, 2) }} {{ $invoice->currency }}</td></tr>
        <tr class="total-row"><td>Total</td><td>{{ number_format((float) $invoice->total_amount, 2) }} {{ $invoice->currency }}</td></tr>
    </table>

    @if($invoice->notes)
        <div class="notes-box">
            <span class="title">Notes</span>
            <p>{!! nl2br(e($invoice->notes)) !!}</p>
        </div>
    @endif

    <div class="footer">
        <span class="page"></span> &middot; Agency Hub &middot; {{ config('app.url') }}
    </div>
</body>
</html>
