import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import path from "path";

const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "honeypot.log");

const BYTE_DELAY_MS = 5000; // 5 secondes par octet → décourage sans tuer le serveur
const MAX_BYTES = 60; // ~5 minutes max par connexion suspecte

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /\.env$/i,
  /\.ya?ml$/i,
  /\.json$/i, // attention : tes routes /api ne doivent pas matcher ici
  /\.bak$/i,
  /\.save$/i,
  /\.old$/i,
  /config\./i,
  /wp-config/i,
  /\.git/i,
  /phpmyadmin/i,
  /\.htaccess/i,
  /\.DS_Store/i,
  /^\/(admin|debug|test|backup|shared|objects|config|phpinfo)/i,
];

// Blacklist mémoire simple (30 min)
const blacklist = new Map<string, number>();
const BLACKLIST_MIN = 30;

function isSuspicious(path: string): boolean {
  const lower = path.toLowerCase();
  return SUSPICIOUS_PATTERNS.some((re) => re.test(lower));
}

async function logSuspicious(req: Request, msg = "Suspicious honeypot hit") {
  const entry = {
    ts: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress || "unknown",
    ua: req.get("user-agent") || "-",
    method: req.method,
    path: req.originalUrl || req.path,
    msg,
  };

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {}
}

export async function honeypot(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // 1. Blacklist temporaire ?
  const expire = blacklist.get(ip);
  if (expire && Date.now() < expire) {
    res.status(429).json({ error: "Too Many Requests – calm down" });
    return;
  }

  // 2. Chemin légitime → on passe direct (très rapide)
  if (!isSuspicious(req.path)) {
    return next();
  }

  // ── À partir d'ici : honeypot ──
  await logSuspicious(req);

  // Option : activer blacklist après premier hit
  // blacklist.set(ip, Date.now() + BLACKLIST_MIN * 60 * 1000);

  res.set({
    "Content-Type": "text/plain",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  res.status(200); // on fait semblant que ça existe

  let sent = 0;
  const interval = setInterval(() => {
    if (sent >= MAX_BYTES || res.writableEnded) {
      clearInterval(interval);
      res.end();
      return;
    }
    res.write("x");
    sent++;
  }, BYTE_DELAY_MS);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
}
