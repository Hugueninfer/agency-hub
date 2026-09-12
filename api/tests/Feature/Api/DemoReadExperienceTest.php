<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DemoReadExperienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_demo_resources_can_be_loaded_with_serializable_dates_and_details(): void
    {
        config(['app.mode' => 'combined']);
        $this->withToken(app(DemoSessionService::class)->create()['token']);
        $projects = $this->getFreshJson('/api/v1/projects')->assertOk()->assertJsonCount(3, 'data')->json('data');
        $taskCount = 0;
        $datedTaskCount = 0;
        foreach ($projects as $project) {
            $tasks = $this->getFreshJson('/api/v1/projects/'.$project['uuid'].'/tasks')->assertOk()->json('data');
            $taskCount += count($tasks);
            foreach ($tasks as $task) {
                $this->getFreshJson('/api/v1/tasks/'.$task['uuid'])->assertOk()
                    ->assertJsonPath('data.due_date', $task['due_date']);
                if ($task['due_date'] !== null) {
                    $datedTaskCount++;
                    $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $task['due_date']);
                }
            }
        }
        $this->assertSame(8, $taskCount);
        $this->assertGreaterThan(0, $datedTaskCount);
        foreach (['boards' => 2, 'invoices' => 3] as $family => $count) {
            $resources = $this->getFreshJson('/api/v1/'.$family)->assertOk()->assertJsonCount($count, 'data')->json('data');
            foreach ($resources as $resource) {
                $this->getFreshJson('/api/v1/'.$family.'/'.$resource['uuid'])->assertOk()
                    ->assertJsonPath('data.uuid', $resource['uuid']);
            }
        }
        $this->getFreshJson('/api/v1/time/entries')->assertOk()->assertJsonCount(8, 'data.items');
        $notifications = $this->getFreshJson('/api/v1/notifications')->assertOk()->json('data.data');
        $this->assertNotEmpty($notifications);
    }

    private function getFreshJson(string $uri): TestResponse
    {
        // PHP-FPM creates fresh controllers/repositories for every HTTP request.
        // Laravel's multi-request test client otherwise retains their query state.
        foreach (app('router')->getRoutes() as $route) {
            $route->flushController();
        }

        return $this->getJson($uri);
    }
}
