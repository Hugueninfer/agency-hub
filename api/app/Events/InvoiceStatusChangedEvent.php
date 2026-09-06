<?php

namespace App\Events;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InvoiceStatusChangedEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Invoice $invoice,
        public string $oldStatus,
        public string $newStatus,
        public User $recipient,
        public User $actor,
        public int $tenantId,
    ) {}
}
