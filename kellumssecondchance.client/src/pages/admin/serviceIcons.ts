/**
 * The icons a service may use, in plain language.
 *
 * The keys have to match the registry in `components/ui/Icon.tsx` — an unknown
 * key falls back to the hammer rather than breaking the page, but a dropdown of
 * real options means nobody has to know that a bathroom is "shower-head".
 */
export const SERVICE_ICONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'chef-hat', label: 'Kitchen' },
  { value: 'shower-head', label: 'Bathroom' },
  { value: 'layers', label: 'Basement / levels' },
  { value: 'grid-3x3', label: 'Flooring / tiling' },
  { value: 'hammer', label: 'Carpentry' },
  { value: 'ruler', label: 'Trim and measuring' },
  { value: 'paint-roller', label: 'Painting and finishing' },
  { value: 'door-open', label: 'Doors and openings' },
  { value: 'trees', label: 'Decks and outdoor' },
  { value: 'wrench', label: 'Repairs' },
  { value: 'key-round', label: 'Rental turnover' },
  { value: 'home', label: 'Whole home' },
  { value: 'hard-hat', label: 'Structural work' },
  { value: 'shield-check', label: 'Safety and compliance' },
  { value: 'sparkles', label: 'Finishing touches' },
  { value: 'compass', label: 'Design and planning' },
];
