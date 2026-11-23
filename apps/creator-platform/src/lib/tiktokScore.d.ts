export type TikTokVideoMetrics = {
  id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  shareRate: number;
  commentRate: number;
  accountRelativeScore: number;
};
export type TikTokScoreReport = {
  accountScore: number | null;
  videos: TikTokVideoMetrics[];
  evidence: string;
  baseline?: { views: number; engagementRate: number; shareRate: number };
  limitations?: string[];
};
export function scoreTikTokVideos(videos: Array<{
  id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}>): TikTokScoreReport;
