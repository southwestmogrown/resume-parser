import { NextRequest, NextResponse } from "next/server";
import type { GitHubProfile, GitHubRepo, GitHubProfileResponse } from "@/lib/types";
import { isRateLimited } from "@/lib/rateLimit";

export const maxDuration = 15;

interface GitHubUserAPI {
  login: string;
  bio: string | null;
  public_repos: number;
  followers: number;
}

interface GitHubRepoAPI {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
  fork: boolean;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req.headers, "github-profile", 20, 60_000)) {
    return NextResponse.json({ error: "Too many GitHub profile requests. Please wait a minute and try again." }, { status: 429 });
  }

  let body: { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { username } = body;
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const trimmed = username.trim().replace(/^@/, "");
  if (!trimmed || trimmed.length > 39) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    // Fetch user profile and repos in parallel
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "resume-parser-app",
    };

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}`, { headers }),
      fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}/repos?sort=stars&per_page=10&type=owner`, { headers }),
    ]);

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to fetch GitHub profile" }, { status: 502 });
    }

    const userData: GitHubUserAPI = await userRes.json();
    const reposData: GitHubRepoAPI[] = reposRes.ok ? await reposRes.json() : [];

    // Extract top languages from repos (exclude forks)
    const ownRepos = reposData.filter((r) => !r.fork);
    const languageCounts = new Map<string, number>();
    for (const repo of ownRepos) {
      if (repo.language) {
        languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
      }
    }
    const topLanguages = [...languageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lang]) => lang);

    const repos: GitHubRepo[] = ownRepos.slice(0, 6).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
    }));

    const profile: GitHubProfile = {
      username: trimmed,
      bio: userData.bio,
      publicRepos: userData.public_repos,
      followers: userData.followers,
      topLanguages,
      repos,
    };

    const response: GitHubProfileResponse = { profile };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to GitHub API" },
      { status: 502 }
    );
  }
}
