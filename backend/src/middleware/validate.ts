import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../lib/errors";

// Validates req.body against a zod schema and replaces it with the parsed
// (typed, defaulted) value. Keeps controllers free of manual checks.
export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => e.message).join(" — ");
        next(AppError.badRequest(message, "VALIDATION_ERROR"));
      } else {
        next(err);
      }
    }
  };
}
