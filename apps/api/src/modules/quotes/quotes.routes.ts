import { type Response, Router } from 'express';
import type { AppDeps } from '../../deps';
import { handler } from '../../lib/http';
import { cartOwnerOf } from '../cart/cart.service';
import { createQuotesService } from './quotes.service';

function sendPdf(res: Response, pdf: Buffer, filename: string) {
  // The page CSP from helmet targets HTML; on a PDF it can stop the browser's built-in viewer.
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(pdf);
}

export function createQuotesRouter(deps: AppDeps): Router {
  const router = Router();
  const svc = createQuotesService(deps);

  router.get(
    '/quotes/builds/:id.pdf',
    handler(async (req, res) => {
      const id = String(req.params.id);
      sendPdf(res, await svc.buildQuote(id), `bao-gia-${id}.pdf`);
    }),
  );

  router.get(
    '/quotes/cart.pdf',
    handler(async (req, res) => {
      sendPdf(res, await svc.cartQuote(cartOwnerOf(req)), 'bao-gia-gio-hang.pdf');
    }),
  );

  return router;
}
