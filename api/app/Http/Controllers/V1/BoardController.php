<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\BoardService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Board\StoreBoardRequest;
use App\Http\Requests\V1\Board\UpdateBoardRequest;
use App\Http\Resources\V1\Board\BoardResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class BoardController extends Controller
{
    public function __construct(
        private readonly BoardService $boardService,
    ) {}

    public function index(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $boards = $this->boardService->listBoards($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('board.listed'),
            BoardResource::collection($boards),
        );
    }

    public function store(StoreBoardRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;

            $board = $this->boardService->createBoard($request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('board.created'),
                new BoardResource($board),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function show(Request $request, string $boardUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $board = $this->boardService->getBoardByUuid($boardUuid, $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('board.loaded'),
                new BoardResource($board),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function update(UpdateBoardRequest $request, string $boardUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $board = $this->boardService->updateBoard($boardUuid, $request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('board.updated'),
                new BoardResource($board),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function destroy(Request $request, string $boardUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->boardService->deleteBoard($boardUuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('board.deleted'));
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
