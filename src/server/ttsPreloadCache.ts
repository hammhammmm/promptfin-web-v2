import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

type CacheItem = {
  audio: Buffer;
  contentType: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_ITEMS = 48;
const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "tts-preload");

function cleanup(now = Date.now()): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    const files = fs.readdirSync(CACHE_DIR).filter((name) => name.endsWith(".json"));

    const entries: Array<{ file: string; expiresAt: number }> = [];
    for (const file of files) {
      const fullPath = path.join(CACHE_DIR, file);
      try {
        const raw = fs.readFileSync(fullPath, "utf8");
        const parsed = JSON.parse(raw) as { expiresAt?: unknown };
        const expiresAt =
          typeof parsed.expiresAt === "number" && Number.isFinite(parsed.expiresAt)
            ? parsed.expiresAt
            : 0;
        if (expiresAt <= now) {
          fs.unlinkSync(fullPath);
          continue;
        }
        entries.push({ file, expiresAt });
      } catch {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // ignore
        }
      }
    }

    if (entries.length <= MAX_ITEMS) return;

    const sorted = entries.sort((a, b) => a.expiresAt - b.expiresAt);
    const removeCount = entries.length - MAX_ITEMS;
    for (let i = 0; i < removeCount; i += 1) {
      const file = sorted[i]?.file;
      if (!file) continue;
      try {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore cache cleanup failures
  }
}

export function storePreloadedTts(audio: Buffer, contentType = "audio/mpeg"): string {
  cleanup();
  const id = randomUUID();
  const payload = {
    contentType,
    expiresAt: Date.now() + CACHE_TTL_MS,
    audioBase64: audio.toString("base64"),
  };
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${id}.json`), JSON.stringify(payload), "utf8");
  return id;
}

export function readPreloadedTts(id: string): CacheItem | null {
  try {
    const filePath = path.join(CACHE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as {
      contentType?: unknown;
      expiresAt?: unknown;
      audioBase64?: unknown;
    };
    const expiresAt =
      typeof parsed.expiresAt === "number" && Number.isFinite(parsed.expiresAt)
        ? parsed.expiresAt
        : 0;
    if (expiresAt <= Date.now()) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      return null;
    }
    if (typeof parsed.audioBase64 !== "string" || !parsed.audioBase64) {
      return null;
    }
    return {
      audio: Buffer.from(parsed.audioBase64, "base64"),
      contentType: typeof parsed.contentType === "string" ? parsed.contentType : "audio/mpeg",
      expiresAt,
    };
  } catch {
    return null;
  }
}
