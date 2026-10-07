import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import connectDB from '../db/index.js';
import Admin from '../models/admin.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import PortfolioConfig from '../models/portfolioConfig.model.js';
import ConfigVersion from '../models/configVersion.model.js';

import authRoutes from '../routes/auth.routes.js';
import profileRoutes from '../routes/profile.routes.js';
import projectRoutes from '../routes/project.routes.js';
import portfolioConfigRoutes from '../routes/portfolioConfig.routes.js';
import aiRoutes from '../routes/ai.routes.js';
import errorHandler from '../middleware/errorHandler.js';

import {
    DEFAULT_PORTFOLIO_CONFIG,
    validatePortfolioConfig,
} from '../schemas/portfolioConfig.schema.js';
import { generatePolishedBio } from '../services/ai.service.js';
import { extractGitHubData } from '../services/githubImport.service.js';

describe('🚀 Comprehensive End-to-End Regression Test Suite', () => {
    let server;
    let baseUrl;
    let testAdmin;
    let validToken;
    let app;

    before(async () => {
        await connectDB();

        // Find or create test admin
        testAdmin = await Admin.findOne({ username: 'umaisrehman' });
        if (!testAdmin) {
            testAdmin = await Admin.findOne();
        }
        assert.ok(testAdmin, 'Test admin must exist in database');

        // Generate valid JWT token for test admin
        validToken = jwt.sign(
            { id: testAdmin._id, email: testAdmin.email, username: testAdmin.username },
            process.env.ACCESS_JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Spin up isolated Express test server
        app = express();
        app.use(express.json());

        app.use('/api/auth', authRoutes);
        app.use('/api/profile', profileRoutes);
        app.use('/api/projects', projectRoutes);
        app.use('/api/portfolio-config', portfolioConfigRoutes);
        app.use('/api/ai', aiRoutes);
        app.use(errorHandler);

        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}/api`;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await mongoose.disconnect();
    });

    // 1. PUBLIC PROFILE & PORTFOLIO REGRESSION
    describe('1. Public Portfolio APIs', () => {
        test('GET /profile/public/:username returns 200 for existing user', async () => {
            const res = await fetch(`${baseUrl}/profile/public/${testAdmin.username}`);
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.profile);
            assert.ok(data.profile.name);
        });

        test('GET /profile/public/:username returns 404 for non-existent user', async () => {
            const res = await fetch(`${baseUrl}/profile/public/definitely_not_a_real_user_xyz_99`);
            assert.equal(res.status, 404);
            const data = await res.json();
            assert.equal(data.success, false);
            assert.equal(data.errorCode, 'USER_NOT_FOUND');
        });

        test('GET /projects/public/:username returns 200 with projects array', async () => {
            const res = await fetch(`${baseUrl}/projects/public/${testAdmin.username}`);
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(Array.isArray(data.projects));
        });

        test('GET /portfolio-config/public/:username returns 200 with valid config', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/public/${testAdmin.username}`);
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.config);
            assert.equal(data.config.version, 1);
            assert.ok(data.config.theme?.preset);
            assert.ok(Array.isArray(data.config.sections));
        });

        test('GET /portfolio-config/public/:username returns 404 for unknown user', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/public/unknown_user_9999`);
            assert.equal(res.status, 404);
            const data = await res.json();
            assert.equal(data.success, false);
        });
    });

    // 2. AUTHENTICATION & SECURITY GUARDRAILS
    describe('2. Auth & Security Middleware Guardrails', () => {
        test('Draft config endpoint rejects request without Authorization header (401)', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/draft`);
            assert.equal(res.status, 401);
        });

        test('Draft config endpoint rejects request with invalid JWT token (403)', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/draft`, {
                headers: { Authorization: 'Bearer invalid_garbage_token_123' },
            });
            assert.equal(res.status, 403);
        });

        test('AI chat endpoint rejects unauthenticated request (401)', async () => {
            const res = await fetch(`${baseUrl}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hello' }),
            });
            assert.equal(res.status, 401);
        });

        test('Protected endpoint accepts valid admin Bearer token (200)', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/draft`, {
                headers: { Authorization: `Bearer ${validToken}` },
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.draft);
        });
    });

    // 3. DECLARATIVE SCHEMA VALIDATION & CONFIG LIFECYCLE
    describe('3. Portfolio Config Schema & Lifecycle', () => {
        test('Default config strictly passes Zod validation', () => {
            const result = validatePortfolioConfig(DEFAULT_PORTFOLIO_CONFIG);
            assert.equal(result.ok, true);
            assert.equal(result.config.theme.preset, 'midnight');
        });

        test('Schema rejects illegal theme preset', () => {
            const invalid = {
                ...DEFAULT_PORTFOLIO_CONFIG,
                theme: { preset: 'neon_pink_unsupported' },
            };
            const result = validatePortfolioConfig(invalid);
            assert.equal(result.ok, false);
            assert.ok(result.issues.length > 0);
        });

        test('Schema rejects duplicate sections', () => {
            const duplicate = {
                ...DEFAULT_PORTFOLIO_CONFIG,
                sections: [
                    { id: 'hero', enabled: true },
                    { id: 'hero', enabled: true },
                ],
            };
            const result = validatePortfolioConfig(duplicate);
            assert.equal(result.ok, false);
        });

        test('PUT /portfolio-config/draft saves valid configuration', async () => {
            const updated = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_CONFIG));
            updated.theme.preset = 'emerald';
            updated.animation.style = 'ambient';

            const res = await fetch(`${baseUrl}/portfolio-config/draft`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ config: updated }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.equal(data.draft.theme.preset, 'emerald');
            assert.equal(data.draft.animation.style, 'ambient');
        });

        test('PUT /portfolio-config/draft rejects invalid schema payload (400)', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/draft`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config: {
                        version: 99,
                        theme: { preset: 'invalid_theme' },
                    },
                }),
            });

            assert.equal(res.status, 400);
            const data = await res.json();
            assert.equal(data.success, false);
            assert.equal(data.errorCode, 'INVALID_CONFIG');
        });

        test('POST /portfolio-config/publish promotes draft to published and creates snapshot', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/publish`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ note: 'Automated Regression Test Publish' }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.published);
            assert.ok(data.versionId);

            // Verify snapshot exists in ConfigVersion collection
            const version = await ConfigVersion.findById(data.versionId);
            assert.ok(version);
            assert.equal(version.note, 'Automated Regression Test Publish');
        });

        test('GET /portfolio-config/versions returns past snapshot list', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/versions`, {
                headers: { Authorization: `Bearer ${validToken}` },
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(Array.isArray(data.versions));
            assert.ok(data.versions.length >= 1);
        });

        test('POST /portfolio-config/reset resets draft to default config', async () => {
            const res = await fetch(`${baseUrl}/portfolio-config/reset`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${validToken}` },
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.equal(data.draft.theme.preset, 'midnight');
            assert.equal(data.draft.animation.style, 'buddies');
        });
    });

    // 4. AI SERVICE & INTENT PROCESSING
    describe('4. AI Copilot, Bio Polish & GitHub Extract', () => {
        test('generatePolishedBio crafts senior-level paragraph from raw input', () => {
            const raw = 'me react aur node me kaam karta hu aur mujhe achi job chahye';
            const polished = generatePolishedBio(raw);
            assert.ok(polished.length > 50);
            assert.ok(polished.includes('Senior Full-Stack Engineer') || polished.includes('Full-Stack'));
            assert.ok(polished.includes('high-performance') || polished.includes('scalable'));
        });

        test('POST /ai/polish-bio returns polished summary', async () => {
            const res = await fetch(`${baseUrl}/ai/polish-bio`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rawText: 'i build frontend web apps with react' }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.polishedBio);
        });

        test('POST /ai/polish-bio rejects empty input (400)', async () => {
            const res = await fetch(`${baseUrl}/ai/polish-bio`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rawText: '' }),
            });

            assert.equal(res.status, 400);
        });

        test('POST /ai/chat responds intelligently to theme command', async () => {
            const res = await fetch(`${baseUrl}/ai/chat`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: 'Emerald theme lagao portfolio pe' }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.reply);
            if (data.proposedConfig) {
                assert.equal(data.proposedConfig.theme.preset, 'emerald');
            }
        });

        test('POST /ai/chat responds intelligently to bio polish request', async () => {
            const res = await fetch(`${baseUrl}/ai/chat`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: 'me node js aur express me rest api banata hu improve my bio' }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.reply);
            assert.ok(data.proposedBio);
        });

        test('extractGitHubData correctly extracts public profile for octocat', async () => {
            const data = await extractGitHubData('octocat');
            assert.equal(data.username.toLowerCase(), 'octocat');
            assert.ok(Array.isArray(data.skills));
            assert.ok(Array.isArray(data.suggestedProjects));
        });

        test('POST /ai/extract-github extracts data via endpoint', async () => {
            const res = await fetch(`${baseUrl}/ai/extract-github`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${validToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urlOrUsername: 'octocat' }),
            });

            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.ok(data.data);
            assert.equal(data.data.username.toLowerCase(), 'octocat');
        });
    });
});
