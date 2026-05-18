import express, { Router } from "express";
import { TemplatesRepo, Template } from "../repos/templatesRepo";
import type { Database } from "better-sqlite3";

const router = Router();

// Avoid initializing DB at module import. Tests or server should call initDatabase
// prior to using these routes. Provide a lazy getter for the repo.
let templatesRepo: TemplatesRepo | null = null;
export function getTemplatesRepo(db?: Database) {
  if (templatesRepo) return templatesRepo;
  templatesRepo = new TemplatesRepo(db);
  return templatesRepo;
}

/**
 * Helper to validate that all variables in the array are used in content with {var} syntax
 */
function validateVariables(content: string, variables: string[]): boolean {
  for (const v of variables) {
    if (!content.includes(`{${v}}`)) return false;
  }
  return true;
}

/**
 * Simple CSV parser for MVP
 */
type TemplateInput = { name?: string; content?: string; variables?: string[]; type?: string }

function parseCsv(csvText: string): TemplateInput[] {
   const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
   if (lines.length < 2) return [];
 
   const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
   const results: TemplateInput[] = [];
 
   for (let i = 1; i < lines.length; i++) {
     const values = lines[i].split(",").map(v => v.trim());
     const obj: Record<string, string | string[]> = {};
     headers.forEach((h, index) => {
       if (h === "variables") {
         obj[h] = values[index] ? values[index].split(";").map(v => v.trim()) : []
       } else {
         obj[h] = values[index]
       }
     });
     results.push(obj as TemplateInput);
   }
   return results;
 }

router.get("/", (req, res) => {
  const repo = getTemplatesRepo();
  res.json(repo.list());
});

router.get("/:id", (req, res) => {
  const repo = getTemplatesRepo();
  const template = repo.findById(req.params.id);
  if (!template) return res.status(404).json({ error: "Template not found" });
  res.json(template);
});

router.post("/", (req, res) => {
  const { name, content, variables, type } = req.body;

  if (!name || !content || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (variables && !validateVariables(content, variables)) {
    return res.status(400).json({ error: "One or more variables not found in content" });
  }

  const repo = getTemplatesRepo();
  const created = repo.create({ name, content, variables, type });
  res.status(201).json(created);
});

router.post("/import", express.text({ type: "text/csv" }), (req, res) => {
   try {
     const parsed = parseCsv(req.body);
     const repo = getTemplatesRepo();
     const imported: Template[] = [];
 
     for (const item of parsed) {
       if (!item.name || !item.content || !item.type) continue;
       if (!validateVariables(item.content, item.variables || [])) continue;
       const created = repo.create({ name: item.name, content: item.content, variables: item.variables || [], type: item.type });
       imported.push(created);
     }
 
     res.status(201).json({ count: imported.length, templates: imported });
   } catch (err) {
     res.status(500).json({ error: "Failed to parse CSV" });
   }
 });

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const repo = getTemplatesRepo();
  const existing = repo.findById(id);
  if (!existing) return res.status(404).json({ error: "Template not found" });
  const updated = { ...existing, ...req.body, updated_at: new Date().toISOString() };
  if (updated.variables && !validateVariables(updated.content, updated.variables)) {
    return res.status(400).json({ error: "One or more variables not found in content" });
  }
  const patch: Record<string, unknown> = {};
  if (req.body.name !== undefined) patch.name = updated.name;
  if (req.body.content !== undefined) patch.content = updated.content;
  if (req.body.variables !== undefined) patch.variables = updated.variables;
  if (req.body.type !== undefined) patch.type = updated.type;
  const ok = repo.update(id, patch);
  if (!ok) return res.status(404).json({ error: "Template not found" });
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const repo = getTemplatesRepo();
  const ok = repo.delete(id);
  if (!ok) return res.status(404).json({ error: "Template not found" });
  res.json({ message: "Template deleted" });
});

export const templatesRouter = router;
export default router;
