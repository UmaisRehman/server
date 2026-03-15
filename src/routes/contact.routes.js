import express from "express";
import { sendContactEmail } from "../controllers/contact.controller.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/:username", upload.single("attachment"), sendContactEmail);

export default router;
