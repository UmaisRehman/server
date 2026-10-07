/**
 * Service to import and analyze public GitHub profile & repositories.
 * Uses native fetch; works without auth token (60 req/hr), or with optional GITHUB_TOKEN (5000 req/hr).
 */

export const extractGitHubData = async (inputUrlOrUsername) => {
    let username = inputUrlOrUsername.trim();

    // Extract username if full URL was pasted (e.g. https://github.com/umaisrehman or github.com/umaisrehman)
    const urlMatch = username.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch && urlMatch[1]) {
        username = urlMatch[1];
    } else {
        username = username.replace(/^@/, "").replace(/\/.*$/, "");
    }

    if (!username || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        throw new Error("Invalid GitHub username or profile URL");
    }

    const headers = {
        "User-Agent": "Portfolio-AI-Studio/1.0",
        Accept: "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // 1. Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (!userRes.ok) {
        if (userRes.status === 404) {
            throw new Error(`GitHub user '${username}' not found.`);
        }
        if (userRes.status === 403) {
            throw new Error("GitHub API rate limit exceeded. Please try again shortly or add a GITHUB_TOKEN in server/.env.");
        }
        throw new Error(`GitHub API error: ${userRes.statusText}`);
    }
    const userData = await userRes.json();

    // 2. Fetch top public repos
    const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12&type=owner`,
        { headers }
    );
    const reposData = reposRes.ok ? await reposRes.json() : [];

    // Filter out forks if plenty of source repos exist
    const sourceRepos = reposData.filter((r) => !r.fork);
    const activeRepos = sourceRepos.length >= 3 ? sourceRepos : reposData;

    // Collect skills / languages
    const languageCounts = {};
    const topicsSet = new Set();

    activeRepos.forEach((repo) => {
        if (repo.language) {
            languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
        }
        if (Array.isArray(repo.topics)) {
            repo.topics.forEach((t) => topicsSet.add(t));
        }
    });

    const detectedSkills = [
        ...Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]),
        ...Array.from(topicsSet).slice(0, 8),
    ];

    // Format top projects for portfolio import
    const suggestedProjects = activeRepos.slice(0, 6).map((repo) => ({
        title: repo.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        tagline: repo.description || `Modern web application built with ${repo.language || "modern technologies"}.`,
        category: (repo.language || "Web").toLowerCase().includes("python")
            ? "ai"
            : (repo.language || "").toLowerCase().includes("react")
            ? "frontend"
            : "fullstack",
        technologies: [
            repo.language,
            ...(Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : []),
        ].filter(Boolean),
        githubUrl: repo.html_url,
        liveUrl: repo.homepage || "",
        stars: repo.stargazers_count,
        updatedAt: repo.updated_at,
    }));

    return {
        username: userData.login,
        name: userData.name || userData.login,
        bio: userData.bio || "",
        location: userData.location || "",
        avatarUrl: userData.avatar_url,
        blog: userData.blog || "",
        company: userData.company || "",
        publicReposCount: userData.public_repos,
        skills: detectedSkills.slice(0, 12),
        suggestedProjects,
    };
};
