import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getMenuCompatibilityProvider } from '@/lib/compatibility/menu';
import { resolveImageUrl } from '@/lib/api';
import type { MenuItem, MenuCategory, MenuItemCategoryMap, CustomizationOptionGroup, MenuItemCustomizationGroup, ToppingGroup, MenuItemToppingGroup } from '@/types/pos';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrency } from '@/lib/currency';
import { ImageUpload } from './ImageUpload';
import { useTranslation } from '@/lib/i18n';

const menuCompatibility = getMenuCompatibilityProvider();

interface MenuItemFormData {
  name: string;
  price: string;
  image_url: string;
  category_ids: string[];
  customization_group_ids: string[];
  topping_group_ids: string[];
}

const initialFormData: MenuItemFormData = {
  name: '',
  price: '',
  image_url: '',
  category_ids: [],
  customization_group_ids: [],
  topping_group_ids: [],
};

export function MenuItemManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refresh: refreshMenuContext } = useMenu();
  const { format, normalizeInput, toDisplayValue, symbol: CURRENCY_SYMBOL, getMinorUnit } = useCurrency();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [mappings, setMappings] = useState<MenuItemCategoryMap[]>([]);
  const [customizationGroups, setCustomizationGroups] = useState<CustomizationOptionGroup[]>([]);
  const [customizationMappings, setCustomizationMappings] = useState<MenuItemCustomizationGroup[]>([]);
  const [toppingGroups, setToppingGroups] = useState<ToppingGroup[]>([]);
  const [toppingMappings, setToppingMappings] = useState<MenuItemToppingGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<MenuItemFormData>(initialFormData);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [itemsRes, categoriesRes, mappingsRes, customGroupsRes, customMappingsRes, toppingGroupsRes, toppingMappingsRes] = await Promise.all([
      menuCompatibility.getMenuItems(),
      menuCompatibility.getCategories(),
      menuCompatibility.getMenuItemCategoryMappings(),
      menuCompatibility.getCustomizationGroups(),
      menuCompatibility.getMenuItemCustomizationMappings(),
      menuCompatibility.getToppingGroups(),
      menuCompatibility.getMenuItemToppingMappings(),
    ]);
    
    if (itemsRes.data) setItems(itemsRes.data);
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
    if (customGroupsRes.data) setCustomizationGroups(customGroupsRes.data);
    if (customMappingsRes.data) setCustomizationMappings(customMappingsRes.data);
    if (toppingGroupsRes.data) {
      const sorted = [...toppingGroupsRes.data].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setToppingGroups(sorted);
    }
    if (toppingMappingsRes.data) setToppingMappings(toppingMappingsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default category to the one with lowest sort_order when categories load
  useEffect(() => {
    if (categories.length > 0 && selectedCategory === null) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const getItemCategories = (itemId: string) => {
    const itemMappings = mappings.filter(m => m.menu_item_id === itemId);
    return categories.filter(c => itemMappings.some(m => m.menu_category_id === c.id));
  };

  const getItemCustomizationGroups = (itemId: string) => {
    const itemMappings = customizationMappings.filter(m => m.menu_item_id === itemId);
    return customizationGroups.filter(g => itemMappings.some(m => m.customization_group_id === g.id));
  };

  const getItemToppingGroups = (itemId: string) => {
    const itemMappings = toppingMappings.filter(m => m.menu_item_id === itemId);
    return toppingGroups.filter(g => itemMappings.some(m => m.topping_group_id === g.id));
  };

  // Filter items by selected category
  const filteredItems = useMemo(() => {
    if (!selectedCategory) {
      return []; // No category selected yet, show nothing until default is set
    }
    
    const categoryMappings = mappings.filter(m => m.menu_category_id === selectedCategory);
    return items.filter(item => 
      categoryMappings.some(m => m.menu_item_id === item.id)
    );
  }, [items, mappings, selectedCategory]);

  const getCategoryItemCount = (categoryId: string) => {
    return mappings.filter(m => m.menu_category_id === categoryId).length;
  };

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsFormOpen(true);
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    const itemCategoryMappings = mappings.filter(m => m.menu_item_id === item.id);
    const itemCustomMappings = customizationMappings.filter(m => m.menu_item_id === item.id);
    const itemToppingMappings = toppingMappings.filter(m => m.menu_item_id === item.id);
    setFormData({
      name: item.name,
      price: toDisplayValue(item.price),
      image_url: item.image_url || '',
      category_ids: itemCategoryMappings.map(m => m.menu_category_id),
      customization_group_ids: itemCustomMappings.map(m => m.customization_group_id),
      topping_group_ids: itemToppingMappings.map(m => m.topping_group_id),
    });
    setIsFormOpen(true);
  };

  const openDeleteDialog = (item: MenuItem) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const handleCustomizationGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      customization_group_ids: prev.customization_group_ids.includes(groupId)
        ? prev.customization_group_ids.filter(id => id !== groupId)
        : [...prev.customization_group_ids, groupId],
    }));
  };

  const handleToppingGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      topping_group_ids: prev.topping_group_ids.includes(groupId)
        ? prev.topping_group_ids.filter(id => id !== groupId)
        : [...prev.topping_group_ids, groupId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: t('toast.error'), description: t('validation.nameRequired'), variant: 'destructive' });
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: t('toast.error'), description: t('validation.priceRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let itemId = editingItem?.id;

      if (editingItem) {
        const response = await menuCompatibility.updateItem(editingItem.id, {
          name: formData.name.trim(),
          price: normalizeInput(priceNum),
          image_url: formData.image_url.trim() || null,
        });
        if (response.error) throw new Error(response.error);
      } else {
        const response = await menuCompatibility.createItem({
          name: formData.name.trim(),
          price: normalizeInput(priceNum),
          image_url: formData.image_url.trim() || undefined,
        });
        if (response.error) throw new Error(response.error);
        itemId = response.data?.id;
      }

      // Update category mappings
      if (itemId) {
        const currentCatMappings = mappings.filter(m => m.menu_item_id === itemId);
        const currentCategoryIds = currentCatMappings.map(m => m.menu_category_id);
        
        // Remove old category mappings
        for (const mapping of currentCatMappings) {
          if (!formData.category_ids.includes(mapping.menu_category_id)) {
            await menuCompatibility.deleteMenuItemCategoryMapping(mapping.id);
          }
        }
        
        // Add new category mappings
        for (const categoryId of formData.category_ids) {
          if (!currentCategoryIds.includes(categoryId)) {
            await menuCompatibility.createMenuItemCategoryMapping({
              menu_item_id: itemId,
              menu_category_id: categoryId,
            });
          }
        }

        // Update customization group mappings
        const currentCustomMappings = customizationMappings.filter(m => m.menu_item_id === itemId);
        const currentCustomGroupIds = currentCustomMappings.map(m => m.customization_group_id);

        // Remove old customization mappings
        for (const mapping of currentCustomMappings) {
          if (!formData.customization_group_ids.includes(mapping.customization_group_id)) {
            await menuCompatibility.deleteMenuItemCustomizationMapping(mapping.id);
          }
        }

        // Add new customization mappings
        for (const groupId of formData.customization_group_ids) {
          if (!currentCustomGroupIds.includes(groupId)) {
            await menuCompatibility.createMenuItemCustomizationMapping({
              menu_item_id: itemId,
              customization_group_id: groupId,
            });
          }
        }

        // Update topping group mappings
        const currentToppingMappings = toppingMappings.filter(m => m.menu_item_id === itemId);
        const currentToppingGroupIds = currentToppingMappings.map(m => m.topping_group_id);

        // Remove old topping mappings
        for (const mapping of currentToppingMappings) {
          if (!formData.topping_group_ids.includes(mapping.topping_group_id)) {
            await menuCompatibility.deleteMenuItemToppingMapping(mapping.id);
          }
        }

        // Add new topping mappings
        for (const groupId of formData.topping_group_ids) {
          if (!currentToppingGroupIds.includes(groupId)) {
            await menuCompatibility.createMenuItemToppingMapping({
              menu_item_id: itemId,
              topping_group_id: groupId,
            });
          }
        }
      }

      toast({ title: t('toast.success'), description: editingItem ? t('toast.menuItemUpdated') : t('toast.menuItemCreated') });
      setIsFormOpen(false);
      fetchData();
      refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      const response = await menuCompatibility.deleteItem(deletingItem.id);
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.menuItemDeleted') });
      setIsDeleteOpen(false);
      fetchData();
      refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToDelete'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItemRow = (item: MenuItem) => (
    <TableRow key={item.id}>
      <TableCell>
        <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            <img 
              src={resolveImageUrl(item.image_url)} 
              alt={item.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground/50" />
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="font-semibold text-primary">{format(item.price)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getItemCategories(item.id).map((cat) => (
            <Badge key={cat.id} variant="secondary" className="text-xs">
              {cat.name}
            </Badge>
          ))}
          {getItemCategories(item.id).length === 0 && (
            <span className="text-muted-foreground text-xs">{t('admin.menuItems.none')}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {getItemCustomizationGroups(item.id).map((group) => (
            <Badge key={group.id} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {group.name}
            </Badge>
          ))}
          {getItemToppingGroups(item.id).map((group) => (
            <Badge key={group.id} variant="outline" className="text-xs bg-accent text-accent-foreground border-accent/50">
              {group.name}
            </Badge>
          ))}
          {getItemCustomizationGroups(item.id).length === 0 && getItemToppingGroups(item.id).length === 0 && (
            <span className="text-muted-foreground text-xs">{t('admin.menuItems.none')}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditForm(item)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => openDeleteDialog(item)} 
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="w-24">{t('admin.menuItems.image')}</TableHead>
        <TableHead>{t('admin.menuItems.name')}</TableHead>
        <TableHead className="w-24">{t('admin.menuItems.price')}</TableHead>
        <TableHead className="w-40">{t('admin.menuItems.categories')}</TableHead>
        <TableHead className="w-80">{t('admin.menuItems.customizations')}</TableHead>
        <TableHead className="w-24 text-right">{t('admin.menuItems.actions')}</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.menuItems.title')}</h1>
          <p className="text-muted-foreground">{t('admin.menuItems.description')}</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('admin.menuItems.add')}
        </Button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium 
              whitespace-nowrap transition-colors
              ${selectedCategory === category.id 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }
            `}
          >
            {category.name}
            <Badge variant="secondary" className="ml-1 bg-background/20">{getCategoryItemCount(category.id)}</Badge>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border rounded-lg bg-card">
          {t('admin.menuItems.noCategoryItems')}
        </div>
      ) : (
        <div className="border rounded-lg bg-card">
          <Table>
            {renderTableHeader()}
            <TableBody>
              {filteredItems.map(renderItemRow)}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="admin-crud-dialog sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? t('admin.menuItems.edit') : t('admin.menuItems.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="admin-crud-dialog-body space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.name')}</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin.menuItems.enterName')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.price')} ({CURRENCY_SYMBOL})</label>
              <Input
                type="number"
                step={getMinorUnit() === 0 ? '1' : '0.01'}
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={getMinorUnit() === 0 ? '0' : '0.00'}
              />
            </div>
            <ImageUpload
              type="menu"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.categories')}</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.category_ids.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
                {categories.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">{t('admin.menuItems.noCategories')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.customizationGroups')}</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {customizationGroups.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.customization_group_ids.includes(group.id)}
                      onCheckedChange={() => handleCustomizationGroupToggle(group.id)}
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
                {customizationGroups.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">{t('admin.menuItems.noCustomGroups')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('admin.menuItems.toppingGroups')}</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {toppingGroups.map((group) => (
                  <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.topping_group_ids.includes(group.id)}
                      onCheckedChange={() => handleToppingGroupToggle(group.id)}
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
                {toppingGroups.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">{t('admin.menuItems.noToppingGroups')}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="admin-crud-dialog-footer">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="admin-crud-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.menuItems.delete')}</DialogTitle>
          </DialogHeader>
          <div className="admin-crud-dialog-body py-4">
            <p className="text-muted-foreground">
              {t('admin.menuItems.deleteConfirm')} <span className="font-medium text-foreground">{deletingItem?.name}</span>? {t('admin.menuItems.deleteWarning')}
            </p>
          </div>
          <DialogFooter className="admin-crud-dialog-footer">
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
