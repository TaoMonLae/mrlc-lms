import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";
import { gedScienceV2Course } from "./languageQuestGedScienceV2Content";

const PREFIX = "SCIENCE_V2::";

function visualText(visual: any): string {
  if (!visual) return "";
  if (visual.type === "table") {
    const rows = [visual.headers, ...visual.rows].map((row: string[]) => row.join(" | "));
    return [`VISUAL — ${visual.title}`, ...rows, visual.caption || ""].filter(Boolean).join("\n");
  }
  if (visual.type === "process") {
    return [`DIAGRAM — ${visual.title}`, visual.steps.join(" → "), visual.caption || ""].filter(Boolean).join("\n");
  }
  if (visual.type === "formula") {
    const variables = (visual.variables || []).map((item: any) => `${item.marker} = ${item.text}`);
    return [`FORMULA — ${visual.title}`, visual.formula, ...variables, visual.example ? `Worked example: ${visual.example}` : ""].filter(Boolean).join("\n");
  }
  if (visual.type === "bar") {
    const items = visual.items.map((item: any) => `${item.label}: ${item.value}${item.unit || ""}`);
    return [`BAR CHART — ${visual.title}`, ...items, visual.caption || ""].filter(Boolean).join("\n");
  }
  if (visual.type === "line") {
    const points = visual.points.map((point: any) => `(${point.x}, ${point.y})${point.label ? ` ${point.label}` : ""}`);
    return [`GRAPH — ${visual.title}`, `${visual.xLabel} → ${visual.yLabel}`, ...points, visual.caption || ""].filter(Boolean).join("\n");
  }
  if (visual.type === "layers") {
    const layers = visual.layers.map((layer: any, index: number) => `${index + 1}. ${layer.name}: ${layer.detail}`);
    return [`LAYERED DIAGRAM — ${visual.title}`, ...layers, visual.caption || ""].filter(Boolean).join("\n");
  }
  if (visual.type === "compare") {
    return [
      `COMPARE — ${visual.title}`,
      `${visual.leftTitle}: ${(visual.left || []).join(", ")}`,
      `Both: ${(visual.shared || []).join(", ")}`,
      `${visual.rightTitle}: ${(visual.right || []).join(", ")}`,
    ].join("\n");
  }
  if (visual.type === "evidence") {
    return [
      `EVIDENCE MODEL — ${visual.title}`,
      `Claim: ${visual.claim}`,
      `Evidence: ${(visual.evidence || []).join("; ")}`,
      `Reasoning: ${visual.reasoning}`,
    ].join("\n");
  }
  return "";
}

function renderConcept(source: string | null | undefined): string | null {
  if (!source?.startsWith(PREFIX)) return source || null;
  try {
    const document = JSON.parse(source.slice(PREFIX.length));
    const sections = [
      "LEARNING GOALS\n" + (document.objectives || []).map((item: string) => `• ${item}`).join("\n"),
      `KEY IDEA\n${document.summary}`,
      "LEARN THE CONCEPT\n" + (document.explanation || []).join("\n\n"),
      visualText(document.visual),
      (document.keyTerms || []).length
        ? "KEY TERMS\n" + document.keyTerms.map((item: any) => `• ${item.marker}: ${item.text}`).join("\n")
        : "",
      document.gedStrategy ? `GED STRATEGY\n${document.gedStrategy}` : "",
      document.checkpoint ? `CHECK YOUR UNDERSTANDING\n${document.checkpoint}` : "",
      "BEFORE PRACTICE\n1. Read the visual title, labels, units, and legend.\n2. Explain the relationship in your own words.\n3. Identify the evidence that answers the checkpoint.\n4. Continue to practice only after you can explain why the evidence matters.",
    ];
    return sections.filter(Boolean).join("\n\n");
  } catch {
    return source;
  }
}

export const gedScienceCourse: OfficialLanguageQuestCourse = {
  ...gedScienceV2Course,
  units: gedScienceV2Course.units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      conceptIntro: renderConcept(lesson.conceptIntro),
    })),
  })),
};
