import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Check, Plus, Minus, Loader2, X } from 'lucide-react';
import type { MenuItem, Customization, CustomizationGroup, OrderItemTopping, ToppingGroup, ToppingOption } from '@/types/pos';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { getMenuCompatibilityProvider } from '@/lib/compatibility/menu';
// Toast removed - order panel provides visual feedback

interface CustomizationPanelProps {
  item: MenuItem;
  linkedGroupIds: string[];
  linkedToppingGroupIds: string[];
  onConfirm: (customizations: Customization[], toppings: OrderItemTopping[], quantity: number) => void;
  onAdd?: (customizations: Customization[], toppings: OrderItemTopping[], quantity: number) => void;
  onBack: () => void;
  editMode?: boolean;
  initialCustomizations?: Customization[];
  initialToppings?: OrderItemTopping[];
  initialQuantity?: number;
}

interface ToppingGroupWithOptions extends ToppingGroup {
  options: ToppingOption[];
}

const menuCompatibility = getMenuCompatibilityProvider();

export function CustomizationPanel({ 
  item, 
  linkedGroupIds, 
  linkedToppingGroupIds,
  onConfirm,
  onAdd,
  onBack,
  editMode = false,
  initialCustomizations = [],
  initialToppings = [],
  initialQuantity = 1,
}: CustomizationPanelProps) {
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);
  const [toppingGroups, setToppingGroups] = useState<ToppingGroupWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [toppingQuantities, setToppingQuantities] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(initialQuantity);

  const { formatPrice } = useCurrency();
  const { t } = useTranslation();

  // Stable key for initialCustomizations to prevent useEffect re-runs
  const initialCustomizationsKey = useMemo(
    () => JSON.stringify(initialCustomizations),
    [initialCustomizations]
  );

  const initialToppingsKey = useMemo(
    () => JSON.stringify(initialToppings),
    [initialToppings]
  );

  // Fetch customization groups and topping groups from API
  useEffect(() => {
    async function loadData() {
      try {
        // Load customization groups
        const groupsWithOptions = await Promise.all(
          linkedGroupIds.map(async (groupId) => {
            const [groupResult, optionsResult] = await Promise.all([
              menuCompatibility.getCustomizationGroupById(groupId),
              menuCompatibility.getCustomizationOptionsByGroup(groupId),
            ]);

            const groupData = groupResult.data;
            const optionsData = optionsResult.data || [];

            if (!groupData) return null;

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

        // Load topping groups
        const toppingsWithOptions = await Promise.all(
          linkedToppingGroupIds.map(async (groupId) => {
            const [groupResult, optionsResult] = await Promise.all([
              menuCompatibility.getToppingGroupById(groupId),
              menuCompatibility.getToppingOptionsByGroup(groupId),
            ]);

            const groupData = groupResult.data;
            const optionsData = optionsResult.data || [];

            if (!groupData) return null;

            return {
              ...groupData,
              options: optionsData.sort((a, b) => a.sort_order - b.sort_order),
            } as ToppingGroupWithOptions;
          })
        );

        const validGroups = groupsWithOptions.filter((g): g is CustomizationGroup => g !== null);
        const validToppingGroups = toppingsWithOptions.filter((g): g is ToppingGroupWithOptions => g !== null);
        
        setGroups(validGroups);
        setToppingGroups(validToppingGroups);

        // Initialize customization selections
        const initialSelections: Record<string, string[]> = {};
        validGroups.forEach(group => {
          if (editMode && initialCustomizations.length > 0) {
            const matchingIds = initialCustomizations
              .filter(c => c.group === group.name)
              .map(c => c.id);
            initialSelections[group.name] = matchingIds;
          } else if (group.type === 'single' && group.default_option_id) {
            initialSelections[group.name] = [group.default_option_id];
          } else {
            initialSelections[group.name] = [];
          }
        });
        setSelections(initialSelections);

        // Initialize topping quantities
        const initialToppingQty: Record<string, number> = {};
        validToppingGroups.forEach(group => {
          group.options.forEach(option => {
            if (editMode && initialToppings.length > 0) {
              const existingTopping = initialToppings.find(t => t.topping_option_id === option.id);
              initialToppingQty[option.id] = existingTopping?.quantity || option.min_quantity;
            } else {
              initialToppingQty[option.id] = option.min_quantity;
            }
          });
        });
        setToppingQuantities(initialToppingQty);
      } catch (err) {
        console.error('Failed to load customizations:', err);
        setGroups([]);
        setToppingGroups([]);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    loadData();
  }, [linkedGroupIds, linkedToppingGroupIds, editMode, initialCustomizationsKey, initialToppingsKey]);

  const handleSelect = (groupName: string, optionId: string, type: 'single' | 'multiple', required: boolean) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      const isCurrentlySelected = current.includes(optionId);

      if (type === 'single') {
        if (isCurrentlySelected && !required) {
          return { ...prev, [groupName]: [] };
        }
        return { ...prev, [groupName]: [optionId] };
      } else {
        if (isCurrentlySelected) {
          return { ...prev, [groupName]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [groupName]: [...current, optionId] };
        }
      }
    });
  };

  const handleToppingQuantityChange = (optionId: string, delta: number, option: ToppingOption) => {
    setToppingQuantities(prev => {
      const current = prev[optionId] || option.min_quantity;
      let newValue = current + (delta * option.step_quantity);
      
      // Clamp to min/max
      newValue = Math.max(option.min_quantity, newValue);
      if (option.max_quantity !== null) {
        newValue = Math.min(option.max_quantity, newValue);
      }
      
      return { ...prev, [optionId]: newValue };
    });
  };

  const handleToppingSelect = (optionId: string, option: ToppingOption) => {
    const currentQty = toppingQuantities[optionId] || option.min_quantity;
    if (currentQty === 0) {
      // First click: set to 1 (or min_quantity + step if min > 0)
      const initialQty = Math.max(1, option.min_quantity + option.step_quantity);
      setToppingQuantities(prev => ({
        ...prev,
        [optionId]: initialQty
      }));
    }
  };

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

  const buildToppings = (): OrderItemTopping[] => {
    const toppings: OrderItemTopping[] = [];

    toppingGroups.forEach(group => {
      group.options.forEach(option => {
        const qty = toppingQuantities[option.id] || 0;
        if (qty > 0) {
          toppings.push({
            topping_option_id: option.id,
            name: option.label,
            unit_label: option.unit_label,
            unit_price: option.unit_price,
            quantity: qty,
            total_price: option.unit_price * qty,
          });
        }
      });
    });

    return toppings;
  };

  const handleConfirm = () => {
    const customizations = buildCustomizations();
    const toppings = buildToppings();
    onConfirm(customizations, toppings, quantity);
  };

  const handleAdd = () => {
    const customizations = buildCustomizations();
    const toppings = buildToppings();
    
    if (onAdd) {
      onAdd(customizations, toppings, quantity);
      setQuantity(1);
      // Reset topping quantities to min
      const resetToppingQty: Record<string, number> = {};
      toppingGroups.forEach(group => {
        group.options.forEach(option => {
          resetToppingQty[option.id] = option.min_quantity;
        });
      });
      setToppingQuantities(resetToppingQty);
      // Visual feedback provided by order panel
    } else {
      onConfirm(customizations, toppings, quantity);
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

    let toppingTotal = 0;
    toppingGroups.forEach(group => {
      group.options.forEach(option => {
        const qty = toppingQuantities[option.id] || 0;
        toppingTotal += option.unit_price * qty;
      });
    });

    return (item.price + customTotal + toppingTotal) * quantity;
  }, [groups, selections, toppingGroups, toppingQuantities, item.price, quantity]);

  const isValid = useMemo(() => {
    // Check customization requirements
    for (const group of groups) {
      if (group.required) {
        const selectedIds = selections[group.name] || [];
        if (selectedIds.length === 0) {
          return false;
        }
      }
    }
    // Check topping requirements
    for (const group of toppingGroups) {
      if (group.required) {
        const hasAnyTopping = group.options.some(opt => (toppingQuantities[opt.id] || 0) > 0);
        if (!hasAnyTopping) {
          return false;
        }
      }
    }
    return true;
  }, [groups, selections, toppingGroups, toppingQuantities]);

  const isGroupMissingSelection = (group: CustomizationGroup) => {
    if (!group.required) return false;
    const selectedIds = selections[group.name] || [];
    return selectedIds.length === 0;
  };

  const isToppingGroupMissingSelection = (group: ToppingGroupWithOptions) => {
    if (!group.required) return false;
    return !group.options.some(opt => (toppingQuantities[opt.id] || 0) > 0);
  };

  const formatToppingQuantity = (option: ToppingOption, qty: number) => {
    if (option.unit_label === 'qty') {
      return `x${qty}`;
    }
    return `${qty} ${option.unit_label}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="mt-4 text-muted-foreground">{t('menu.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background animate-fade-in">
      {/* Header with Back button + Item name */}
      <div className="p-4 border-b border-border flex items-center gap-4">
        <button
          onClick={onBack}
          className="pos-btn h-12 px-4 gap-2 bg-secondary text-secondary-foreground rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('customization.back')}
        </button>
        <div className="flex-1 flex items-baseline gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{item.name}</h2>
          <p className="text-base font-semibold text-muted-foreground">{formatPrice(item.price)}</p>
        </div>
      </div>

      {/* Scrollable customization options */}
      <div className="flex-1 pos-scroll p-6 space-y-6">
        {groups.length === 0 && toppingGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">{t('menu.noOptions')}</p>
        ) : (
          <>
            {/* Customization Groups */}
            {groups.map(group => (
              <div key={group.id || group.name}>
                <h3 className={`font-medium mb-3 flex items-center gap-2 ${isGroupMissingSelection(group) ? 'text-destructive' : ''}`}>
                  {group.name}
                  {group.required && (
                    <span className={`text-xs ${isGroupMissingSelection(group) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                      *{t('customization.required')}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
            ))}

            {/* Topping Groups */}
            {toppingGroups.length > 0 && (
              <>
                {groups.length > 0 && <hr className="border-border" />}
                {toppingGroups.map(group => (
                  <div key={group.id}>
                    <h3 className={`font-medium mb-3 flex items-center gap-2 ${isToppingGroupMissingSelection(group) ? 'text-destructive' : ''}`}>
                      {group.name}
                      {group.required && (
                        <span className={`text-xs ${isToppingGroupMissingSelection(group) ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          *{t('customization.required')}
                        </span>
                      )}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {group.options.map(option => {
                        const qty = toppingQuantities[option.id] || 0;
                        const isSelected = qty > 0;
                        const atMin = qty <= option.min_quantity;
                        const atMax = option.max_quantity !== null && qty >= option.max_quantity;
                        
                        return (
                          <div
                            key={option.id}
                            className={`rounded-xl border-2 transition-all overflow-hidden ${
                              isSelected 
                                ? 'bg-accent/10 border-accent' 
                                : 'bg-secondary border-transparent hover:border-muted-foreground/20'
                            }`}
                          >
                            {/* Clickable header - always visible */}
                            <button
                              onClick={() => handleToppingSelect(option.id, option)}
                              className={`w-full p-3 text-left ${isSelected ? 'cursor-default' : ''}`}
                              disabled={isSelected}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground truncate">{option.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                +{formatPrice(option.unit_price)}/{option.unit_label}
                              </span>
                            </button>
                            
                            {/* Quantity controls - only visible when selected */}
                            {isSelected && (
                              <div className="px-3 pb-3 pt-1 border-t border-border/50 animate-fade-in">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleToppingQuantityChange(option.id, -1, option)}
                                    disabled={atMin}
                                    className={`pos-btn w-9 h-9 rounded-lg transition-all ${
                                      atMin 
                                        ? 'bg-muted text-muted-foreground opacity-40' 
                                        : 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                                    }`}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  
                                  <span className="font-semibold text-sm flex-1 text-center">
                                    {formatToppingQuantity(option, qty)}
                                  </span>
                                  
                                  <button
                                    onClick={() => handleToppingQuantityChange(option.id, 1, option)}
                                    disabled={atMax}
                                    className={`pos-btn w-9 h-9 rounded-lg transition-all ${
                                      atMax 
                                        ? 'bg-muted text-muted-foreground opacity-40' 
                                        : 'bg-accent/20 text-accent hover:bg-accent/30'
                                    }`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Fixed footer - single line with quantity + add button */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="pos-btn w-12 h-12 rounded-lg bg-secondary text-secondary-foreground"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-10 text-center text-xl font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="pos-btn w-12 h-12 rounded-lg bg-secondary text-secondary-foreground"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Add/Update Button - takes remaining space */}
          <button
            onClick={editMode ? handleConfirm : handleAdd}
            disabled={!isValid}
            className={`flex-1 pos-btn py-4 rounded-xl font-semibold text-lg shadow-md transition-all ${
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
