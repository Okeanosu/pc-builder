import { addCartItemSchema, updateCartItemSchema } from '@pc/shared';
import { Router } from 'express';
import type { AppDeps } from '../../deps';
import { handler, parseBody } from '../../lib/http';
import { cartOwnerOf, createCartService } from './cart.service';

export function createCartRouter(deps: AppDeps): Router {
  const router = Router();
  const cart = createCartService(deps);

  router.get(
    '/cart',
    handler(async (req, res) => {
      res.json(await cart.get(cartOwnerOf(req)));
    }),
  );

  router.post(
    '/cart/items',
    handler(async (req, res) => {
      const { productId, qty } = parseBody(addCartItemSchema, req);
      res.status(201).json(await cart.addItem(cartOwnerOf(req), productId, qty));
    }),
  );

  router.patch(
    '/cart/items/:id',
    handler(async (req, res) => {
      const { qty } = parseBody(updateCartItemSchema, req);
      res.json(await cart.updateItem(cartOwnerOf(req), String(req.params.id), qty));
    }),
  );

  router.delete(
    '/cart/items/:id',
    handler(async (req, res) => {
      res.json(await cart.removeItem(cartOwnerOf(req), String(req.params.id)));
    }),
  );

  router.post(
    '/cart/builds/:buildId',
    handler(async (req, res) => {
      res.status(201).json(await cart.addBuild(cartOwnerOf(req), String(req.params.buildId)));
    }),
  );

  return router;
}
