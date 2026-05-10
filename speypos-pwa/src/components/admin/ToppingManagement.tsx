import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Layers } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toppingGroupApi, toppingOptionApi } from '@/lib/api';
import type { ToppingGroup, ToppingOption } from '@/types/pos';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface GroupFormData {
  name: string;
  required: boolean;
  sort_order: string;
}

interface OptionFormData {
  label: string;
  unit_label: string;
  unit_price: string;
  min_quantity: string;
  max_quantity: string;
  step_quantity: string;
  sort_order: string;
}

const initialGroupForm: GroupFormData = {
  name: '',
  required: false,
  sort_order: '0',
};

const initialOptionForm: OptionFormData = {
  label: '',
  unit_label: 'qty',
  unit_price: '0',
  min_quantity: '0',
  max_quantity: '',
  step_quantity: '1',
  sort_order: '0',
};

const UNIT_LABELS = ['qty', 'shot', 'ml', 'g', 'oz'];

export function ToppingManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refresh: refreshMenuContext } = useMenu();
  const { format, normalizeInput, toDisplayValue, symbol: CURRENCY_SYMBOL } = useCurrency();
  const [groups, setGroups] = useState<ToppingGroup[]>([]);
  const [options, setOptions] = useState<ToppingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected group for viewing options
  const [selectedGroup, setSelectedGroup] = useState<ToppingGroup | null>(null);

  // Group dialog state
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isGroupDeleteOpen, setIsGroupDeleteOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ToppingGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<ToppingGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<GroupFormData>(initialGroupForm);

  // Option dialog state
  const [isOptionFormOpen, setIsOptionFormOpen] = useState(false);
  const [isOptionDeleteOpen, setIsOptionDeleteOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ToppingOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<ToppingOption | null>(null);
  const [optionFormData, setOptionFormData] = useState<OptionFormData>(initialOptionForm);

  const fetchData = async () => {
    setIsLoading(true);
    const [groupsRes, optionsRes] = await Promise.all([
      toppingGroupApi.getAll(),
      toppingOptionApi.getAll(),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data.sort((a, b) => a.sort_order - b.sort_order));
    if (optionsRes.data) setOptions(optionsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getGroupOptions = (groupId: string) => {
    return options.filter(o => o.topping_group_id === groupId).sort((a, b) => a.sort_order - b.sort_order);
  };

  // Group handlers
  const openCreateGroupForm = () => {
    setEditingGroup(null);
    setGroupFormData(initialGroupForm);
    setIsGroupFormOpen(true);
  };

  const openEditGroupForm = (group: ToppingGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      required: group.required,
      sort_order: group.sort_order.toString(),
    });
    setIsGroupFormOpen(true);
  };

  const openDeleteGroupDialog = (group: ToppingGroup) => {
    setDeletingGroup(group);
    setIsGroupDeleteOpen(true);
  };

  const handleGroupSubmit = async () => {
    if (!groupFormData.name.trim()) {
      toast({ title: t('toast.error'), description: t('validation.nameRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGroup) {
        const response = await toppingGroupApi.update(editingGroup.id, {
          name: groupFormData.name.trim(),
          required: groupFormData.required,
          sort_order: parseInt(groupFormData.sort_order, 10),
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.groupUpdated') });
      } else {
        const response = await toppingGroupApi.create({
          name: groupFormData.name.trim(),
          required: groupFormData.required,
          sort_order: parseInt(groupFormData.sort_order, 10),
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.groupCreated') });
      }
      setIsGroupFormOpen(false);
      fetchData();
      refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupDelete = async () => {
    if (!deletingGroup) return;

    setIsSubmitting(true);
    try {
      const response = await toppingGroupApi.delete(deletingGroup.id);
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.groupDeleted') });
      setIsGroupDeleteOpen(false);
      if (selectedGroup?.id === deletingGroup.id) {
        setSelectedGroup(null);
      }
      fetchData();
      refreshMenuContext();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToDelete'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option handlers
  const openCreateOptionForm = () => {
    setEditingOption(null);
    setOptionFormData(initialOptionForm);
    setIsOptionFormOpen(true);
  };

  const openEditOptionForm = (option: ToppingOption) => {
    setEditingOption(option);
    setOptionFormData({
      label: option.label,
      unit_label: option.unit_label,
      unit_price: toDisplayValue(option.unit_price),
      min_quantity: option.min_quantity.toString(),
      max_quantity: option.max_quantity?.toString() || '',
      step_quantity: option.step_quantity.toString(),
      sort_order: option.sort_order.toString(),
    });
    setIsOptionFormOpen(true);
  };

  const openDeleteOptionDialog = (option: ToppingOption) => {
    setDeletingOption(option);
    setIsOptionDeleteOpen(true);
  };

  const handleOptionSubmit = async () => {
    if (!selectedGroup) return;
    if (!optionFormData.label.trim()) {
      toast({ title: t('toast.error'), description: t('validation.labelRequired'), variant: 'destructive' });
      return;
    }

    const unitPrice = parseFloat(optionFormData.unit_price);
    if (isNaN(unitPrice)) {
      toast({ title: t('toast.error'), description: t('validation.priceRequired'), variant: 'destructive' });
      return;
    }

    const minQty = parseFloat(optionFormData.min_quantity) || 0;
    const maxQty = optionFormData.max_quantity ? parseFloat(optionFormData.max_quantity) : null;
    const stepQty = parseFloat(optionFormData.step_quantity) || 1;

    setIsSubmitting(true);
    try {
      if (editingOption) {
        const response = await toppingOptionApi.update(editingOption.id, {
          label: optionFormData.label.trim(),
          unit_label: optionFormData.unit_label,
          unit_price: normalizeInput(unitPrice),
          min_quantity: minQty,
          max_quantity: maxQty,
          step_quantity: stepQty,
          sort_order: parseInt(optionFormData.sort_order, 10),
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.optionUpdated') });
      } else {
        const response = await toppingOptionApi.create({
          topping_group_id: selectedGroup.id,
          label: optionFormData.label.trim(),
          unit_label: optionFormData.unit_label,
          unit_price: normalizeInput(unitPrice),
          min_quantity: minQty,
          max_quantity: maxQty,
          step_quantity: stepQty,
          sort_order: parseInt(optionFormData.sort_order, 10),
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.optionCreated') });
      }
      setIsOptionFormOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSave'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionDelete = async () => {
    if (!deletingOption) return;

    setIsSubmitting(true);
    try {
      const response = await toppingOptionApi.delete(deletingOption.id);
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.optionDeleted') });
      setIsOptionDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToDelete'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGroupOptions = selectedGroup ? getGroupOptions(selectedGroup.id) : [];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.toppings.title')}</h1>
          <p className="text-muted-foreground">{t('admin.toppings.description')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Groups Panel */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">{t('admin.toppings.groups')}</h2>
              <Button size="sm" onClick={openCreateGroupForm} className="gap-1">
                <Plus className="w-4 h-4" />
                {t('admin.toppings.addGroup')}
              </Button>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 flex items-center justify-between ${
                    selectedGroup?.id === group.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                      {group.required && (
                        <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">{t('common.required')}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getGroupOptions(group.id).length} {t('admin.toppings.options').toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); openEditGroupForm(group); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); openDeleteGroupDialog(group); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {t('admin.toppings.noGroups')}
                </div>
              )}
            </div>
          </div>

          {/* Options Panel */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">
                {selectedGroup ? `${selectedGroup.name} ${t('admin.toppings.options')}` : t('admin.toppings.selectGroup')}
              </h2>
              {selectedGroup && (
                <Button size="sm" onClick={openCreateOptionForm} className="gap-1">
                  <Plus className="w-4 h-4" />
                  {t('admin.toppings.addOption')}
                </Button>
              )}
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {selectedGroup ? (
                selectedGroupOptions.length > 0 ? (
                  selectedGroupOptions.map((option) => (
                    <div key={option.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground">{option.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(option.unit_price)}/{option.unit_label}
                          {option.max_quantity !== null && ` • ${t('admin.toppings.maxQuantity')}: ${option.max_quantity}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditOptionForm(option)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteOptionDialog(option)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    {t('admin.toppings.noOptions')}
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Layers className="w-12 h-12 opacity-30" />
                  <p>{t('admin.toppings.selectGroupHint')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Create/Edit Dialog */}
      <Dialog open={isGroupFormOpen} onOpenChange={setIsGroupFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? t('admin.toppings.editGroup') : t('admin.toppings.createGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.menuItems.name')}</Label>
              <Input
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                placeholder={t('admin.toppings.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.sortOrder')}</Label>
              <Input
                type="number"
                value={groupFormData.sort_order}
                onChange={(e) => setGroupFormData({ ...groupFormData, sort_order: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="required"
                checked={groupFormData.required}
                onCheckedChange={(checked) => setGroupFormData({ ...groupFormData, required: !!checked })}
              />
              <Label htmlFor="required">{t('common.required')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleGroupSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingGroup ? t('common.update') : t('common.create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Delete Dialog */}
      <Dialog open={isGroupDeleteOpen} onOpenChange={setIsGroupDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.toppings.deleteGroup')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.toppings.deleteGroupConfirm')}
          </p>
          <p className="text-sm text-destructive">
            {t('admin.toppings.deleteGroupWarning')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleGroupDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Create/Edit Dialog */}
      <Dialog open={isOptionFormOpen} onOpenChange={setIsOptionFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? t('admin.toppings.editOption') : t('admin.toppings.addOption')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.toppings.label')}</Label>
              <Input
                value={optionFormData.label}
                onChange={(e) => setOptionFormData({ ...optionFormData, label: e.target.value })}
                placeholder={t('admin.toppings.labelPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.toppings.unitLabel')}</Label>
                <Select
                  value={optionFormData.unit_label}
                  onValueChange={(v) => setOptionFormData({ ...optionFormData, unit_label: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_LABELS.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.toppings.unitPrice')} ({CURRENCY_SYMBOL})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={optionFormData.unit_price}
                  onChange={(e) => setOptionFormData({ ...optionFormData, unit_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('admin.toppings.minQuantity')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={optionFormData.min_quantity}
                  onChange={(e) => setOptionFormData({ ...optionFormData, min_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.toppings.maxQuantity')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder={t('admin.toppings.unlimited')}
                  value={optionFormData.max_quantity}
                  onChange={(e) => setOptionFormData({ ...optionFormData, max_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.toppings.stepQuantity')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={optionFormData.step_quantity}
                  onChange={(e) => setOptionFormData({ ...optionFormData, step_quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.categories.sortOrder')}</Label>
              <Input
                type="number"
                value={optionFormData.sort_order}
                onChange={(e) => setOptionFormData({ ...optionFormData, sort_order: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOptionFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleOptionSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingOption ? t('common.update') : t('common.create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Delete Dialog */}
      <Dialog open={isOptionDeleteOpen} onOpenChange={setIsOptionDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.toppings.deleteOption')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.toppings.deleteOptionConfirm')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOptionDeleteOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleOptionDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
