import { useEffect, useMemo, useRef, useState } from "react";

type VideoFacts = {
  name: string;
  duration: number;
  width: number;
  height: number;
  size: number;
};

type Finding = {
  title: string;
  detail: string;
  impact: "High" | "Medium" | "Good";
};

const modules = [
  { name: "Video Analyst", icon: "◉", status: "Available" },
  { name: "AI Video Editor", icon: "✂", status: "Planned" },
  { name: "B-roll Studio", icon: "▧", status: "Planned" },
  { name: "Weekly Planner", icon: "▦", status: "Planned" },
  { name: "Account Auditor", icon: "◎", status: "Planned" },
  { name: "Trend Intelligence", icon: "↗", status: "Planned" },
  { name: "Story Image Studio", icon: "▣", status: "Planned" },
  { name: "Creator Strategist", icon: "✳", status: "Planned" },
];

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes > 0 ? minutes + ":" + String(remainder).padStart(2, "0") : remainder + " sec";
}

function analyzeVideo(
  facts: VideoFacts,
  platform: string,
  goal: string,
  hook: string,
  audience: string,
) {
  let score = 50;
  const findings: Finding[] = [];

  if (facts.duration > 0 && facts.duration <= 35) {
    score += 12;
    findings.push({ title: "Short-form length", detail: "The video is 35 seconds or shorter. This is a practical starting point for a concise short-form post, not a guarantee of retention.", impact: "Good" });
  } else if (facts.duration > 60) {
    score -= 8;
    findings.push({ title: "Consider tightening the runtime", detail: "At over one minute, the video may need a strong reason to hold attention. Review every section for repetition.", impact: "Medium" });
  } else {
    findings.push({ title: "Runtime is workable", detail: "Check that every second contributes to the story or value promised at the start.", impact: "Good" });
  }

  const vertical = facts.height > facts.width;
  if (vertical && facts.height >= 1280) {
    score += 14;
    findings.push({ title: "Vertical high-resolution format", detail: facts.width + " × " + facts.height + " is a vertical format with at least 1280 pixels of height.", impact: "Good" });
  } else if (!vertical) {
    score -= 12;
    findings.push({ title: "Not a vertical video", detail: "The file is landscape or square. If this is intended for Shorts, Reels or TikTok, consider a 9:16 export.", impact: "High" });
  } else {
    score += 5;
    findings.push({ title: "Vertical format detected", detail: "The video is vertical, but its height is below 1280 pixels. Check the platform's current upload specifications.", impact: "Medium" });
  }

  if (hook.trim().length >= 24) {
    score += 10;
    findings.push({ title: "Hook description provided", detail: "You have described the opening. Check that the first frame communicates this promise immediately.", impact: "Good" });
  } else {
    score -= 7;
    findings.push({ title: "Strengthen the opening hook", detail: "Write one clear sentence describing why someone should stop scrolling in the first two seconds.", impact: "High" });
  }

  if (audience.trim().length >= 8) {
    score += 7;
    findings.push({ title: "Audience is defined", detail: "A clear audience makes it easier to judge whether the message, pacing and examples are relevant.", impact: "Good" });
  } else {
    score -= 5;
    findings.push({ title: "Define the intended viewer", detail: "Describe who this video is for and what they should feel, learn or do after watching.", impact: "Medium" });
  }

  if (goal !== "Reach") {
    score += 3;
    findings.push({ title: "Goal selected", detail: "The selected goal is " + goal.toLowerCase() + ". Make sure the ending supports that goal with a relevant next step.", impact: "Good" });
  }

  if (platform === "YouTube Shorts" && facts.duration > 180) {
    score -= 10;
    findings.push({ title: "Check Shorts eligibility", detail: "This file is longer than three minutes. Verify current YouTube Shorts rules before publishing.", impact: "High" });
  }

  score = Math.max(0, Math.min(100, score));
  const priority = findings.filter((item) => item.impact === "High" || item.impact === "Medium");
  return { score, findings, priority };
}

