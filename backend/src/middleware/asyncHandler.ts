import { NextFunction, Request, Response } from "express";

// Wraps an async route handler so thrown errors/rejections reach the
// central error middleware instead of crashing the process.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
