import {
    DEFAULT_PORTFOLIO_CONFIG,
    SECTION_IDS,
    THEME_PRESETS,
    ANIMATION_STYLES,
    ANIMATION_INTENSITIES,
    validatePortfolioConfig,
} from "../schemas/portfolioConfig.schema.js";

/**
 * Clean heuristic bio polish generator for offline or instant results.
 */
export const generatePolishedBio = (rawText) => {
    const text = rawText.trim();
    if (!text) return "";

    // If text mentions typical tech terms
    const hasReact = /react/i.test(text);
    const hasNode = /node/i.test(text);
    const hasFullstack = /full\s*stack/i.test(text) || (hasReact && hasNode);
    const hasPython = /python/i.test(text);

    let role = "Full-Stack Software Engineer";
    if (hasFullstack) role = "Senior Full-Stack Engineer";
    else if (hasReact) role = "Frontend Architecture Specialist";
    else if (hasPython) role = "Software & AI Solutions Engineer";

    return `Passionate ${role} dedicated to designing high-performance web architectures, responsive distributed applications, and sleek interactive interfaces. Experienced in modern full-cycle engineering, translating complex business requirements into elegant, scalable software.`;
};

/**
 * Intelligent deterministic analyzer when Gemini API key is omitted or during offline development.
 */
const fallbackHeuristicAI = (message, currentConfig, currentProfile) => {
    const lower = message.toLowerCase();
    let proposedConfig = null;
    let proposedBio = null;
    let action = null;
    let reply = "";

    // 1. Theme intent
    for (const preset of THEME_PRESETS) {
        if (lower.includes(preset) || (lower.includes("theme") && lower.includes(preset))) {
            const updated = JSON.parse(JSON.stringify(currentConfig || DEFAULT_PORTFOLIO_CONFIG));
            updated.theme = { preset };
            const valid = validatePortfolioConfig(updated);
            if (valid.ok) {
                proposedConfig = valid.config;
                action = "UPDATE_THEME";
                reply = `Maine theme ko **${preset.toUpperCase()}** preset par set kar diya hai! Aap preview mein live look check kar sakte hain aur "Publish" par click karke live kar sakte hain.`;
                return { reply, proposedConfig, action };
            }
        }
    }

    // 2. Animation intent
    if (lower.includes("animation") || lower.includes("buddies") || lower.includes("ambient") || lower.includes("intensity")) {
        const updated = JSON.parse(JSON.stringify(currentConfig || DEFAULT_PORTFOLIO_CONFIG));
        if (lower.includes("ambient") || lower.includes("particles") || lower.includes("cosmos")) {
            updated.animation.style = "ambient";
        } else if (lower.includes("none") || lower.includes("off") || lower.includes("band")) {
            updated.animation.style = "none";
        } else if (lower.includes("buddies") || lower.includes("robot") || lower.includes("characters")) {
            updated.animation.style = "buddies";
        }

        if (lower.includes("lively") || lower.includes("fast") || lower.includes("tez")) {
            updated.animation.intensity = "lively";
        } else if (lower.includes("calm") || lower.includes("slow") || lower.includes("halka")) {
            updated.animation.intensity = "calm";
        } else if (lower.includes("normal")) {
            updated.animation.intensity = "normal";
        }

        const valid = validatePortfolioConfig(updated);
        if (valid.ok) {
            proposedConfig = valid.config;
            action = "UPDATE_ANIMATION";
            reply = `Animation configuration ko style: **${updated.animation.style}** aur intensity: **${updated.animation.intensity}** par update kar diya gaya hai. Live preview check karein!`;
            return { reply, proposedConfig, action };
        }
    }

    // 3. Section hide / show / reorder intent
    if (lower.includes("hide") || lower.includes("disable") || lower.includes("show") || lower.includes("enable") || lower.includes("hatao")) {
        const updated = JSON.parse(JSON.stringify(currentConfig || DEFAULT_PORTFOLIO_CONFIG));
        let affectedSection = null;

        for (const sId of SECTION_IDS) {
            if (lower.includes(sId.toLowerCase()) || (sId === "whyHireMe" && (lower.includes("hire") || lower.includes("why")))) {
                affectedSection = sId;
                break;
            }
        }

        if (affectedSection) {
            const shouldDisable = lower.includes("hide") || lower.includes("disable") || lower.includes("hatao");
            updated.sections = updated.sections.map((s) =>
                s.id === affectedSection ? { ...s, enabled: !shouldDisable } : s
            );
            const valid = validatePortfolioConfig(updated);
            if (valid.ok) {
                proposedConfig = valid.config;
                action = "UPDATE_SECTIONS";
                reply = `Section **${affectedSection}** ko ${shouldDisable ? "hide (disable)" : "enable"} kar diya gaya hai.`;
                return { reply, proposedConfig, action };
            }
        }
    }

    // 4. Bio polish intent
    if (
        lower.includes("bio") ||
        lower.includes("paragraph") ||
        lower.includes("about") ||
        lower.includes("kaam karta") ||
        lower.includes("react") ||
        lower.includes("job") ||
        lower.includes("improve") ||
        lower.includes("correct") ||
        message.length > 50
    ) {
        proposedBio = generatePolishedBio(message);
        action = "UPDATE_BIO";
        reply = `Aapka raw draft dekh kar maine isay **Senior Software Engineer** standard ke mutabiq professional and impact-driven bana diya hai:\n\n> "${proposedBio}"\n\nKia main isay aapke profile ke **About Section** mein update kar doon? Aap neechay diye gaye button par click karke direct apply kar sakte hain.`;
        return { reply, proposedBio, action };
    }

    // 5. Default conversational helpful response
    reply = `Main aapka Portfolio AI Copilot hoon! Aap mujhse yeh kaam karwa sakte hain:\n\n1. **Bio & Content Polish**: Apna paragraph ya raw experience likhein, main senior level copy bana doonga.\n2. **Themes & Styling**: Kahiye *"Theme ko emerald karo"* ya *"Cyberpunk theme lagao"*.\n3. **Animations**: Kahiye *"Animation buddies ko lively karo"* ya *"Ambient style lagao"*.\n4. **Layout & Sections**: Sections ko hide/show karein (e.g. *"Resume section hide karo"*).\n5. **GitHub Auto-import**: Apna GitHub username ya profile URL bhejein, main aapke skills aur top projects auto-detect kar loonga!`;

    return { reply };
};

