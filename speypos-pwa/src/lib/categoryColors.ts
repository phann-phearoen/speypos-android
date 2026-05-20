/**
 * Deterministically maps a category ID to a subtle pastel background color.
 */
export function getCategoryTint(categoryId: string | null): string {
  if (!categoryId) return 'transparent';

  // Available hues for variety (Pastel-friendly palette)
  const hues = [
    210, // Blue
    160, // Emerald/Teal
    45,  // Yellow/Orange
    15,  // Red/Coral
    280, // Purple
    330, // Pink
    120, // Green
    190, // Cyan
  ];

  // Hash the ID to pick a hue
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hues[Math.abs(hash) % hues.length];

  // Return HSL with low saturation and very high lightness for a "tint" effect
  // Adjust based on light/dark mode preference if needed, but for now 96% lightness is safe
  return `hsl(${hue} 70% 96%)`;
}

/**
 * Dark mode variant for category tints
 */
export function getCategoryTintDark(categoryId: string | null): string {
  if (!categoryId) return 'transparent';

  const hues = [210, 160, 45, 15, 280, 330, 120, 190];
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hues[Math.abs(hash) % hues.length];

  // Dark mode: low saturation, very dark (e.g., 15% lightness)
  return `hsl(${hue} 30% 12%)`;
}
