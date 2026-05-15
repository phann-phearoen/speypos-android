import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, FolderTree } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getMenuCompatibilityProvider } from '@/lib/compatibility/menu';
import { resolveImageUrl } from '@/lib/api';
import type {
  CustomizationOptionGroup,
  MenuCategory,
  MenuCategoryCustomizationGroup,
  MenuCategoryToppingGroup,
  MenuItemCategoryMap,
  ToppingGroup,
} from '@/types/pos';
import { ImageUpload } from './ImageUpload';
import { useTranslation } from '@/lib/i18n';

const menuCompatibility = getMenuCompatibilityProvider();

interface CategoryFormData {
  name: string;
  image_url: string;
  sort_order: number;
}

const initialFormData: CategoryFormData = {
  name: '',
  image_url: '',
  sort_order: 0,
};

export function CategoryManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refresh: refreshMenuContext } = useMenu();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [mappings, setMappings] = useState<MenuItemCategoryMap[]>([]);
  const [categoryCustomizationMappings, setCategoryCustomizationMappings] = useState<MenuCategoryCustomizationGroup[]>([]);
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationOptionGroup[]>([]);
  const [categoryToppingMappings, setCategoryToppingMappings] = useState<MenuCategoryToppingGroup[]>([]);
  const [toppingGroups, setToppingGroups] = useState<ToppingGroup[]>([]);

  const [selectedCustomizationGroupIds, setSelectedCustomizationGroupIds] = useState<string[]>([]);
  const [selectedToppingGroupIds, setSelectedToppingGroupIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  const fetchData = async () => {
    setIsLoading(true);
    const [categoriesRes, mappingsRes, categoryCustomizationRes, categoryToppingRes] = await Promise.all([
      menuCompatibility.getCategories(),
      menuCompatibility.getMenuItemCategoryMappings(),
      menuCompatibility.getMenuCategoryCustomizationMappings(),
      menuCompatibility.getMenuCategoryToppingMappings(),
    ]);

    if (categoriesRes.data) {
      // Sort categories by sort_order, then by name
      const sorted = [...categoriesRes.data].sort((a, b) => {
        const orderA = a.sort_order ?? 999;
        const orderB = b.sort_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
    }
    if (mappingsRes.data) setMappings(mappingsRes.data);
    if (categoryCustomizationRes.data) setCategoryCustomizationMappings(categoryCustomizationRes.data);
    if (categoryToppingRes.data) setCategoryToppingMappings(categoryToppingRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Load customization groups once (for selection UI)
    menuCompatibility.getCustomizationGroups().then((res) => {
      if (res.data) {
        const sorted = [...res.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setCustomizationGroups(sorted);
      }
    });

    // Load topping groups once (for selection UI)
    menuCompatibility.getToppingGroups().then((res) => {
      if (res.data) {
        const sorted = [...res.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setToppingGroups(sorted);
      }
    });
  }, []);

  const getItemCount = (categoryId: string) => {
    return mappings.filter(m => m.menu_category_id === categoryId).length;
  };

  const openCreateForm = () => {
    setEditingCategory(null);
    setFormData(initialFormData);
    setSelectedCustomizationGroupIds([]);
    setSelectedToppingGroupIds([]);
    setIsFormOpen(true);
  };

  const openEditForm = (category: MenuCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      image_url: category.image_url || '',
      sort_order: category.sort_order ?? 0,
    });

    const existingGroupIds = categoryCustomizationMappings
      .filter((m) => m.menu_category_id === category.id)
      .map((m) => m.customization_group_id);
    setSelectedCustomizationGroupIds(existingGroupIds);

    const existingToppingGroupIds = categoryToppingMappings
      .filter((m) => m.menu_category_id === category.id)
      .map((m) => m.topping_group_id);
    setSelectedToppingGroupIds(existingToppingGroupIds);

    setIsFormOpen(true);
  };

  const openDeleteDialog = (category: MenuCategory) => {
    setDeletingCategory(category);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: t('toast.error'), description: t('validation.nameRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let categoryId: string | null = editingCategory?.id ?? null;

      if (editingCategory) {
        const response = await menuCompatibility.updateCategory(editingCategory.id, {
          name: formData.name.trim(),
          image_url: formData.image_url.trim() || null,
          sort_order: formData.sort_order,
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.categoryUpdated') });
      } else {
        const response = await menuCompatibility.createCategory({
          name: formData.name.trim(),
          image_url: formData.image_url.trim() || undefined,
          sort_order: formData.sort_order,
        });
        if (response.error) throw new Error(response.error);
        categoryId = response.data?.id ?? null;
        if (!categoryId) throw new Error('Category created without id');
        toast({ title: t('toast.success'), description: t('toast.categoryCreated') });
      }

      // Sync category ↔ customization-group mappings
      if (categoryId) {
        const existingMappings = categoryCustomizationMappings.filter((m) => m.menu_category_id === categoryId);
        const existingGroupIds = new Set(existingMappings.map((m) => m.customization_group_id));
        const nextGroupIds = new Set(selectedCustomizationGroupIds);

        const toCreate = Array.from(nextGroupIds).filter((gid) => !existingGroupIds.has(gid));
        const toDelete = existingMappings.filter((m) => !nextGroupIds.has(m.customization_group_id));

        // Sync category ↔ topping-group mappings
        const existingToppingMappings = categoryToppingMappings.filter((m) => m.menu_category_id === categoryId);
        const existingToppingIds = new Set(existingToppingMappings.map((m) => m.topping_group_id));
        const nextToppingIds = new Set(selectedToppingGroupIds);

        const toppingsToCreate = Array.from(nextToppingIds).filter((gid) => !existingToppingIds.has(gid));
        const toppingsToDelete = existingToppingMappings.filter((m) => !nextToppingIds.has(m.topping_group_id));

        await Promise.all([
          ...toCreate.map((customization_group_id) =>
            menuCompatibility.createMenuCategoryCustomizationMapping({ menu_category_id: categoryId, customization_group_id })
          ),
          ...toDelete.map((m) => menuCompatibility.deleteMenuCategoryCustomizationMapping(m.id)),
          ...toppingsToCreate.map((topping_group_id) =>
            menuCompatibility.createMenuCategoryToppingMapping({ menu_category_id: categoryId, topping_group_id })
          ),
          ...toppingsToDelete.map((m) => menuCompatibility.deleteMenuCategoryToppingMapping(m.id)),
        ]);
      }

      setIsFormOpen(false);
      await fetchData();
      await refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsSubmitting(true);
    try {
      const response = await menuCompatibility.deleteCategory(deletingCategory.id);
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.categoryDeleted') });
      setIsDeleteOpen(false);
      fetchData();
      refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToDelete'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.categories.title')}</h1>
          <p className="text-muted-foreground">{t('admin.categories.description')}</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('admin.categories.add')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card">
          {t('admin.categories.noCategories')}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('admin.menuItems.image')}</TableHead>
                <TableHead>{t('admin.menuItems.name')}</TableHead>
                <TableHead className="w-24">{t('admin.categories.sortOrder')}</TableHead>
                <TableHead className="w-32">{t('admin.categories.items')}</TableHead>
                <TableHead className="w-24 text-right">{t('admin.menuItems.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden">
                      {category.image_url ? (
                        <img 
                          src={resolveImageUrl(category.image_url)} 
                          alt={category.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <FolderTree className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{category.sort_order ?? 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {getItemCount(category.id)} {t('admin.categories.items')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditForm(category)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openDeleteDialog(category)} 
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? t('admin.categories.edit') : t('admin.categories.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[80vh] overflow-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.name')}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.categories.enterName')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.categories.sortOrder')}</label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">{t('admin.categories.sortOrderHint')}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('admin.categories.customizations')}</label>
                <span className="text-xs text-muted-foreground">{selectedCustomizationGroupIds.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('admin.categories.customizationsHint')}</p>

              {customizationGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('admin.categories.noCustomizationGroups')}</div>
              ) : (
                <div className="max-h-48 overflow-auto rounded-md border bg-background">
                  <div className="divide-y">
                    {customizationGroups.map((group) => {
                      const checked = selectedCustomizationGroupIds.includes(group.id);
                      return (
                        <label
                          key={group.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                        >
                          <span className="text-foreground">{group.name}</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedCustomizationGroupIds((prev) => {
                                if (e.target.checked) return Array.from(new Set([...prev, group.id]));
                                return prev.filter((id) => id !== group.id);
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Topping Groups Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('admin.categories.toppings')}</label>
                <span className="text-xs text-muted-foreground">{selectedToppingGroupIds.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('admin.categories.toppingsHint')}</p>

              {toppingGroups.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('admin.categories.noToppingGroups')}</div>
              ) : (
                <div className="max-h-48 overflow-auto rounded-md border bg-background">
                  <div className="divide-y">
                    {toppingGroups.map((group) => {
                      const checked = selectedToppingGroupIds.includes(group.id);
                      return (
                        <label
                          key={group.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                        >
                          <span className="text-foreground">{group.name}</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedToppingGroupIds((prev) => {
                                if (e.target.checked) return Array.from(new Set([...prev, group.id]));
                                return prev.filter((id) => id !== group.id);
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <ImageUpload
              type="category"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCategory ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.categories.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.categories.deleteConfirm')} <span className="font-medium text-foreground">{deletingCategory?.name}</span>? {t('admin.categories.deleteWarning')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
