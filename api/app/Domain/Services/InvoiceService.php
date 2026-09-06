<?php

namespace App\Domain\Services;

use App\Domain\Repositories\InvoiceItemRepository;
use App\Domain\Repositories\InvoiceRepository;
use App\Events\InvoiceStatusChangedEvent;
use App\Mail\InvoiceSentMail;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class InvoiceService
{
    public function __construct(
        private readonly InvoiceRepository $invoiceRepository,
        private readonly InvoiceItemRepository $invoiceItemRepository,
    ) {}

    /**
     * @return Collection<int, Invoice>
     */
    public function listInvoices(int $tenantId): Collection
    {
        return $this->invoiceRepository->listForTenantWithItems($tenantId);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createInvoice(array $data, int $tenantId, ?int $userId): Invoice
    {
        return DB::transaction(function () use ($data, $tenantId, $userId): Invoice {
            $totals = $this->computeTotals($data['items'] ?? []);

            /** @var Invoice */
            $invoice = $this->invoiceRepository->create([
                'tenant_id' => $tenantId,
                'invoice_number' => $data['invoice_number'],
                'status' => $data['status'] ?? Invoice::STATUS_DRAFT,
                'issue_date' => $data['issue_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'currency' => strtoupper((string) ($data['currency'] ?? 'USD')),
                'seller_name' => $data['seller_name'] ?? null,
                'seller_email' => $data['seller_email'] ?? null,
                'seller_vat_id' => $data['seller_vat_id'] ?? null,
                'seller_address' => $data['seller_address'] ?? null,
                'buyer_name' => $data['buyer_name'] ?? null,
                'buyer_email' => $data['buyer_email'],
                'buyer_vat_id' => $data['buyer_vat_id'] ?? null,
                'buyer_address' => $data['buyer_address'] ?? null,
                'notes' => $data['notes'] ?? null,
                'subtotal_amount' => $totals['subtotal'],
                'tax_amount' => $totals['tax'],
                'total_amount' => $totals['total'],
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $this->syncItems($invoice, $data['items'] ?? [], $tenantId);

            return $invoice->fresh('items');
        });
    }

    public function getInvoiceByUuid(string $invoiceUuid, int $tenantId): Invoice
    {
        $invoice = $this->invoiceRepository->findByUuidForTenantWithItems($invoiceUuid, $tenantId);

        if ($invoice === null) {
            throw new NotFoundHttpException('Invoice not found.');
        }

        return $invoice;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateInvoice(string $invoiceUuid, array $data, int $tenantId, ?int $userId): Invoice
    {
        return DB::transaction(function () use ($invoiceUuid, $data, $tenantId, $userId): Invoice {
            $invoice = $this->getInvoiceByUuid($invoiceUuid, $tenantId);
            $payload = [
                'updated_by' => $userId,
            ];

            foreach ([
                'invoice_number',
                'status',
                'issue_date',
                'due_date',
                'currency',
                'seller_name',
                'seller_email',
                'seller_vat_id',
                'seller_address',
                'buyer_name',
                'buyer_email',
                'buyer_vat_id',
                'buyer_address',
                'notes',
            ] as $field) {
                if (array_key_exists($field, $data)) {
                    $payload[$field] = $data[$field];
                }
            }
            if (array_key_exists('currency', $payload) && is_string($payload['currency'])) {
                $payload['currency'] = strtoupper($payload['currency']);
            }

            if (array_key_exists('items', $data) && is_array($data['items'])) {
                $totals = $this->computeTotals($data['items']);
                $payload['subtotal_amount'] = $totals['subtotal'];
                $payload['tax_amount'] = $totals['tax'];
                $payload['total_amount'] = $totals['total'];
            }

            $invoice->update($payload);

            if (array_key_exists('items', $data) && is_array($data['items'])) {
                $this->syncItems($invoice, $data['items'], $tenantId);
            }

            return $invoice->fresh('items');
        });
    }

    public function updateStatus(string $invoiceUuid, string $status, int $tenantId, ?int $userId): Invoice
    {
        $invoice = $this->getInvoiceByUuid($invoiceUuid, $tenantId);
        $oldStatus = $invoice->status;

        $invoice->update([
            'status' => $status,
            'updated_by' => $userId,
        ]);

        $invoice->fresh();

        // Notify invoice creator about status change
        if ($invoice->created_by && $invoice->created_by !== $userId) {
            $recipient = User::find($invoice->created_by);
            $actor = $userId !== null ? User::find($userId) : null;

            if ($recipient !== null && $actor !== null) {
                Event::dispatch(
                    new InvoiceStatusChangedEvent($invoice, $oldStatus, $status, $recipient, $actor, $tenantId),
                );
            }
        }

        return $invoice->fresh('items');
    }

    public function sendInvoice(string $invoiceUuid, int $tenantId, ?int $userId, ?string $ccEmail): Invoice
    {
        $actor = $userId !== null ? User::find($userId) : null;
        if ($actor?->isDemo() || Tenant::query()->whereKey($tenantId)->where('kind', 'demo')->exists()) {
            abort(403, 'External actions are disabled in demonstrations.');
        }

        $invoice = $this->getInvoiceByUuid($invoiceUuid, $tenantId);
        $invoice->load('items');

        $pdfBinary = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'accentColor' => '#DCEB63',
            'secondaryColor' => '#8B5CF6',
        ])->output();
        $filename = sprintf('invoice-%s.pdf', $invoice->invoice_number);

        $mail = Mail::to($invoice->buyer_email);
        if (! empty($ccEmail)) {
            $mail->cc($ccEmail);
        }
        // Queued: the SMTP round-trip must not block the HTTP request.
        $mail->queue(new InvoiceSentMail(
            invoice: $invoice,
            pdfBinary: base64_encode($pdfBinary),
            pdfFilename: $filename,
        ));

        if ($invoice->status === Invoice::STATUS_DRAFT) {
            $invoice->status = Invoice::STATUS_SENT;
        }
        $invoice->sent_at = now();
        $invoice->updated_by = $userId;
        $invoice->save();

        return $invoice->fresh('items');
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{subtotal: float, tax: float, total: float}
     */
    private function computeTotals(array $items): array
    {
        $subtotal = 0.0;
        $tax = 0.0;

        foreach ($items as $item) {
            $quantity = (float) ($item['quantity'] ?? 0);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $taxPercent = (float) ($item['tax_percent'] ?? 0);
            $base = $quantity * $unitPrice;
            $lineTax = $base * ($taxPercent / 100);
            $subtotal += $base;
            $tax += $lineTax;
        }

        return [
            'subtotal' => round($subtotal, 2),
            'tax' => round($tax, 2),
            'total' => round($subtotal + $tax, 2),
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(Invoice $invoice, array $items, int $tenantId): void
    {
        $this->invoiceItemRepository->deleteAllForInvoice($invoice->id);

        $rows = [];
        foreach (array_values($items) as $index => $item) {
            $quantity = (float) ($item['quantity'] ?? 0);
            $unitPrice = (float) ($item['unit_price'] ?? 0);
            $taxPercent = (float) ($item['tax_percent'] ?? 0);
            $base = $quantity * $unitPrice;
            $lineTax = $base * ($taxPercent / 100);
            $lineTotal = round($base + $lineTax, 2);

            $rows[] = [
                'tenant_id' => $tenantId,
                'invoice_id' => $invoice->id,
                'position' => $index,
                'description' => $item['description'] ?? '',
                'unit_type' => (string) ($item['unit_type'] ?? 'quantity'),
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'tax_percent' => $taxPercent,
                'line_total' => $lineTotal,
            ];
        }

        $this->invoiceItemRepository->insertMany($rows);
    }
}
