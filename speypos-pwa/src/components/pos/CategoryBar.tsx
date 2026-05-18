import { Coffee, Cake, IceCream, Soup, Package } from 'lucide-react';
import type { MenuCategory } from '@/types/pos';
import { triggerImpact } from '@/lib/feedback';

interface CategoryBarProps {
  categories: MenuCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  loading?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  coffee: <Coffee className="w-4 h-4" />,
  drinks: <IceCream className="w-4 h-4" />,
  food: <Soup className="w-4 h-4" />,
  pastry: <Cake className="w-4 h-4" />,
  default: <Package className="w-4 h-4" />,
};

export function CategoryBar({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  loading 
}: CategoryBarProps) {
  const getIcon = (name: string) => {
    const key = name.toLowerCase();
    for (const [keyword, icon] of Object.entries(categoryIcons)) {
      if (key.includes(keyword)) return icon;
    }
    return categoryIcons.default;
  };

  if (loading) {
    return (
      <nav className="bg-pos-sidebar border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-full bg-muted animate-pulse" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-20 rounded-full bg-muted/50 animate-pulse" />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-pos-sidebar border-b border-border px-4 py-3 flex-shrink-0">
      <div className="flex gap-2 pos-scroll-horizontal">
        {/* Category List */}
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => {
              triggerImpact('light');
              onSelectCategory(category.id);
            }}
            className={`category-tab-horizontal ${selectedCategory === category.id ? 'active' : ''}`}
          >
            {getIcon(category.name)}
            <span className="whitespace-nowrap">{category.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
