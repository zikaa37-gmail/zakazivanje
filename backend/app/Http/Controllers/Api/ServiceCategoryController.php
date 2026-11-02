<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceCategoryController extends Controller
{
    public function index()
    {
        return ServiceCategory::query()
            ->withCount('services')
            ->withCount(['services as active_services_count' => fn ($q) => $q->where('active', true)])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);

        $category = ServiceCategory::create([...$data, 'sort_order' => (int) ServiceCategory::max('sort_order') + 1]);

        return response()->json($this->present($category), 201);
    }

    public function update(Request $request, ServiceCategory $category)
    {
        $category->update($this->validated($request, $category));

        return $this->present($category);
    }

    public function setActive(Request $request, ServiceCategory $category)
    {
        $data = $request->validate(['active' => ['required', 'boolean']]);

        $category->update(['active' => $data['active']]);

        return $this->present($category);
    }

    public function destroy(ServiceCategory $category)
    {
        if ($category->services()->exists()) {
            throw ValidationException::withMessages(['category' => ['Kategorija ima usluge — premesti ih u drugu kategoriju ili deaktiviraj kategoriju.']]);
        }

        $category->delete();

        return response()->json(['message' => 'Kategorija je obrisana.']);
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', 'exists:service_categories,id'],
        ]);

        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $position => $id) {
                ServiceCategory::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        return $this->index();
    }

    public function apply(Request $request)
    {
        $data = $request->validate([
            'categories' => ['required', 'array', 'min:1', 'max:30'],
            'categories.*.name' => ['required', 'string', 'min:2', 'max:100'],
            'categories.*.services' => ['array', 'max:50'],
            'categories.*.services.*.name' => ['required', 'string', 'min:2', 'max:150'],
            'categories.*.services.*.description' => ['nullable', 'string', 'max:2000'],
            'categories.*.services.*.duration_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'categories.*.services.*.price' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'categories.*.services.*.audience' => ['nullable', Rule::in(Service::AUDIENCES)],
            'staff_member_ids' => ['array'],
            'staff_member_ids.*' => ['integer', 'exists:staff_members,id'],
        ]);

        $result = ['categories_created' => 0, 'services_created' => 0, 'services_skipped' => 0];

        DB::transaction(function () use ($data, &$result) {
            $categories = ServiceCategory::all()->keyBy(fn (ServiceCategory $c) => Str::lower(trim($c->name)));
            $services = Service::query()->pluck('name')->map(fn ($name) => Str::lower(trim($name)))->flip();
            $order = (int) ServiceCategory::max('sort_order');
            $serviceOrder = (int) Service::max('sort_order');

            foreach ($data['categories'] as $item) {
                $key = Str::lower(trim($item['name']));
                $category = $categories->get($key);
                if (! $category) {
                    $category = ServiceCategory::create(['name' => trim($item['name']), 'sort_order' => ++$order]);
                    $categories->put($key, $category);
                    $result['categories_created']++;
                }

                foreach ($item['services'] ?? [] as $proposal) {
                    $name = trim($proposal['name']);
                    if ($services->has(Str::lower($name))) {
                        $result['services_skipped']++;

                        continue;
                    }

                    $price = $proposal['price'] ?? null;
                    $service = Service::create([
                        'name' => $name,
                        'description' => $proposal['description'] ?? null,
                        'service_category_id' => $category->id,
                        'audience' => $proposal['audience'] ?? Service::AUDIENCE_ALL,
                        'duration_minutes' => $proposal['duration_minutes'],
                        'price' => $price ?? 0,
                        'active' => $price !== null && $price > 0,
                        'sort_order' => ++$serviceOrder,
                    ]);
                    $service->staffMembers()->sync($data['staff_member_ids'] ?? []);
                    $services->put(Str::lower($name), true);
                    $result['services_created']++;
                }
            }
        });

        return $result;
    }

    private function validated(Request $request, ?ServiceCategory $category = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100', Rule::unique('service_categories', 'name')->ignore($category?->id)],
        ], [
            'name.unique' => 'Kategorija sa tim nazivom već postoji.',
        ]);
    }

    private function present(ServiceCategory $category): ServiceCategory
    {
        return $category->loadCount(['services', 'services as active_services_count' => fn ($q) => $q->where('active', true)]);
    }
}
