import { CATEGORY_LABELS, type CategoryKey } from '@pc/shared';

/** Category name inside a sentence: "card đồ họa", but acronyms stay as they are ("CPU", "RAM"). */
export function categoryInSentence(category: CategoryKey): string {
  const label = CATEGORY_LABELS[category];
  return label === label.toUpperCase() ? label : label.charAt(0).toLocaleLowerCase('vi') + label.slice(1);
}
