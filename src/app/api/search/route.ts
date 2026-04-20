import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  skills,
  golden_sets,
  tasks,
  rubrics,
  contracts,
  convention_rules,
} from "@/db/schema";
import { sql, or, type Column } from "drizzle-orm";

const LIMIT = 5;

function likeEsc(col: Column, pattern: string) {
  return sql`${col} LIKE ${pattern} ESCAPE '\\'`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 1) {
      return NextResponse.json({
        skills: [],
        golden_sets: [],
        tasks: [],
        rubrics: [],
        contracts: [],
        conventions: [],
      });
    }

    const escaped = q.replace(/[%_\\]/g, '\\$&');
    const pattern = `%${escaped}%`;

    const skillResults = db
      .select({
        id: skills.id,
        name: skills.name,
        doc_type: skills.doc_type,
        description: skills.description,
      })
      .from(skills)
      .where(
        or(
          likeEsc(skills.name, pattern),
          likeEsc(skills.doc_type, pattern),
          likeEsc(skills.description, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    const goldenSetResults = db
      .select({
        id: golden_sets.id,
        name: golden_sets.name,
        description: golden_sets.description,
      })
      .from(golden_sets)
      .where(
        or(
          likeEsc(golden_sets.name, pattern),
          likeEsc(golden_sets.description, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    const taskResults = db
      .select({
        id: tasks.id,
        task_id: tasks.task_id,
        description: tasks.description,
        category: tasks.category,
      })
      .from(tasks)
      .where(
        or(
          likeEsc(tasks.task_id, pattern),
          likeEsc(tasks.description, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    const rubricResults = db
      .select({
        id: rubrics.id,
        name: rubrics.name,
        category: rubrics.category,
      })
      .from(rubrics)
      .where(
        or(
          likeEsc(rubrics.name, pattern),
          likeEsc(rubrics.category, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    const contractResults = db
      .select({
        id: contracts.id,
        service_name: contracts.service_name,
        endpoint: contracts.endpoint,
        method: contracts.method,
      })
      .from(contracts)
      .where(
        or(
          likeEsc(contracts.service_name, pattern),
          likeEsc(contracts.endpoint, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    const conventionResults = db
      .select({
        id: convention_rules.id,
        name: convention_rules.name,
        description: convention_rules.description,
        category: convention_rules.category,
      })
      .from(convention_rules)
      .where(
        or(
          likeEsc(convention_rules.name, pattern),
          likeEsc(convention_rules.description, pattern)
        )
      )
      .limit(LIMIT)
      .all();

    return NextResponse.json({
      skills: skillResults,
      golden_sets: goldenSetResults,
      tasks: taskResults,
      rubrics: rubricResults,
      contracts: contractResults,
      conventions: conventionResults,
    });
  } catch (err) {
    console.error("GET /api/search error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
