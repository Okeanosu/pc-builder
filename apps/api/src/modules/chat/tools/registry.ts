import type { AppDeps } from '../../../deps';
import { findProductsByIds, toProductSummary } from '../../../lib/products';
import { createBuildsService } from '../../builds';
import { createCatalogService, isUuid } from '../../catalog';
import { createCompatibilityService } from '../../compatibility';
import { createRecommendationService } from '../../recommendation';
import {
  createCheckCompatibilityTool,
  createProductDetailsTool,
  createSearchProductsTool,
} from './catalog-tools';
import { createModifyBuildTool } from './modify-build';
import { createRecommendBuildsTool } from './recommend-builds';
import { createBuildRequestStore } from './recommendation-runner';
import type { ChatTool, ToolRegistry } from './types';

/** The five advisor tools over the real backend services. */
export function createToolRegistry(deps: AppDeps): ToolRegistry {
  const recommendation = createRecommendationService(deps);
  const catalog = createCatalogService(deps);
  const compatibility = createCompatibilityService(deps);
  const builds = createBuildsService(deps);
  const requests = createBuildRequestStore(deps.redis);
  const recommend = recommendation.recommend;

  const tools: ChatTool[] = [
    createRecommendBuildsTool({ recommend, requests, getProduct: catalog.getById }),
    createSearchProductsTool({ search: catalog.search }),
    createProductDetailsTool({ getProduct: catalog.getById }),
    createCheckCompatibilityTool({
      check: (ids) => compatibility.check(ids),
      findProducts: async (ids) =>
        (await findProductsByIds(deps.db, ids.filter(isUuid))).map(toProductSummary),
    }),
    createModifyBuildTool({ recommend, requests, getBuild: builds.get, getProduct: catalog.getById }),
  ];
  return new Map(tools.map((t) => [t.decl.name, t]));
}