/**
 * Main service to process AI chat with Gemini (if key present) or fallback gracefully.
 */
export const processAiMessage = async ({
    message,
    history = [],
    currentConfig = DEFAULT_PORTFOLIO_CONFIG,
    currentProfile = null,
    currentProjects = [],
}) => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return fallbackHeuristicAI(message, currentConfig, currentProfile);
    }

    try {
        const systemPrompt = `You are an elite Senior Principal Software Architect and Portfolio Copilot for a modern developer portfolio platform.
You assist developers in:
1. Polishing raw bios into high-impact, professional senior-level summaries.
2. Answering general technical, architecture, and portfolio questions concisely and friendly (support Urdu/Roman-Urdu and English).
3. Customizing the developer's portfolio layout, theme, and animations using declarative configuration.

AVAILABLE PLATFORM SPECS:
- THEMES: ${JSON.stringify(THEME_PRESETS)} (midnight, emerald, cyberpunk, violet, ocean)
- ANIMATION STYLES: ${JSON.stringify(ANIMATION_STYLES)} (buddies, ambient, none)
- ANIMATION INTENSITIES: ${JSON.stringify(ANIMATION_INTENSITIES)} (calm, normal, lively)
- SECTIONS (ordered): ${JSON.stringify(SECTION_IDS)} (hero, about, projects, whyHireMe, resume, contact)
Each section can have: { id, enabled: boolean, badge?: string, title?: string, highlight?: string, subtitle?: string }

CURRENT USER CONFIG:
${JSON.stringify(currentConfig)}

CURRENT USER PROFILE:
Name: ${currentProfile?.name || "Not set"}
Bio: ${currentProfile?.bio || "Not set"}
Skills: ${(currentProfile?.skills || []).join(", ") || "None"}

INSTRUCTIONS:
- If user requests bio improvement or provides draft text about themselves, provide a senior-level rewritten bio in "proposedBio" and explain the improvements in "reply".
- If user wants to change theme, animation, section order, section titles, or enable/disable sections, output the valid updated config in "proposedConfig" (must strictly follow the schema above).
- Keep "reply" natural, conversational, polite, and encouraging (in Roman Urdu or English matching the user).
- Always return a JSON object with:
{
  "reply": "Your response to the user",
  "proposedConfig": optional modified config object matching version 1 schema,
  "proposedBio": optional rewritten bio string,
  "action": optional action identifier like "UPDATE_THEME" | "UPDATE_ANIMATION" | "UPDATE_BIO" | "UPDATE_CONFIG"
}`;

        const conversationContents = [];

        // Add history
        if (Array.isArray(history)) {
            for (const item of history.slice(-6)) {
                if (item.sender === "user" || item.role === "user") {
                    conversationContents.push({ role: "user", parts: [{ text: item.text || item.message }] });
                } else if (item.sender === "ai" || item.role === "model") {
                    conversationContents.push({ role: "model", parts: [{ text: item.text || item.message }] });
                }
            }
        }

        conversationContents.push({ role: "user", parts: [{ text: message }] });

        // Call Gemini REST endpoint
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: conversationContents,
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: "application/json",
                },
            }),
        });

        clearTimeout(timeout);

        if (!geminiRes.ok) {
            console.warn("Gemini API returned error status:", geminiRes.status, "Falling back to heuristic AI.");
            return fallbackHeuristicAI(message, currentConfig, currentProfile);
        }

        const data = await geminiRes.json();
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawContent) {
            return fallbackHeuristicAI(message, currentConfig, currentProfile);
        }

        const parsed = JSON.parse(rawContent);

        // Security & Schema check: ensure proposedConfig is valid
        if (parsed.proposedConfig) {
            const validation = validatePortfolioConfig(parsed.proposedConfig);
            if (!validation.ok) {
                console.warn("Gemini proposed invalid config, rejecting proposedConfig:", validation.issues);
                delete parsed.proposedConfig;
            } else {
                parsed.proposedConfig = validation.config;
            }
        }

        return {
            reply: parsed.reply || "Done!",
            proposedConfig: parsed.proposedConfig || undefined,
            proposedBio: parsed.proposedBio || undefined,
            action: parsed.action || undefined,
        };
    } catch (err) {
        console.warn("Failed calling Gemini API:", err.message, "Using robust fallback.");
        return fallbackHeuristicAI(message, currentConfig, currentProfile);
    }
};
