import { Router } from "express";
import {
  fetchCommits,
  fetchPullRequests,
} from "../controllers/githubapi.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/commits", verifyJWT, fetchCommits);
router.get("/pullRequests", verifyJWT, fetchPullRequests);

export default router;
