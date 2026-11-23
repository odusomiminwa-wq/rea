import test from "node:test";
import assert from "node:assert/strict";
import { scoreTikTokVideos } from "./tiktokScore.js";

test("returns an explicit empty state when no usable metrics exist", () => {
  const result = scoreTikTokVideos([]);
  assert.equal(result.accountScore, null);
  assert.equal(result.videos.length, 0);
});

test("scores videos relative to the connected account's own median", () => {
  const result = scoreTikTokVideos([
    { id: "a", views: 100, likes: 10, comments: 2, shares: 1 },
    { id: "b", views: 200, likes: 40, comments: 8, shares: 8 },
    { id: "c", views: 50, likes: 2, comments: 0, shares: 0 },
  ]);
  assert.equal(result.videos[0].id, "b");
  assert.ok(result.videos[0].accountRelativeScore > result.videos[2].accountRelativeScore);
  assert.equal(result.baseline.views, 100);
});

test("does not divide by zero for a video with zero views", () => {
  const result = scoreTikTokVideos([{ id: "zero", views: 0, likes: 0, comments: 0, shares: 0 }]);
  assert.equal(result.videos[0].engagementRate, 0);
  assert.equal(result.videos[0].accountRelativeScore, 0);
});
