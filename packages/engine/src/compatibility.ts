import { estimateWattage, RULES, recommendedPsuWattage, specsOf } from './rules';
import type {
  CompatibilityContext,
  CompatibilityIssue,
  CompatibilityReport,
  PartMap,
  RuleCode,
} from './types';

const RULE_ORDER: RuleCode[] = [
  'C01',
  'C02',
  'C03',
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
  'C10',
  'C11',
  'C12',
  'C13',
  'C14',
  'C15',
];

/** Runs every rule C01–C15 on a (possibly partial) build. Rules whose parts are missing are skipped. */
export function checkCompatibility(parts: PartMap, ctx: CompatibilityContext = {}): CompatibilityReport {
  const issues: CompatibilityIssue[] = [];
  for (const code of RULE_ORDER) issues.push(...RULES[code](parts, ctx));
  const estimatedWattage = estimateWattage(
    parts.cpu ? specsOf(parts.cpu, 'cpu').tdpW : 0,
    parts.gpu ? specsOf(parts.gpu, 'gpu').tgpW : 0,
  );
  return { issues, estimatedWattage, recommendedPsuWattage: recommendedPsuWattage(estimatedWattage) };
}
