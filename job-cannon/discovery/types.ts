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
  alreadyQueued?: boolean;
};

export type DiscoverSearchInput = {
  keywords?: string[];
  sources?: ("remotive" | "remoteok" | "arbeitnow" | "jobicy")[];
  limit?: number;
};

export type FeedSource = NonNullable<DiscoverSearchInput["sources"]>[number];

export type DiscoverSearchResult = {
  jobs: DiscoveredJob[];
  sources: Record<FeedSource, boolean>;
  keywords: string[];
  fetchedAt: string;
};
