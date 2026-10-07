import { z } from "zod";

/**
 * Portfolio Config Schema — SINGLE SOURCE OF TRUTH
 *
 * Every layout/theme/animation/heading customization a user (or the AI) makes
 * is expressed as this declarative JSON. The client renders from it; nothing
 * here is executable code. Any change to allowed values MUST be mirrored in:
 *   - client/src/config/portfolioConfig.ts
 *   - admin/src/config/portfolioConfig.ts
 */

export const SECTION_IDS = ["hero", "about", "projects", "whyHireMe", "resume", "contact"];
export const THEME_PRESETS = ["midnight", "emerald", "cyberpunk", "violet", "ocean"];
export const ANIMATION_STYLES = ["buddies", "ambient", "none"];
export const ANIMATION_INTENSITIES = ["calm", "normal", "lively"];

const optionalText = (max) => z.string().trim().max(max).optional();

const sectionSchema = z
    .object({
        id: z.enum(SECTION_IDS),
        enabled: z.boolean(),
        badge: optionalText(60),
        title: optionalText(120),
        highlight: optionalText(80),
        subtitle: optionalText(400),
    })
    .strict();

export const portfolioConfigSchema = z
    .object({
        version: z.literal(1),
        theme: z.object({ preset: z.enum(THEME_PRESETS) }).strict(),
        animation: z
            .object({
                style: z.enum(ANIMATION_STYLES),
                intensity: z.enum(ANIMATION_INTENSITIES),
            })
            .strict(),
        // Array order === render order on the public portfolio.
        sections: z
            .array(sectionSchema)
            .min(1)
            .max(SECTION_IDS.length)
            .refine((list) => new Set(list.map((s) => s.id)).size === list.length, {
                message: "Each section may appear only once",
            }),
    })
    .strict();

export const DEFAULT_PORTFOLIO_CONFIG = Object.freeze({
    version: 1,
    theme: { preset: "midnight" },
    animation: { style: "buddies", intensity: "normal" },
    sections: SECTION_IDS.map((id) => ({ id, enabled: true })),
});

/**
 * Validate an untrusted config (from the browser OR from an LLM).
 * Returns { ok: true, config } or { ok: false, issues }.
 */
export const validatePortfolioConfig = (input) => {
    const result = portfolioConfigSchema.safeParse(input);
    if (result.success) return { ok: true, config: result.data };
    return {
        ok: false,
        issues: result.error.issues.map((i) => `${i.path.join(".") || "config"}: ${i.message}`),
    };
};