export default function App() {
  const [activeModule, setActiveModule] = useState("Video Analyst");
  const [file, setFile] = useState<File | null>(null);
  const [facts, setFacts] = useState<VideoFacts | null>(null);
  const [platform, setPlatform] = useState("TikTok");
  const [goal, setGoal] = useState("Reach");
  const [hook, setHook] = useState("");
  const [audience, setAudience] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const report = facts ? analyzeVideo(facts, platform, goal, hook, audience) : null;

  function onFileChange(selected: File | undefined) {
    setError("");
    setHasAnalyzed(false);
    setFacts(null);
    setFile(null);
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      setError("Please choose a supported video file.");
      return;
    }
    if (selected.size > 500 * 1024 * 1024) {
      setError("This first version supports files up to 500 MB.");
      return;
    }
    setFile(selected);
  }

  function onMetadataLoaded() {
    const video = videoRef.current;
    if (!video || !file) return;
    if (!Number.isFinite(video.duration) || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("We couldn't read this video's metadata. Try another file format.");
      return;
    }
    setFacts({
      name: file.name,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      size: file.size,
    });
  }

  function runAnalysis() {
    if (!facts) {
      setError("Upload a video and wait for its metadata to load first.");
      return;
    }
    setHasAnalyzed(true);
    setError("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark">C</span>
          <span>creator<span className="brand-light">forge</span><small>CREATOR WORKSPACE</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          {modules.map((item) => (
            <button
              key={item.name}
              className={"nav-item " + (activeModule === item.name ? "active" : "")}
              onClick={() => setActiveModule(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {item.status === "Planned" && <span className="soon-dot" title="Coming later">·</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="engine-card">
            <span className="engine-indicator" />
            <div><strong>Analysis workspace</strong><small>Local file processing</small></div>
          </div>
          <div className="profile-row"><div className="avatar">CF</div><div><strong>Your workspace</strong><small>Starter account</small></div><span className="more">···</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeModule}</strong></div>
          <div className="topbar-right"><span className="status-pill"><i /> MVP workspace</span><button className="help-button" title="Help">?</button></div>
        </header>

        <div className="page-content">
          {activeModule !== "Video Analyst" ? (
            <section className="coming-panel">
              <div className="eyebrow">CREATORFORGE WORKSPACE</div>
              <div className="coming-icon">{modules.find((item) => item.name === activeModule)?.icon}</div>
              <h1>{activeModule}</h1>
              <p>This module is part of the product roadmap. We're building and testing each workflow before marking it available.</p>
              <button className="primary-button" onClick={() => setActiveModule("Video Analyst")}>Open Video Analyst <span>→</span></button>
            </section>
          ) : (
            <>
              <section className="page-heading">
                <div><div className="eyebrow">CONTENT PERFORMANCE TOOL</div><h1>Video Analyst<span className="heading-period">.</span></h1><p>Understand the basics. Find the weak spots. Make your next edit count.</p></div>
                <div className="heading-tag"><span>✦</span> FIRST WORKING MODULE</div>
              </section>

              <section className="notice"><span className="notice-icon">i</span><p><strong>Early MVP:</strong> This report uses video metadata and your answers to apply a visible checklist. It is not AI vision analysis, real retention data, or a prediction of views.</p></section>

              <div className="analyst-grid">
                <section className="panel upload-panel">
                  <div className="panel-heading"><div><span className="step-label">01 / VIDEO INPUT</span><h2>Start with your video</h2></div><span className="panel-icon">↥</span></div>
                  {!file ? (
                    <label className="dropzone">
                      <input type="file" accept="video/*" onChange={(event) => onFileChange(event.target.files?.[0])} />
                      <span className="upload-symbol">↑</span>
                      <strong>Drop your video here</strong>
                      <span>or <u>browse files</u> from your device</span>
                      <small>MP4, MOV and other browser-supported formats · Up to 500 MB</small>
                    </label>
                  ) : (
                    <div className="file-loaded">
                      <video ref={videoRef} src={previewUrl} controls playsInline onLoadedMetadata={onMetadataLoaded} />
                      <div className="file-details"><span className="file-icon">▶</span><div><strong>{file.name}</strong><small>{facts ? formatDuration(facts.duration) + " · " + facts.width + " × " + facts.height : "Reading video metadata…"}</small></div><button className="text-button" onClick={() => { setFile(null); setFacts(null); setHasAnalyzed(false); }}>Remove</button></div>
                    </div>
                  )}
                  {error && <p className="error-text">{error}</p>}
                  {facts && <div className="metadata-row"><span><small>DURATION</small><strong>{formatDuration(facts.duration)}</strong></span><span><small>RESOLUTION</small><strong>{facts.width} × {facts.height}</strong></span><span><small>FILE SIZE</small><strong>{(facts.size / (1024 * 1024)).toFixed(1)} MB</strong></span></div>}
                  <div className="field-group">
                    <label htmlFor="platform">Where will you publish?</label>
                    <select id="platform" value={platform} onChange={(event) => { setPlatform(event.target.value); setHasAnalyzed(false); }}><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option><option>Other</option></select>
                  </div>
                </section>

                <section className="panel context-panel">
                  <div className="panel-heading"><div><span className="step-label">02 / CREATOR CONTEXT</span><h2>Give it direction</h2></div><span className="panel-icon">⌁</span></div>
                  <div className="field-group"><label htmlFor="goal">What's the main goal?</label><select id="goal" value={goal} onChange={(event) => { setGoal(event.target.value); setHasAnalyzed(false); }}><option>Reach</option><option>Engagement</option><option>Followers</option><option>Sales</option><option>Community</option></select></div>
                  <div className="field-group"><label htmlFor="hook">Describe the opening hook</label><textarea id="hook" rows={3} placeholder="Example: A surprising result appears in the first second…" value={hook} onChange={(event) => { setHook(event.target.value); setHasAnalyzed(false); }} /></div>
                  <div className="field-group"><label htmlFor="audience">Who is this video for?</label><textarea id="audience" rows={2} placeholder="Example: Beginner creators trying to grow on TikTok…" value={audience} onChange={(event) => { setAudience(event.target.value); setHasAnalyzed(false); }} /></div>
                  <button className="primary-button analyze-button" onClick={runAnalysis} disabled={!facts}>Analyze my video <span>→</span></button>
                  <p className="privacy-note"><span>⌑</span> Your selected video is processed in this browser preview and is not uploaded to a server.</p>
                </section>
              </div>

              {hasAnalyzed && report && (
                <section className="report-section">
                  <div className="report-heading"><div><div className="eyebrow">YOUR VIDEO REPORT</div><h2>Here's what we found.</h2></div><span className="report-date">CHECKLIST ANALYSIS</span></div>
                  <div className="report-grid">
                    <div className="score-card panel"><span className="step-label">POTENTIAL CHECKLIST SCORE</span><div className="score-number">{report.score}<small>/100</small></div><div className="score-track"><span style={{ width: report.score + "%" }} /></div><p>This is a heuristic checklist score, not a forecast of performance.</p><div className="score-legend"><span><i className="green-dot" /> Positive signals</span><span><i className="amber-dot" /> Improvements</span></div></div>
                    <div className="findings-card panel"><div className="findings-title"><h3>Findings</h3><span>{report.findings.length} checks</span></div>{report.findings.map((item, index) => <div className="finding" key={item.title}><span className={"finding-mark " + item.impact.toLowerCase()}>{item.impact === "Good" ? "✓" : "!"}</span><div><div className="finding-top"><strong>{item.title}</strong><span className={"impact " + item.impact.toLowerCase()}>{item.impact}</span></div><p>{item.detail}</p></div></div>)}</div>
                  </div>
                  <div className="method-note"><strong>How this score works:</strong> It starts at 50 and applies the visible adjustments for runtime, aspect ratio/resolution, hook description, audience definition and selected goal. It does not inspect the video's story, audio, editing quality, or viewer behavior.</div>
                </section>
              )}
            </>
          )}
          <footer className="footer"><span>CREATORFORGE <b>·</b> BUILDING BETTER CONTENT WORKFLOWS</span><span>Independent creator platform · v0.1.0</span></footer>
        </div>
      </main>
    </div>
  );
}
