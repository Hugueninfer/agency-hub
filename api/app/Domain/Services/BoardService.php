<?php

namespace App\Domain\Services;

use App\Domain\Repositories\BoardRepository;
use App\Models\Board;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BoardService
{
    public function __construct(
        private readonly BoardRepository $boardRepository,
    ) {}

    public function listBoards(int $tenantId): mixed
    {
        return $this->boardRepository
            ->scopeByTenantId($tenantId)
            ->scopeQuery(fn ($query) => $query->orderByDesc('updated_at'))
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createBoard(array $data, int $tenantId, ?int $userId): Board
    {
        /** @var Board */
        return $this->boardRepository->create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'excalidraw_data' => $data['excalidraw_data'] ?? $this->emptyScene(),
            'created_by' => $userId,
            'updated_by' => $userId,
        ]);
    }

    public function getBoardByUuid(string $boardUuid, int $tenantId): Board
    {
        /** @var Board|null $board */
        $board = $this->boardRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $boardUuid)
            ->first();

        if ($board === null) {
            throw new NotFoundHttpException('Board not found.');
        }

        return $board;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateBoard(string $boardUuid, array $data, int $tenantId, ?int $userId): Board
    {
        $board = $this->getBoardByUuid($boardUuid, $tenantId);

        $payload = [];
        if (array_key_exists('name', $data)) {
            $payload['name'] = $data['name'];
        }
        if (array_key_exists('excalidraw_data', $data)) {
            $payload['excalidraw_data'] = $data['excalidraw_data'] ?? $this->emptyScene();
        }
        if ($userId !== null) {
            $payload['updated_by'] = $userId;
        }

        if ($payload !== []) {
            $board->update($payload);
        }

        return $board->fresh();
    }

    public function deleteBoard(string $boardUuid, int $tenantId): void
    {
        $board = $this->getBoardByUuid($boardUuid, $tenantId);
        $board->delete();
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyScene(): array
    {
        return [
            'elements' => [],
            'appState' => new \stdClass(),
            'files' => new \stdClass(),
        ];
    }
}
