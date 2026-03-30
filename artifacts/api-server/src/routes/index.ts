import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.js";
import faceRouter from "./face.js";
import coursesRouter from "./courses.js";
import aiRouter from "./ai.js";
import handsRouter from "./hands.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/face", faceRouter);
router.use(coursesRouter);
router.use("/ai", aiRouter);
router.use("/hands", handsRouter);

export default router;
