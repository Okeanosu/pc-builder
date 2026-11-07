import type { RequestHandler } from 'express';
import { ipSubject, rateLimit, visitorSubject } from '../../lib/rate-limit';
import type { Redis } from '../../lib/redis';

export const RECOMMENDATION_RATE_LIMIT = 20;
/** Shared by everyone behind one address, so rotating the guest cookie cannot lift the per-visitor cap. */
export const RECOMMENDATION_IP_RATE_LIMIT = 60;

export function recommendationRateLimit(redis: Redis): RequestHandler {
  return rateLimit(
    redis,
    [
      { scope: 'reco', limit: RECOMMENDATION_RATE_LIMIT, subject: visitorSubject },
      { scope: 'reco-ip', limit: RECOMMENDATION_IP_RATE_LIMIT, subject: ipSubject },
    ],
    'Bạn yêu cầu gợi ý quá nhanh, vui lòng thử lại sau ít phút',
  );
}
