import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Settings2, Star } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { customizationGroupApi, customizationOptionApi } from '@/lib/api';
import type { CustomizationOptionGroup, CustomizationOption } from '@/types/pos';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';

interface GroupFormData {
  name: string;
  selection_type: 'single' | 'multiple';
  required: boolean;
}

interface OptionFormData {
  label: string;
  price_delta: string;
  sort_order: string;
}

const initialGroupForm: GroupFormData = {
  name: '',
  selection_type: 'single',
  required: false,
};

const initialOptionForm: OptionFormData = {
  label: '',
  price_delta: '0',
  sort_order: '0',
};

export function CustomizationManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refresh: refreshMenuContext } = useMenu();
  const { format, normalizeInput, toDisplayValue, symbol: CURRENCY_SYMBOL, getMinorUnit } = useCurrency();
  const [groups, setGroups] = useState<CustomizationOptionGroup[]>([]);
  const [options, setOptions] = useState<CustomizationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected group for viewing options
  const [selectedGroup, setSelectedGroup] = useState<CustomizationOptionGroup | null>(null);

  // Group dialog state
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isGroupDeleteOpen, setIsGroupDeleteOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomizationOptionGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<CustomizationOptionGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState<GroupFormData>(initialGroupForm);

  // Option dialog state
  const [isOptionFormOpen, setIsOptionFormOpen] = useState(false);
  const [isOptionDeleteOpen, setIsOptionDeleteOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<CustomizationOption | null>(null);
  const [deletingOption, setDeletingOption] = useState<CustomizationOption | null>(null);
  const [optionFormData, setOptionFormData] = useState<OptionFormData>(initialOptionForm);

  const fetchData = async () => {
    setIsLoading(true);
    const [groupsRes, optionsRes] = await Promise.all([
      customizationGroupApi.getAll(),
      customizationOptionApi.getAll(),
    ]);

    if (groupsRes.data) setGroups(groupsRes.data);
    if (optionsRes.data) setOptions(optionsRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getGroupOptions = (groupId: string) => {
    return options.filter(o => o.customization_group_id === groupId);
  };

  // Group handlers
  const openCreateGroupForm = () => {
    setEditingGroup(null);
    setGroupFormData(initialGroupForm);
    setIsGroupFormOpen(true);
  };

  const openEditGroupForm = (group: CustomizationOptionGroup) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      selection_type: group.selection_type,
      required: group.required,
    });
    setIsGroupFormOpen(true);
  };

  const openDeleteGroupDialog = (group: CustomizationOptionGroup) => {
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
        const response = await customizationGroupApi.update(editingGroup.id, {
          name: groupFormData.name.trim(),
          selection_type: groupFormData.selection_type,
          required: groupFormData.required,
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.groupUpdated') });
      } else {
        const response = await customizationGroupApi.create({
          name: groupFormData.name.trim(),
          selection_type: groupFormData.selection_type,
          required: groupFormData.required,
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
      const response = await customizationGroupApi.delete(deletingGroup.id);
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

  const openEditOptionForm = (option: CustomizationOption) => {
    setEditingOption(option);
    setOptionFormData({
      label: option.label,
      price_delta: toDisplayValue(option.price_delta),
      sort_order: option.sort_order.toString(),
    });
    setIsOptionFormOpen(true);
  };

  const openDeleteOptionDialog = (option: CustomizationOption) => {
    setDeletingOption(option);
    setIsOptionDeleteOpen(true);
  };

  const handleOptionSubmit = async () => {
    if (!selectedGroup) return;
    if (!optionFormData.label.trim()) {
      toast({ title: t('toast.error'), description: t('validation.labelRequired'), variant: 'destructive' });
      return;
    }

    const priceDelta = parseFloat(optionFormData.price_delta);
    if (isNaN(priceDelta)) {
      toast({ title: t('toast.error'), description: t('validation.priceRequired'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingOption) {
        const response = await customizationOptionApi.update(editingOption.id, {
          label: optionFormData.label.trim(),
          price_delta: normalizeInput(priceDelta),
          sort_order: parseInt(optionFormData.sort_order, 10),
        });
        if (response.error) throw new Error(response.error);
        toast({ title: t('toast.success'), description: t('toast.optionUpdated') });
      } else {
        const response = await customizationOptionApi.create({
          customization_group_id: selectedGroup.id,
          label: optionFormData.label.trim(),
          price_delta: normalizeInput(priceDelta),
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
      const response = await customizationOptionApi.delete(deletingOption.id);
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

  const handleSetDefaultOption = async (optionId: string) => {
    if (!selectedGroup) return;

    setIsSubmitting(true);
    try {
      const response = await customizationGroupApi.update(selectedGroup.id, {
        default_option_id: optionId,
      });
      if (response.error) throw new Error(response.error);
      toast({ title: t('toast.success'), description: t('toast.defaultSet') });
      
      // Update local state
      setSelectedGroup({ ...selectedGroup, default_option_id: optionId });
      setGroups(groups.map(g => g.id === selectedGroup.id ? { ...g, default_option_id: optionId } : g));
    } catch (error) {
      toast({ title: t('toast.error'), description: t('toast.failedToSetDefault'), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGroupOptions = selectedGroup ? getGroupOptions(selectedGroup.id) : [];

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.customizations.title')}</h1>
          <p className="text-muted-foreground">{t('admin.customizations.description')}</p>
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
              <h2 className="font-semibold">{t('admin.customizations.optionGroups')}</h2>
              <Button size="sm" onClick={openCreateGroupForm} className="gap-1">
                <Plus className="w-4 h-4" />
                {t('admin.customizations.addGroup')}
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
                      {group.selection_type === 'single' ? t('admin.customizations.singleChoice') : t('admin.customizations.multipleChoice')} • {getGroupOptions(group.id).length} {t('admin.customizations.options').toLowerCase()}
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
                  {t('admin.customizations.noGroups')}
                </div>
              )}
            </div>
          </div>

          {/* Options Panel */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">
                {selectedGroup ? `${selectedGroup.name} ${t('admin.customizations.options')}` : t('admin.customizations.selectGroup')}
              </h2>
              {selectedGroup && (
                <Button size="sm" onClick={openCreateOptionForm} className="gap-1">
                  <Plus className="w-4 h-4" />
                  {t('admin.customizations.addOption')}
                </Button>
              )}
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {selectedGroup ? (
                selectedGroupOptions.length > 0 ? (
                  selectedGroupOptions.map((option) => (
                    <div key={option.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <h3 className="font-medium text-foreground">{option.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {option.price_delta === 0
                              ? t('admin.customizations.noExtraCharge')
                              : option.price_delta > 0
                              ? `+${format(option.price_delta)}`
                              : format(option.price_delta)}
                          </p>
                        </div>
                        {selectedGroup?.default_option_id === option.id && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t('admin.customizations.default')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefaultOption(option.id)}
                          disabled={selectedGroup?.default_option_id === option.id || isSubmitting}
                          title={t('admin.customizations.setAsDefault')}
                        >
                          <Star className={`w-4 h-4 ${selectedGroup?.default_option_id === option.id ? 'fill-primary text-primary' : ''}`} />
                        </Button>
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
                    {t('admin.customizations.noOptions')}
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Settings2 className="w-12 h-12 opacity-30" />
                  <p>{t('admin.customizations.selectGroupHint')}</p>
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
            <DialogTitle>{editingGroup ? t('admin.customizations.editGroup') : t('admin.customizations.createGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.menuItems.name')}</Label>
              <Input
                value={groupFormData.name}
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                placeholder={t('admin.customizations.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.customizations.selectionType')}</Label>
              <RadioGroup
                value={groupFormData.selection_type}
                onValueChange={(v) => setGroupFormData({ ...groupFormData, selection_type: v as 'single' | 'multiple' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">{t('admin.customizations.singleChoice')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="font-normal cursor-pointer">{t('admin.customizations.multipleChoice')}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={groupFormData.required}
                onCheckedChange={(checked) => setGroupFormData({ ...groupFormData, required: !!checked })}
              />
              <Label htmlFor="required" className="font-normal cursor-pointer">
                {t('common.required')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleGroupSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingGroup ? t('common.update') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Delete Dialog */}
      <Dialog open={isGroupDeleteOpen} onOpenChange={setIsGroupDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.customizations.deleteGroup')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.customizations.deleteGroupConfirm')} <span className="font-medium text-foreground">{deletingGroup?.name}</span>?
            {' '}{t('admin.customizations.deleteGroupWarning')}
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
            <DialogTitle>{editingOption ? t('admin.customizations.editOption') : t('admin.customizations.addOption')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.customizations.label')}</Label>
              <Input
                value={optionFormData.label}
                onChange={(e) => setOptionFormData({ ...optionFormData, label: e.target.value })}
                placeholder="e.g., Large, No Sugar, Oat Milk"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.customizations.priceDelta')} ({CURRENCY_SYMBOL})</Label>
              <Input
                type="number"
                step={getMinorUnit() === 0 ? '1' : '0.01'}
                value={optionFormData.price_delta}
                onChange={(e) => setOptionFormData({ ...optionFormData, price_delta: e.target.value })}
                placeholder={getMinorUnit() === 0 ? '0' : '0.00'}
              />
              <p className="text-xs text-muted-foreground">
                Use 0 for no extra charge, positive for add-ons, negative for discounts.
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.customizations.sortOrder')}</Label>
              <Input
                type="number"
                step="1"
                value={optionFormData.sort_order}
                onChange={(e) => setOptionFormData({ ...optionFormData, sort_order: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Options with lower sort order values appear first.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOptionFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleOptionSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingOption ? t('common.update') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Option Delete Dialog */}
      <Dialog open={isOptionDeleteOpen} onOpenChange={setIsOptionDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.customizations.deleteOption')}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {t('admin.customizations.deleteOptionConfirm')} <span className="font-medium text-foreground">{deletingOption?.label}</span>?
            {' '}{t('admin.customizations.deleteOptionWarning')}
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
