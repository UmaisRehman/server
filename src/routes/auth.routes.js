import express from "express";
import { loginAdmin, verifyOTP, logoutAdmin, refreshToken, checkAuth, updatePassword } from "../controllers/auth.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/verify-otp", verifyOTP);
router.post("/logout", logoutAdmin);
router.post("/refresh", refreshToken);
router.get("/check", authenticateAdmin, checkAuth);
router.put("/password", authenticateAdmin, updatePassword);

export default router;
