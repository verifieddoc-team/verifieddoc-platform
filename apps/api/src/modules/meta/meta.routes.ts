import { Router } from "express";
import { listIndustries } from "../../lib/industries.js";

export const metaRouter = Router();

metaRouter.get("/industries", (_req, res) => {
  res.status(200).json({
    industries: listIndustries()
  });
});
