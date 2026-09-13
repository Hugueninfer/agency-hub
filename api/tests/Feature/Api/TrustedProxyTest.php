<?php

namespace Tests\Feature\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class TrustedProxyTest extends TestCase
{
    protected function setUp(): void
    {
        Env::getRepository()->set('TRUSTED_PROXIES', str_contains($this->name(), 'render_proxy') ? '*' : '');
        parent::setUp();
        config(['app.mode' => 'combined']);
        Route::middleware(['api', 'throttle:demo-create'])->get('/api/proxy-probe', fn (Request $request) => [
            'url' => url('/api/v1/projects'), 'ip' => $request->ip(),
        ]);
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10']);
        $this->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'agency-hub.example',
            'X-Forwarded-Port' => '443', 'X-Forwarded-For' => '198.51.100.10']);
    }

    protected function tearDown(): void
    {
        Env::getRepository()->clear('TRUSTED_PROXIES');
        parent::tearDown();
    }

    public function test_without_proxy_configuration_spoofed_headers_cannot_change_urls_or_rate_limit_identity(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->getJson('/api/proxy-probe')->assertOk()
                ->assertJsonPath('url', 'http://localhost/api/v1/projects')->assertJsonPath('ip', '10.0.0.10');
        }
        $this->withHeader('X-Forwarded-For', '198.51.100.11')->getJson('/api/proxy-probe')->assertTooManyRequests();
    }

    public function test_render_proxy_configuration_uses_https_origin_and_separate_client_rate_limits(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->getJson('/api/proxy-probe')->assertOk()
                ->assertJsonPath('url', 'https://agency-hub.example/api/v1/projects')->assertJsonPath('ip', '198.51.100.10');
        }
        $this->getJson('/api/proxy-probe')->assertTooManyRequests();
        $this->withHeader('X-Forwarded-For', '198.51.100.11')->getJson('/api/proxy-probe')->assertOk()
            ->assertJsonPath('ip', '198.51.100.11');
    }
}
