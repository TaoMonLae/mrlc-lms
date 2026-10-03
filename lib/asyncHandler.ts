import type { RequestHandler } from 'express';

/** Express 4 does not forward rejected handler promises to error middleware. */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try { return Promise.resolve(handler(req, res, next)).catch(next); }
    catch (error) { next(error); }
  };
}
