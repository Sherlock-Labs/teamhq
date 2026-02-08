import { Router } from "express";
import fs from "fs/promises";
import path from "path";

const router = Router();

const DOCS_DIR = path.resolve(import.meta.dirname, "../../../docs");

// Known doc type suffixes, ordered longest-first for greedy matching
const DOC_TYPE_SUFFIXES = [
  "backend-analysis",
  "tech-approach",
  "design-spec",
  "qa-report",
  "requirements",
  "research",
  "qa-findings",
];

// Static type-to-agent author map (pipeline is deterministic)
const AUTHOR_MAP: Record<string, { name: string; avatar: string }> = {
  "requirements": { name: "Thomas", avatar: "img/avatars/thomas.svg" },
  "tech-approach": { name: "Andrei", avatar: "img/avatars/andrei.svg" },
  "design-spec": { name: "Robert", avatar: "img/avatars/robert.svg" },
  "research": { name: "Suki", avatar: "img/avatars/suki.svg" },
  "qa-report": { name: "Enzo", avatar: "img/avatars/enzo.svg" },
  "findings": { name: "Enzo", avatar: "img/avatars/enzo.svg" },
  "backend-analysis": { name: "Jonah", avatar: "img/avatars/jonah.svg" },
  "adr": { name: "Andrei", avatar: "img/avatars/andrei.svg" },
};

// Human-readable labels for doc types
const TYPE_LABELS: Record<string, string> = {
  "requirements": "Requirements",
  "tech-approach": "Tech Approach",
  "design-spec": "Design Spec",
  "research": "Research",
  "qa-report": "QA Report",
  "qa-findings": "QA Findings",
  "backend-analysis": "Analysis",
  "adr": "ADR",
  "other": "Doc",
};

interface Author {
  name: string;
  avatar: string;
}

interface DocEntry {
  path: string;
  title: string;
  type: string;
  typeLabel: string;
  author: Author | null;
  readingTime: number;
  modifiedAt: string;
}

interface DocGroup {
  project: string;
  label: string;
  docCount: number;
  docs: DocEntry[];
  latestModifiedAt: string;
}

function kebabToTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractTitle(content: string, fallbackTitle: string): string {
  const lines = content.split("\n", 5);
  for (const line of lines) {
    if (line.startsWith("# ")) {
      return line.slice(2).trim();
    }
  }
  return fallbackTitle;
}

function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function parseDocFilename(filename: string): { project: string; type: string; fallbackTitle: string } {
  const name = filename.replace(/\.md$/, "");

  for (const suffix of DOC_TYPE_SUFFIXES) {
    if (name.endsWith(`-${suffix}`)) {
      const project = name.slice(0, -(suffix.length + 1));
      const label = kebabToTitleCase(project);
      const typeLabel = kebabToTitleCase(suffix);
      return {
        project: project || "landing-page",
        type: suffix,
        fallbackTitle: `${label} ${typeLabel}`,
      };
    }
  }

  // Special case: bare files like "tech-approach.md" or "design-spec.md"
  for (const suffix of DOC_TYPE_SUFFIXES) {
    if (name === suffix) {
      return {
        project: "landing-page",
        type: suffix,
        fallbackTitle: `Landing Page ${kebabToTitleCase(suffix)}`,
      };
    }
  }

  // No known type matched — type is "other"
  return {
    project: name,
    type: "other",
    fallbackTitle: kebabToTitleCase(name),
  };
}

function parseAdrFilename(filename: string): { fallbackTitle: string } {
  const name = filename.replace(/\.md$/, "");
  return { fallbackTitle: kebabToTitleCase(name) };
}

