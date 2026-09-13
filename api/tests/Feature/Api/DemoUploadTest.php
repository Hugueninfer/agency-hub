<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoSessionService;
use App\Models\DemoToken;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DemoUploadTest extends TestCase
{
    use RefreshDatabase;

    public static function demoUploads(): array
    {
        $cases = [];
        foreach (['create-photo', 'update-photo', 'attachment', 'logo'] as $entry) {
            foreach ([0, 1, 5000] as $budget) {
                $cases[$entry.' budget '.$budget] = [$entry, $budget];
            }
        }

        return $cases;
    }

    public static function personalUploads(): array
    {
        return array_map(fn ($entry) => [$entry], ['create-photo', 'update-photo', 'attachment', 'logo']);
    }

    #[DataProvider('demoUploads')]
    public function test_demo_uploads_never_leave_files_even_across_reset_and_cleanup(string $entry, int $budget): void
    {
        Storage::fake('public');
        config(['app.mode' => 'combined', 'services.demo.max_writes' => $budget]);
        $session = app(DemoSessionService::class)->create();
        $token = DemoToken::findOrFail(hash('sha256', $session['token']));
        $this->withToken($session['token']);
        [$method, $url, $payload] = $this->upload($entry, $token);

        $this->json($method, $url, $payload)->assertForbidden()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Uploads are disabled in demonstrations.');
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame(0, $token->tenant->fresh()->demo_write_count);
        $this->postJson('/api/v1/auth/demo/reset')->assertOk();
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertNull($token->tenant->fresh()->logo_path);
        $this->assertFalse($token->tenant->users()->whereNotNull('photo_path')->exists());
        $this->assertSame(0, DB::table('task_attachments')->count());
        $token->tenant->update(['expires_at' => now()->subMinute()]);
        $this->artisan('demo:cleanup')->assertSuccessful();
        $this->assertDatabaseMissing('tenants', ['id' => $token->tenant_id]);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    #[DataProvider('personalUploads')]
    public function test_personal_uploads_remain_available(string $entry): void
    {
        Storage::fake('public');
        config(['app.mode' => 'combined']);
        $session = app(DemoSessionService::class)->create();
        $token = DemoToken::findOrFail(hash('sha256', $session['token']));
        $token->tenant->update(['kind' => 'personal', 'expires_at' => null]);
        $this->actingAs($token->user, 'web');
        [$method, $url, $payload] = $this->upload($entry, $token);

        $this->json($method, $url, $payload)->assertSuccessful();
        $this->assertCount(1, Storage::disk('public')->allFiles());
    }

    private function upload(string $entry, DemoToken $token): array
    {
        $user = $token->user;
        $payload = ['name' => 'Upload User', 'email' => $user->email, 'role_uuid' => $user->roles()->firstOrFail()->uuid,
            'photo' => UploadedFile::fake()->image('photo.png')];

        return match ($entry) {
            'create-photo' => ['POST', '/api/v1/rbac/users', array_merge($payload, ['email' => 'upload@example.test', 'password' => 'password123'])],
            'update-photo' => ['PATCH', '/api/v1/rbac/users/'.$user->uuid, $payload],
            'attachment' => ['POST', '/api/v1/tasks/'.Task::where('tenant_id', $token->tenant_id)->firstOrFail()->uuid.'/attachments', ['file' => UploadedFile::fake()->image('attachment.png')]],
            'logo' => ['PATCH', '/api/v1/workspace/settings', ['logo' => UploadedFile::fake()->image('logo.png')]],
        };
    }
}
