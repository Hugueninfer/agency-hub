<?php

namespace App\Providers;

use App\Events\InvoiceStatusChangedEvent;
use App\Events\ProjectUpdatedEvent;
use App\Events\TaskAssignedEvent;
use App\Events\TaskCommentAddedEvent;
use App\Events\TaskCompletedEvent;
use App\Events\TaskMentionEvent;
use App\Events\TaskStatusChangedEvent;
use App\Listeners\NotificationDispatcher;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        TaskAssignedEvent::class => [
            NotificationDispatcher::class,
        ],
        TaskCommentAddedEvent::class => [
            NotificationDispatcher::class,
        ],
        TaskMentionEvent::class => [
            NotificationDispatcher::class,
        ],
        TaskStatusChangedEvent::class => [
            NotificationDispatcher::class,
        ],
        TaskCompletedEvent::class => [
            NotificationDispatcher::class,
        ],
        InvoiceStatusChangedEvent::class => [
            NotificationDispatcher::class,
        ],
        ProjectUpdatedEvent::class => [
            NotificationDispatcher::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        parent::boot();
    }
}
