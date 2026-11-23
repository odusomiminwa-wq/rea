import { useEffect, useState } from "react";
import { scoreTikTokVideos } from "../lib/tiktokScore.js";

type TikTokVideo = {
  id: string; createdAt: number; coverImageUrl: string; shareUrl: string;
  description: string; duration: number; width: number; height: number;
  views: number; likes: number; comments: number; shares: number;
};
type Status = { connected: boolean; note?: string };
type VideoResponse = { videos: TikTokVideo[]; fetchedAt: string; source: string };

const number = (value: number) => new Intl.NumberFormat().format(value || 0);
const pct = (value: number) => value.toFixed(2) + "%";

export default function TikTokAccount() {
  const [status, setStatus] = useState<Status>({ connected: false });
  const [data, setData] = useState<VideoResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refreshStatus() {
    const response = await fetch("/api/tiktok/status");
    setStatus(await response.json());
  }
  async function loadVideos() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/tiktok/videos");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load TikTok videos.");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "TikTok request failed.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refreshStatus().then(() => {
      if (new URLSearchParams(window.location.search).get("tiktok") === "connected") {
        window.history.replaceState({}, "", window.location.pathname);
        void loadVideos();
      }
    }).catch(() => setError("CreatorForge API is not running."));
  }, []);

  const report = data ? scoreTikTokVideos(data.videos) : null;
  return (
    <section className="panel tiktok-panel">
      <div className="panel-heading">
        <div><span className="step-label">03 / CONNECTED ACCOUNT</span><h2>TikTok performance matrix</h2></div>
        <span className={"connection-pill " + (status.connected ? "connected" : "")}>{status.connected ? "Connected" : "Not connected"}</span>
      </div>
      <p className="tiktok-intro">Connect LUNA's TikTok account to compare real post results against the account's own baseline.</p>
      {!status.connected ? (
        <div className="connect-row">
          <div><strong>Connect your TikTok account</strong><small>Secure OAuth permission flow. CreatorForge never asks for your TikTok password.</small></div>
          <a className="primary-button connect-button" href="/api/tiktok/connect">Connect TikTok →</a>
        </div>
      ) : (
        <div className="connect-row">
          <div><strong>TikTok account authorized</strong><small>{status.note || "Account connected. Load the latest available public video metrics."}</small></div>
          <div className="connect-actions"><button className="primary-button" disabled={busy} onClick={() => void loadVideos()}>{busy ? "Loading…" : "Refresh account data"}</button><button className="text-button" onClick={async () => { await fetch("/api/tiktok/disconnect", { method: "POST" }); setData(null); await refreshStatus(); }}>Disconnect</button></div>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      {report && (
        <>
          <div className="tiktok-metrics">
            <div><small>ACCOUNT-RELATIVE SCORE</small><strong>{report.accountScore ?? "—"}<em>/100</em></strong></div>
            <div><small>POSTS ANALYSED</small><strong>{report.videos.length}</strong></div>
            <div><small>MEDIAN VIEWS</small><strong>{number(report.baseline?.views ?? 0)}</strong></div>
            <div><small>MEDIAN ENGAGEMENT</small><strong>{pct(report.baseline?.engagementRate ?? 0)}</strong></div>
          </div>
          <p className="method-note">{report.evidence}</p>
          <div className="tiktok-video-list">
            {report.videos.map((video) => (
              <a className="tiktok-video-row" key={video.id} href={video.shareUrl} target="_blank" rel="noreferrer">
                {video.coverImageUrl && <img src={video.coverImageUrl} alt="" />}
                <div className="tiktok-video-copy"><strong>{video.description || "TikTok post"}</strong><small>{number(video.views)} views · {number(video.likes)} likes · {number(video.comments)} comments · {number(video.shares)} shares</small></div>
                <span className="video-score">{video.accountRelativeScore}<small>/100</small></span>
              </a>
            ))}
          </div>
          <div className="method-note"><strong>Not available from this connection:</strong> watch time, retention curve, completion rate, traffic source and per-video follower conversion. {report.limitations?.join(" ")}</div>
          <p className="data-timestamp">Source: {data?.source} · Retrieved {new Date(data?.fetchedAt || "").toLocaleString()}</p>
        </>
      )}
    </section>
  );
}