// GET /api/docs — list all docs grouped by project with enriched metadata
router.get("/docs", async (_req, res) => {
  try {
    const groupMap = new Map<string, DocGroup>();
    let totalDocs = 0;

    // Scan top-level docs/
    const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
    const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));

    for (const file of mdFiles) {
      const filePath = path.join(DOCS_DIR, file.name);
      const [stat, content] = await Promise.all([
        fs.stat(filePath),
        fs.readFile(filePath, "utf-8"),
      ]);
      const parsed = parseDocFilename(file.name);

      const doc: DocEntry = {
        path: file.name,
        title: extractTitle(content, parsed.fallbackTitle),
        type: parsed.type,
        typeLabel: TYPE_LABELS[parsed.type] ?? "Doc",
        author: AUTHOR_MAP[parsed.type] ?? null,
        readingTime: calculateReadingTime(content),
        modifiedAt: stat.mtime.toISOString(),
      };

      totalDocs++;

      const existing = groupMap.get(parsed.project);
      if (existing) {
        existing.docs.push(doc);
        existing.docCount++;
        if (stat.mtime.toISOString() > existing.latestModifiedAt) {
          existing.latestModifiedAt = stat.mtime.toISOString();
        }
      } else {
        groupMap.set(parsed.project, {
          project: parsed.project,
          label: kebabToTitleCase(parsed.project),
          docCount: 1,
          docs: [doc],
          latestModifiedAt: stat.mtime.toISOString(),
        });
      }
    }

    // Scan docs/adrs/
    try {
      const adrEntries = await fs.readdir(path.join(DOCS_DIR, "adrs"), { withFileTypes: true });
      const adrFiles = adrEntries.filter(
        (e) => e.isFile() && e.name.endsWith(".md") && e.name !== "README.md"
      );

      const adrDocs: DocEntry[] = [];
      let latestAdr = "";

      for (const file of adrFiles) {
        const filePath = path.join(DOCS_DIR, "adrs", file.name);
        const [stat, content] = await Promise.all([
          fs.stat(filePath),
          fs.readFile(filePath, "utf-8"),
        ]);
        const parsed = parseAdrFilename(file.name);
        const modifiedAt = stat.mtime.toISOString();

        adrDocs.push({
          path: `adrs/${file.name}`,
          title: extractTitle(content, parsed.fallbackTitle),
          type: "adr",
          typeLabel: "ADR",
          author: AUTHOR_MAP["adr"] ?? null,
          readingTime: calculateReadingTime(content),
          modifiedAt,
        });

        totalDocs++;

        if (modifiedAt > latestAdr) {
          latestAdr = modifiedAt;
        }
      }

      if (adrDocs.length > 0) {
        groupMap.set("adrs", {
          project: "adrs",
          label: "Architecture Decision Records",
          docCount: adrDocs.length,
          docs: adrDocs,
          latestModifiedAt: latestAdr,
        });
      }
    } catch {
      // adrs/ directory may not exist — that's fine, skip it
    }

    // Sort groups by latestModifiedAt descending, then move ADRs to the end
    const groups = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.latestModifiedAt).getTime() - new Date(a.latestModifiedAt).getTime()
    );
    const adrIndex = groups.findIndex((g) => g.project === "adrs");
    if (adrIndex !== -1) {
      const [adrGroup] = groups.splice(adrIndex, 1);
      groups.push(adrGroup);
    }

    // Sort docs within each group by modifiedAt descending
    for (const group of groups) {
      group.docs.sort(
        (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
      );
    }

    res.json({
      summary: {
        totalDocs,
        totalProjects: groupMap.size,
      },
      groups,
    });
  } catch (err) {
    console.error("Error listing docs:", err);
    res.status(500).json({ error: "Failed to list docs" });
  }
});

// GET /api/docs/:docPath — serve raw markdown content of a single doc
// Uses {*docPath} syntax for Express 5 / path-to-regexp v8 wildcard segments
router.get("/docs/{*docPath}", async (req, res) => {
  try {
    const rawParam = (req.params as Record<string, unknown>).docPath;
    const requestedPath = Array.isArray(rawParam) ? rawParam.join("/") : String(rawParam);

    if (!requestedPath) {
      res.status(400).json({ error: "Missing document path" });
      return;
    }

    // Path traversal protection
    const resolved = path.resolve(DOCS_DIR, requestedPath);
    if (!resolved.startsWith(DOCS_DIR + path.sep) && resolved !== DOCS_DIR) {
      res.status(400).json({ error: "Invalid path" });
      return;
    }

    const content = await fs.readFile(resolved, "utf-8");
    res.type("text/plain; charset=utf-8").send(content);
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    console.error("Error reading doc:", err);
    res.status(500).json({ error: "Failed to read document" });
  }
});

export default router;
