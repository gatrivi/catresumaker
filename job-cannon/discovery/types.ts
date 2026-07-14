export type DiscoveredJob = {
  discoverId: string;
  title: string;
  company: string;
  url?: string;
  description: string;
  source: string;
  publishedAt?: string;
  location?: string;
  tags?: string[];
  previewFit?: number;
  matchedSkills?: string[];
  alreadyQueued?: boolean;
};

export type DiscoverSearchInput = {
  keywords?: string[];
  sources?: ("remotive" | "remoteok" | "arbeitnow" | "jobicy")[];
  limit?: number;
  /** When true, rank/filter using resume + candidate profile */
  matchProfile?: boolean;
  /** Min profile fit score (0–10) when matchProfile is on */
  minFit?: number;
};

export type FeedSource = NonNullable<DiscoverSearchInput["sources"]>[number];

export type DiscoverSearchResult = {
  jobs: DiscoveredJob[];
  sources: Record<FeedSource, boolean>;
  keywords: string[];
  fetchedAt: string;
  matchProfile?: boolean;
  minFit?: number;
  profile?: { title: string; skillCount: number; hasResume: boolean };
};
