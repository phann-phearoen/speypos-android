import { useState, useEffect, useMemo } from 'react';
import { X, Check, Plus, Minus, Loader2 } from 'lucide-react';
import type { MenuItem, Customization, CustomizationGroup } from '@/types/pos';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { customizationGroupApi, customizationOptionApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface CustomizationModalProps {
  item: MenuItem;
  linkedGroupIds: string[];
  onConfirm: (customizations: Customization[], quantity: number) => void;
  onAdd?: (customizations: Customization[], quantity: number) => void; // For add mode (stays open)
  onClose: () => void;
  // Edit mode props
  editMode?: boolean;
  initialCustomizations?: Customization[];
  initialQuantity?: number;
}

export function CustomizationModal({ 
  item, 
  linkedGroupIds, 
  onConfirm,
  onAdd,
  onClose,
  editMode = false,
  initialCustomizations = [],
  initialQuantity = 1,
}: CustomizationModalProps) {
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(initialQuantity);

  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  // Stable key for initialCustomizations to prevent useEffect re-runs
  const initialCustomizationsKey = useMemo(
    () => JSON.stringify(initialCustomizations),
    [initialCustomizations]
  );

  // Fetch customization groups and options from API
  useEffect(() => {
    async function loadCustomizations() {
      if (linkedGroupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      try {
        const groupsWithOptions = await Promise.all(
          linkedGroupIds.map(async (groupId) => {
            const [groupResult, optionsResult] = await Promise.all([
              customizationGroupApi.getById(groupId),
              customizationOptionApi.getByGroup(groupId),
            ]);

            const groupData = groupResult.data;
            const optionsData = optionsResult.data || [];

            if (!groupData) return null;

            // Determine default option: use backend default_option_id or fallback to first option
            const defaultOptionId = groupData.default_option_id;

            return {
              id: groupData.id,
              name: groupData.name,
              type: groupData.selection_type as 'single' | 'multiple',
              required: groupData.required,
              default_option_id: defaultOptionId,
              options: optionsData
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((opt) => ({
                  id: opt.id,
                  name: opt.label,
                  price: opt.price_delta,
                  group: groupData.name,
                  isDefault: opt.id === defaultOptionId,
                })),
            } as CustomizationGroup;
          })
        );

        const validGroups = groupsWithOptions.filter((g): g is CustomizationGroup => g !== null);
        setGroups(validGroups);

        // Initialize selections - use initialCustomizations if in edit mode, otherwise use defaults
        const initialSelections: Record<string, string[]> = {};
        validGroups.forEach(group => {
          if (editMode && initialCustomizations.length > 0) {
            // In edit mode, pre-select options that match initialCustomizations
            const matchingIds = initialCustomizations
              .filter(c => c.group === group.name)
              .map(c => c.id);
            initialSelections[group.name] = matchingIds;
          } else if (group.type === 'single' && group.default_option_id) {
            // Default: use backend-defined defaults for single selection
            initialSelections[group.name] = [group.default_option_id];
          } else {
            initialSelections[group.name] = [];
          }
        });
        setSelections(initialSelections);
      } catch (err) {
        console.error('Failed to load customizations:', err);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }

    loadCustomizations();
  }, [linkedGroupIds, editMode, initialCustomizationsKey]);

  const handleSelect = (groupName: string, optionId: string, type: 'single' | 'multiple', required: boolean) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      const isCurrentlySelected = current.includes(optionId);

      if (type === 'single') {
        // For single-select: toggle off if clicking the same option (only for non-required)
        if (isCurrentlySelected && !required) {
          return { ...prev, [groupName]: [] };
        }
        return { ...prev, [groupName]: [optionId] };
      } else {
        // For multi-select: toggle on/off
        if (isCurrentlySelected) {
          return { ...prev, [groupName]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [groupName]: [...current, optionId] };
        }
      }
    });
  };

  // Build customizations from current selections
  const buildCustomizations = (): Customization[] => {
    const customizations: Customization[] = [];
    
    groups.forEach(group => {
      const selectedIds = selections[group.name] || [];
      group.options.forEach(option => {
        if (selectedIds.includes(option.id)) {
          customizations.push({
            id: option.id,
            name: option.name,
            price: option.price,
            group: group.name,
          });
        }
      });
    });

    return customizations;
  };

  // Edit mode: confirm and close
  const handleConfirm = () => {
    const customizations = buildCustomizations();
    onConfirm(customizations, quantity);
  };

  // Add mode: add item but keep modal open
  const handleAdd = () => {
    const customizations = buildCustomizations();
    
    if (onAdd) {
      onAdd(customizations, quantity);
      // Reset quantity to 1, keep selections intact
      setQuantity(1);
      // Show feedback toast
      toast({
        title: t('customization.itemAdded'),
        duration: 1500,
      });
    } else {
      // Fallback to original behavior if onAdd not provided
      onConfirm(customizations, quantity);
    }
  };

  const calculateTotal = useMemo(() => {
    let customTotal = 0;
    groups.forEach(group => {
      const selectedIds = selections[group.name] || [];
      group.options.forEach(option => {
        if (selectedIds.includes(option.id)) {
          customTotal += option.price;
        }
      });
    });
    return (item.price + customTotal) * quantity;
  }, [groups, selections, item.price, quantity]);

  // Validation: check if all required groups have at least one selection
  const isValid = useMemo(() => {
    for (const group of groups) {
      if (group.required) {
        const selectedIds = selections[group.name] || [];
        if (selectedIds.length === 0) {
          return false;
        }
      }
    }
    return true;
  }, [groups, selections]);

  // Helper to check if a specific group is missing required selection
  const isGroupMissingSelection = (group: CustomizationGroup) => {
    if (!group.required) return false;
    const selectedIds = selections[group.name] || [];
    return selectedIds.length === 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 animate-scale-in">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground">{t('menu.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground">{formatPrice(item.price)}</p>
          </div>
          <button
            onClick={onClose}
            className="pos-btn w-10 h-10 rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Groups */}
        <div className="p-4 space-y-6 max-h-[50vh] pos-scroll">
          {groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{t('menu.noOptions')}</p>
          ) : (
            groups.map(group => (
              <div key={group.id || group.name}>
                <h3 className={`font-medium mb-3 flex items-center gap-2 ${isGroupMissingSelection(group) ? 'text-destructive' : ''}`}>
                  {group.name}
                  {group.required && (
                    <span className={`text-xs ${isGroupMissingSelection(group) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      *{t('customization.required')}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {group.options.map(option => {
                    const isSelected = (selections[group.name] || []).includes(option.id);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelect(group.name, option.id, group.type, group.required)}
                        className={`
                          pos-btn py-3 px-4 rounded-xl text-left transition-all
                          ${isSelected 
                            ? 'bg-accent text-accent-foreground border-2 border-accent' 
                            : 'bg-secondary text-secondary-foreground border-2 border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.name}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                        {option.price > 0 && (
                          <span className="text-xs opacity-70">+{formatPrice(option.price)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          {/* Quantity */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">{t('customization.quantity')}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="pos-btn w-10 h-10 rounded-lg bg-secondary text-secondary-foreground"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-10 text-center text-xl font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="pos-btn w-10 h-10 rounded-lg bg-secondary text-secondary-foreground"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Add/Update Button */}
          <button
            onClick={editMode ? handleConfirm : handleAdd}
            disabled={!isValid}
            className={`w-full pos-btn py-4 rounded-xl font-semibold text-lg shadow-md transition-all ${
              isValid 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            }`}
          >
            {editMode ? t('customization.updateItem') : t('customization.addToOrder')} - {formatPrice(calculateTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
