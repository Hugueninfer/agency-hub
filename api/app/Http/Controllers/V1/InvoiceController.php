<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\InvoiceService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Invoice\StoreInvoiceRequest;
use App\Http\Requests\V1\Invoice\UpdateInvoiceRequest;
use App\Http\Requests\V1\Invoice\UpdateInvoiceStatusRequest;
use App\Http\Resources\V1\Invoice\InvoiceResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class InvoiceController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
    ) {}

    public function index(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $invoices = $this->invoiceService->listInvoices($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('invoice.listed'),
            InvoiceResource::collection($invoices),
        );
    }

    public function store(StoreInvoiceRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $invoice = $this->invoiceService->createInvoice($request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('invoice.created'),
                new InvoiceResource($invoice),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function show(Request $request, string $invoiceUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $invoice = $this->invoiceService->getInvoiceByUuid($invoiceUuid, $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('invoice.loaded'),
                new InvoiceResource($invoice),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function update(UpdateInvoiceRequest $request, string $invoiceUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $invoice = $this->invoiceService->updateInvoice($invoiceUuid, $request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('invoice.updated'),
                new InvoiceResource($invoice),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function updateStatus(UpdateInvoiceStatusRequest $request, string $invoiceUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $invoice = $this->invoiceService->updateStatus(
                $invoiceUuid,
                (string) $request->validated()['status'],
                $tenantId,
                $userId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('invoice.status_updated'),
                new InvoiceResource($invoice),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function send(Request $request, string $invoiceUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $ccEmail = $request->user()?->email;
            $invoice = $this->invoiceService->sendInvoice($invoiceUuid, $tenantId, $userId, $ccEmail);

            return $this->buildSuccessResponse(
                ToastMessage::get('invoice.sent'),
                new InvoiceResource($invoice),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
