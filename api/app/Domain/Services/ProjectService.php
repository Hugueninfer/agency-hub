<?php

namespace App\Domain\Services;

use App\Domain\Repositories\ProjectRepository;
use App\Events\ProjectUpdatedEvent;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProjectService
{
    public function __construct(
        private readonly ProjectRepository $projectRepository,
    ) {}

    public function listProjects(int $tenantId): mixed
    {
        return $this->projectRepository
            ->scopeByTenantId($tenantId)
            ->scopeQuery(fn ($query) => $query->orderBy('name'))
            ->all();
    }

    public function createProject(array $data, int $tenantId): Project
    {
        /** @var Project */
        return $this->projectRepository->create([
            'tenant_id'   => $tenantId,
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'status'      => $data['status'] ?? 'active',
        ]);
    }

    public function getProjectByUuid(string $uuid, int $tenantId): Project
    {
        /** @var Project|null $project */
        $project = $this->projectRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $uuid)
            ->first();

        if ($project === null) {
            throw new NotFoundHttpException('Project not found.');
        }

        return $project;
    }

    public function updateProject(string $uuid, array $data, int $tenantId, ?int $actorId = null): Project
    {
        $project = $this->getProjectByUuid($uuid, $tenantId);

        $project->update([
            'name'        => $data['name'] ?? $project->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $project->description,
            'status'      => $data['status'] ?? $project->status,
        ]);

        $project = $project->fresh();

        // Dispatch project update notification to users with tasks in this project
        if ($actorId !== null) {
            $actor = User::find($actorId);
            if ($actor !== null) {
                $this->dispatchProjectUpdatedEvents($project, $actor, $tenantId);
            }
        }

        return $project;
    }

    /**
     * Dispatch ProjectUpdatedEvent to all users who have tasks in this project.
     */
    private function dispatchProjectUpdatedEvents(Project $project, User $actor, int $tenantId): void
    {
        $userIds = $project->tasks()
            ->where('tenant_id', $tenantId)
            ->join('task_user', 'tasks.id', '=', 'task_user.task_id')
            ->select('task_user.user_id')
            ->distinct()
            ->pluck('user_id')
            ->toArray();

        $users = User::whereIn('id', $userIds)->where('id', '!=', $actor->id)->get();

        foreach ($users as $user) {
            Event::dispatch(new ProjectUpdatedEvent($project, $user, $actor, $tenantId));
        }
    }

    public function deleteProject(string $uuid, int $tenantId): void
    {
        $project = $this->getProjectByUuid($uuid, $tenantId);
        $project->delete();
    }
}
