/**
 * Transparent account-relative scoring. Only TikTok-returned counters are treated as
 * platform evidence; retention, watch time, completion and traffic sources remain unknown.
 */
export function scoreTikTokVideos(videos) {
  const valid = videos.filter((v) =>
    Number.isFinite(v.views) && Number.isFinite(v.likes) &&
    Number.isFinite(v.comments) && Number.isFinite(v.shares)
  );
  if (!valid.length) return { accountScore: null, videos: [], evidence: "No complete TikTok video metrics are available." };

  const rates = valid.map((v) => ({
    ...v,
    engagementRate: v.views > 0 ? ((v.likes + v.comments + v.shares) / v.views) * 100 : 0,
    shareRate: v.views > 0 ? (v.shares / v.views) * 100 : 0,
    commentRate: v.views > 0 ? (v.comments / v.views) * 100 : 0,
  }));
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const baseline = {
    views: median(rates.map((v) => v.views)),
    engagementRate: median(rates.map((v) => v.engagementRate)),
    shareRate: median(rates.map((v) => v.shareRate)),
  };
  const scored = rates.map((video) => {
    const relative = (value, typical) => typical > 0 ? Math.max(0, Math.min(2, value / typical)) : value > 0 ? 2 : 0;
    const viewsSignal = relative(video.views, baseline.views);
    const engagementSignal = relative(video.engagementRate, baseline.engagementRate);
    const shareSignal = relative(video.shareRate, baseline.shareRate);
    const score = Math.round(Math.min(100, (viewsSignal * 35 + engagementSignal * 40 + shareSignal * 25) / 2));
    return { ...video, accountRelativeScore: score };
  }).sort((a, b) => b.accountRelativeScore - a.accountRelativeScore);

  const accountScore = Math.round(median(scored.map((v) => v.accountRelativeScore)));
  return {
    accountScore,
    baseline,
    videos: scored,
    evidence: `Compared ${valid.length} connected posts against this account's median views, engagement rate and share rate. This is an account-relative diagnostic, not a viral prediction.`,
    limitations: ["TikTok Display API counters do not include average watch time, retention curve, completion rate, traffic source or follower conversion per video.", "A single snapshot cannot show how quickly a post is gaining views; refresh over time to build a trend."],
  };
}
