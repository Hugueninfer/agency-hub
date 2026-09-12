<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoSessionService;
use App\Models\DemoToken;
use App\Models\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DemoIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_foreign_uuids_cannot_read_or_mutate_any_resource_family_between_two_demos_and_a_personal_session(): void
    {
        config(['app.mode' => 'combined']);
        $actors = [];
        foreach (['demo-a', 'demo-b', 'personal'] as $name) {
            $session = app(DemoSessionService::class)->create();
            $token = DemoToken::findOrFail(hash('sha256', $session['token']));
            $actors[$name] = ['token' => $session['token'], 'user' => $token->user];
        }
        $personal = $actors['personal']['user'];
        $personal->tenant->update(['kind' => 'personal', 'expires_at' => null]);
        DemoToken::where('tenant_id', $personal->tenant_id)->delete();
        $this->withHeader('Origin', 'http://localhost');
        $this->withSession(['login_web_'.sha1(SessionGuard::class) => $personal->id]);
        $baseline = $this->databaseSnapshot();

        foreach ($actors as $actorName => $actor) {
            $this->withoutHeader('Authorization');
            if ($actorName !== 'personal') {
                $this->withToken($actor['token']);
            }
            Auth::forgetGuards();
            $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.uuid', $actor['user']->uuid);

            foreach ($actors as $targetName => $target) {
                if ($targetName === $actorName) {
                    continue;
                }
                foreach ($this->foreignRequests($target['user']) as [$method, $path, $payload, $supported]) {
                    Auth::forgetGuards();
                    // Match PHP-FPM's fresh controller/repository lifecycle so a
                    // previous denied UUID cannot contaminate the next query.
                    foreach (app('router')->getRoutes() as $route) {
                        $route->flushController();
                    }
                    $response = $this->json($method, '/api/v1/'.$path, $payload);
                    $this->assertContains($response->status(), $supported ? [403, 404] : [404, 405],
                        "$actorName accessing $targetName: $method $path: ".$response->getContent());
                }
                $this->assertSame($baseline, $this->databaseSnapshot(), "$actorName changed $targetName data");
            }
        }

        $this->withToken('invalid')->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withoutHeader('Authorization');
        Auth::forgetGuards();
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.uuid', $personal->uuid);
    }

    private function foreignRequests(User $owner): array
    {
        $tenantId = $owner->tenant_id;
        $requests = [];
        foreach (['projects' => 'name', 'tasks' => 'title', 'boards' => 'name', 'invoices' => 'notes'] as $table => $field) {
            $uuid = DB::table($table)->where('tenant_id', $tenantId)->value('uuid');
            $this->assertNotNull($uuid);
            $requests[] = ['GET', "$table/$uuid", [], true];
            $requests[] = ['PATCH', "$table/$uuid", [$field => 'Foreign write must fail'], true];
            $requests[] = ['DELETE', "$table/$uuid", [], $table !== 'invoices'];
        }
        $entry = DB::table('time_entries')->where('tenant_id', $tenantId)->where('user_id', $owner->id)->value('uuid');
        $this->assertNotNull($entry);
        $requests[] = ['GET', "time/entries/$entry", [], false];
        $requests[] = ['PATCH', "time/entries/$entry", ['duration_minutes' => 99], true];
        $requests[] = ['DELETE', "time/entries/$entry", [], true];
        $notice = DB::table('notifications')->where('tenant_id', $tenantId)->where('notifiable_id', $owner->id)->value('uuid');
        $this->assertNotNull($notice);
        $requests[] = ['GET', "notifications/$notice", [], false];
        $requests[] = ['PATCH', "notifications/$notice/read", [], true];
        $requests[] = ['DELETE', "notifications/$notice", [], false];

        return $requests;
    }

    private function databaseSnapshot(): array
    {
        $snapshot = [];
        foreach (Schema::getTableListing() as $table) {
            $snapshot[$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)
                ->sortBy(fn ($row) => json_encode($row, JSON_THROW_ON_ERROR))->values()->all();
        }

        return $snapshot;
    }
}
