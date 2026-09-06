<?php

namespace App\Jobs;

use App\Domain\Services\TaskService;
use App\Models\FathomProcessedEvent;
use App\Models\Task;
use App\Models\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessFathomMeetingJob implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        private readonly int $tenantId,
        private readonly string $projectUuid,
        private readonly string $boardColumn,
        private readonly array $meetingData,
    ) {}

    public function handle(TaskService $taskService): void
    {
        if (Tenant::query()->whereKey($this->tenantId)->where('kind', 'demo')->exists()) {
            Log::warning('ProcessFathomMeetingJob: demo tenant skipped', ['tenant_id' => $this->tenantId]);

            return;
        }

        $meetingId = $this->meetingData['id'] ?? null;

        if ($meetingId === null) {
            Log::warning('ProcessFathomMeetingJob: payload sem meeting id', ['data' => $this->meetingData]);

            return;
        }

        // Idempotency guard — skip if already processed
        if (FathomProcessedEvent::where('meeting_id', $meetingId)->exists()) {
            return;
        }

        $actionItems = $this->meetingData['action_items'] ?? [];

        if (empty($actionItems)) {
            FathomProcessedEvent::create(['meeting_id' => $meetingId, 'tenant_id' => $this->tenantId]);

            return;
        }

        $meetingTitle = $this->meetingData['title'] ?? 'Reunião sem título';
        $meetingDate = isset($this->meetingData['started_at'])
            ? substr($this->meetingData['started_at'], 0, 10)
            : now()->toDateString();

        $attendees = collect($this->meetingData['attendees'] ?? [])->pluck('name')->filter()->values()->all();

        $sourceMetadata = [
            'meeting_id' => $meetingId,
            'meeting_title' => $meetingTitle,
            'meeting_date' => $meetingDate,
            'attendees' => $attendees,
        ];

        foreach ($actionItems as $item) {
            $text = is_string($item) ? $item : ($item['text'] ?? null);

            if (empty($text)) {
                continue;
            }

            $taskService->createTask(
                [
                    'title' => $text,
                    'description' => "Reunião: <strong>{$meetingTitle}</strong> · {$meetingDate}",
                    'board_column' => $this->boardColumn,
                    'source' => Task::SOURCE_FATHOM,
                    'source_metadata' => $sourceMetadata,
                ],
                $this->projectUuid,
                $this->tenantId,
                null, // no human creator
            );
        }

        FathomProcessedEvent::create(['meeting_id' => $meetingId, 'tenant_id' => $this->tenantId]);

        Log::info('ProcessFathomMeetingJob: tarefas criadas', [
            'meeting_id' => $meetingId,
            'tenant_id' => $this->tenantId,
            'tasks_created' => count($actionItems),
        ]);
    }
}
