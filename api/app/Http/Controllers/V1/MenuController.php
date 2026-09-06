<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\MenuService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Workspace\UpdateMenuRequest;
use App\Http\Resources\V1\Workspace\MenuItemResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class MenuController extends Controller
{
    public function __construct(
        private readonly MenuService $menuService,
    ) {}

    public function index(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $items = $this->menuService->getMenu($tenantId);

            // Group by section
            $main = $items->where('section', 'main')->values();
            $settings = $items->where('section', 'settings')->values();

            return $this->buildSuccessResponse(
                ToastMessage::get('menu.listed'),
                [
                    'main' => MenuItemResource::collection($main),
                    'settings' => MenuItemResource::collection($settings),
                ],
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function update(UpdateMenuRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->menuService->updateMenu($tenantId, $request->validated()['items']);

            return $this->buildSuccessResponse(
                ToastMessage::get('menu.updated'),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
