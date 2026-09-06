<?php

namespace App\Events;

use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskCommentAddedEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Task $task,
        public TaskComment $comment,
        public User $recipient,
        public User $actor,
        public int $tenantId,
    ) {}
}
