<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Time Report</title>
    <style>
        @page {
            margin: 20mm 15mm 25mm;
        }

        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 9px;
            color: #1a1a2e;
            line-height: 1.5;
        }

        /* ===== Header ===== */
        .header {
            text-align: center;
            padding-bottom: 14px;
            border-bottom: 3px solid #65a30d;
            margin-bottom: 18px;
        }
        .header h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 4px;
            color: #1a1a2e;
            letter-spacing: 0.5px;
        }
        .header .subtitle {
            font-size: 11px;
            color: #71717a;
            margin: 0;
        }
        .header .date-range {
            font-size: 10px;
            color: #65a30d;
            margin-top: 6px;
            font-weight: 600;
        }

        /* ===== Summary Cards ===== */
        .summary-row {
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
        }
        .summary-card {
            flex: 1;
            border: 1px solid #e4e4e7;
            border-radius: 8px;
            padding: 10px 12px;
            text-align: center;
        }
        .summary-card .label {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #71717a;
            margin-bottom: 4px;
        }
        .summary-card .value {
            font-size: 16px;
            font-weight: 700;
            color: #1a1a2e;
        }
        .summary-card .value.accent {
            color: #65a30d;
        }

        /* ===== Section Titles ===== */
        .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #1a1a2e;
            margin: 16px 0 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #d4d4d8;
        }

        /* ===== Summary Tables ===== */
        .mini-table {
            width: 48%;
            border-collapse: collapse;
            display: inline-table;
            vertical-align: top;
            margin-bottom: 12px;
        }
        .mini-table td {
            padding: 4px 6px;
            border-bottom: 1px solid #f4f4f5;
            font-size: 9px;
        }
        .mini-table td:last-child {
            text-align: right;
            font-weight: 600;
            width: 70px;
        }

        /* ===== Main Table ===== */
        table.entries {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 8.5px;
        }
        table.entries thead th {
            background-color: #65a30d;
            color: #ffffff;
            padding: 6px 5px;
            text-align: left;
            font-weight: 600;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        table.entries thead th:first-child {
            border-radius: 4px 0 0 0;
        }
        table.entries thead th:last-child {
            border-radius: 0 4px 0 0;
        }
        table.entries tbody td {
            padding: 5px;
            border-bottom: 1px solid #e4e4e7;
            vertical-align: top;
        }
        table.entries tbody tr:nth-child(even) {
            background-color: #fafafa;
        }
        table.entries tbody tr:hover {
            background-color: #f0fdf4;
        }
        table.entries .duration {
            font-weight: 700;
            text-align: right;
            white-space: nowrap;
            font-family: DejaVu Sans Mono, monospace;
        }
        table.entries .source-tag {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        table.entries .source-tag.timer {
            background-color: #dbeafe;
            color: #1d4ed8;
        }
        table.entries .source-tag.manual {
            background-color: #fef3c7;
            color: #b45309;
        }

        /* ===== Grand Total Row ===== */
        .grand-total {
            margin-top: 12px;
            padding: 10px 14px;
            background-color: #f0fdf4;
            border: 1px solid #65a30d;
            border-radius: 6px;
            text-align: right;
            font-size: 12px;
            font-weight: 700;
            color: #1a1a2e;
        }
        .grand-total span {
            color: #65a30d;
        }

        /* ===== Footer ===== */
        .footer {
            position: fixed;
            bottom: -18mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 7.5px;
            color: #a1a1aa;
            padding-top: 6px;
            border-top: 1px solid #e4e4e7;
        }
        .footer .page-number:before {
            content: "Page " counter(page);
        }

        /* ===== Misc ===== */
        .text-muted {
            color: #71717a;
        }
        .mt-1 { margin-top: 4px; }
        .mb-1 { margin-bottom: 4px; }
    </style>
</head>
<body>

    <!-- ===== HEADER ===== -->
    <div class="header">
        <h1>Time Report</h1>
        <p class="date-range">{{ $dateRangeLabel }}</p>
        <p class="subtitle">{{ $totalEntries }} entries &middot; Generated {{ $generatedAt }}</p>
    </div>

    <!-- ===== SUMMARY CARDS ===== -->
    <div class="summary-row">
        <div class="summary-card">
            <div class="label">Total Hours</div>
            <div class="value accent">{{ $grandTotalHours }}h {{ $grandTotalMinutes }}m</div>
        </div>
        <div class="summary-card">
            <div class="label">Projects</div>
            <div class="value">{{ $byProject->count() }}</div>
        </div>
        <div class="summary-card">
            <div class="label">People</div>
            <div class="value">{{ $byUser->count() }}</div>
        </div>
        <div class="summary-card">
            <div class="label">Entries</div>
            <div class="value">{{ $totalEntries }}</div>
        </div>
    </div>

    <!-- ===== BY PROJECT ===== -->
    <div class="section-title">By Project</div>
    <table class="mini-table">
        @foreach($byProject as $row)
            <tr>
                <td>{{ $row['project_name'] }}</td>
                <td>{{ $row['hours'] }}h {{ $row['minutes'] }}m</td>
            </tr>
        @endforeach
    </table>

    <!-- ===== BY PERSON ===== -->
    <div class="section-title">By Person</div>
    <table class="mini-table">
        @foreach($byUser as $row)
            <tr>
                <td>{{ $row['user_name'] }}</td>
                <td>{{ $row['hours'] }}h {{ $row['minutes'] }}m</td>
            </tr>
        @endforeach
    </table>

    <!-- ===== DETAILED ENTRIES ===== -->
    <div class="section-title" style="clear: both; padding-top: 8px;">Detailed Entries</div>

    <table class="entries">
        <thead>
            <tr>
                <th style="width:11%;">Date</th>
                <th style="width:16%;">Person</th>
                <th style="width:18%;">Project</th>
                <th style="width:37%;">Task</th>
                <th style="width:10%;">Duration</th>
                <th style="width:8%;">Source</th>
            </tr>
        </thead>
        <tbody>
            @forelse($entries as $entry)
                <tr>
                    <td>{{ $entry['worked_date'] }}</td>
                    <td>{{ $entry['user_name'] }}</td>
                    <td>{{ $entry['project_name'] }}</td>
                    <td>{{ $entry['task_title'] }}</td>
                    <td class="duration">{{ $entry['hours'] }}h {{ $entry['minutes'] }}m</td>
                    <td>
                        <span class="source-tag {{ $entry['source'] }}">
                            {{ $entry['source'] === 'timer' ? 'Timer' : 'Manual' }}
                        </span>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: #71717a;">
                        No time entries found for the selected period.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- ===== GRAND TOTAL ===== -->
    <div class="grand-total">
        Grand Total: <span>{{ $grandTotalHours }}h {{ $grandTotalMinutes }}m</span>
    </div>

    <!-- ===== FOOTER ===== -->
    <div class="footer">
        <span class="page-number"></span>
    </div>

</body>
</html>
