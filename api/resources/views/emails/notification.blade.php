<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F4F4F5;
            color: #111111;
            -webkit-font-smoothing: antialiased;
        }
        .outer {
            width: 100%;
            padding: 32px 16px;
            background-color: #F4F4F5;
        }
        .container { max-width: 560px; margin: 0 auto; }
        .brand-header { text-align: center; padding-bottom: 20px; }
        .brand-header .logo {
            display: inline-flex; align-items: center; gap: 8px;
            font-size: 20px; font-weight: 700; color: #111111; text-decoration: none;
        }
        .brand-header .logo-icon {
            width: 32px; height: 32px;
            background-color: #DCEB63;
            border-radius: 10px;
            display: inline-flex; align-items: center; justify-content: center;
        }
        .card {
            background-color: #FFFFFF; border-radius: 16px; padding: 36px 32px;
            box-shadow: 0 8px 24px rgba(32, 32, 24, 0.06);
        }
        .type-badge {
            display: inline-block; padding: 4px 12px; border-radius: 20px;
            font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
            background-color: #DCEB63; color: #111111; margin-bottom: 16px;
        }
        .title {
            font-size: 20px; font-weight: 700; line-height: 1.3; color: #111111; margin: 0 0 12px;
        }
        .body-text {
            font-size: 15px; line-height: 1.6; color: #525252; margin-bottom: 24px;
        }
        .divider { height: 1px; background-color: #E7E6E0; margin: 24px 0; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn {
            display: inline-block; padding: 14px 32px;
            background-color: #DCEB63; color: #111111 !important;
            text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;
        }
        .btn:hover { opacity: 0.9; }
        .footer {
            margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px;
            color: #A1A1AA; border-top: 1px solid #E7E6E0;
        }
        .footer strong { color: #525252; }
        .footer a { color: #8B5CF6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="outer">
        <div class="container">
            <div class="brand-header">
                <span class="logo">
                    <span class="logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                        </svg>
                    </span>
                    Agency Hub
                </span>
            </div>
            <div class="card">
                <span class="type-badge">{{ $type }}</span>
                <h1 class="title">{{ $title }}</h1>
                @if ($body)
                    <div class="body-text">{{ $body }}</div>
                @endif
                <div class="divider"></div>
                @if ($actionUrl && $actionText)
                    <div class="btn-wrapper">
                        <a href="{{ $actionUrl }}" class="btn" target="_blank" rel="noopener">{{ $actionText }}</a>
                    </div>
                @endif
                <div class="footer">
                    <p>This is an automated notification from <strong>{{ config('app.name') }}</strong>.</p>
                    <p style="margin-top: 6px;"><a href="{{ config('app.url') }}">{{ config('app.url') }}</a></p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
