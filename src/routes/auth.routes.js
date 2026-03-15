import express from "express";
import { signupAdmin, loginAdmin, forgotPassword, resetPassword, logoutAdmin, refreshToken, checkAuth, updatePassword, updateUsername } from "../controllers/auth.controller.js";
import { authenticateAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signupAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/logout", logoutAdmin);
router.post("/refresh", refreshToken);
router.get("/check", authenticateAdmin, checkAuth);
router.put("/password", authenticateAdmin, updatePassword);
router.put("/username", authenticateAdmin, updateUsername);

export default router;
