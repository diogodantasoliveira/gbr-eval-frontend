import { db } from "../src/db";
import { skills, skill_fields } from "../src/db/schema";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

const now = Date.now();

interface FieldDef {
  field_name: string;
  field_type: "string" | "number" | "boolean" | "date" | "list" | "nested";
  criticality: "CRITICAL" | "IMPORTANT" | "INFORMATIVE";
  weight: number;
  required: boolean;
}

interface SkillDef {
  name: string;
  doc_type: string;
  description: string;
  fields: FieldDef[];
}

const SKILLS: SkillDef[] = [
  {
    name: "matricula_v1",
    doc_type: "matricula",
    description: "Extração de dados de matrícula de imóvel",
    fields: [
      { field_name: "numero_matricula", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "proprietario_cpf", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "proprietario_nome", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "area_total", field_type: "number", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "onus", field_type: "list", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "alienacao_fiduciaria", field_type: "boolean", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "endereco", field_type: "string", criticality: "INFORMATIVE", weight: 1, required: false },
      { field_name: "comarca", field_type: "string", criticality: "INFORMATIVE", weight: 1, required: false },
    ],
  },
  {
    name: "contrato_social_v1",
    doc_type: "contrato_social",
    description: "Extração de dados de contrato social",
    fields: [
      { field_name: "cnpj", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "razao_social", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "socios", field_type: "list", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "poderes", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "capital_social", field_type: "number", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "participacao_percentual", field_type: "nested", criticality: "IMPORTANT", weight: 2, required: false },
      { field_name: "objeto_social", field_type: "string", criticality: "INFORMATIVE", weight: 1, required: false },
      { field_name: "data_constituicao", field_type: "date", criticality: "INFORMATIVE", weight: 1, required: false },
    ],
  },
  {
    name: "cnd_v1",
    doc_type: "cnd",
    description: "Extração de dados de certidão negativa de débito",
    fields: [
      { field_name: "tipo_certidao", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "numero", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "validade", field_type: "date", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "status", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "orgao_emissor", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "cpf_cnpj_consultado", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "data_emissao", field_type: "date", criticality: "INFORMATIVE", weight: 1, required: false },
    ],
  },
  {
    name: "procuracao_v1",
    doc_type: "procuracao",
    description: "Extração de dados de procuração",
    fields: [
      { field_name: "outorgante", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "outorgante_cpf", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "outorgado", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "outorgado_cpf", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "poderes_especificos", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "validade", field_type: "date", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "data_lavratura", field_type: "date", criticality: "INFORMATIVE", weight: 1, required: false },
      { field_name: "cartorio", field_type: "string", criticality: "INFORMATIVE", weight: 1, required: false },
    ],
  },
  {
    name: "certidao_trabalhista_v1",
    doc_type: "certidao_trabalhista",
    description: "Extração de dados de certidão de débitos trabalhistas",
    fields: [
      { field_name: "titular", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "titular_cpf_cnpj", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "resultado", field_type: "string", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "processos", field_type: "list", criticality: "CRITICAL", weight: 3, required: true },
      { field_name: "orgao_emissor", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "abrangencia", field_type: "string", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "validade", field_type: "date", criticality: "IMPORTANT", weight: 2, required: true },
      { field_name: "data_emissao", field_type: "date", criticality: "INFORMATIVE", weight: 1, required: false },
      { field_name: "codigo_verificacao", field_type: "string", criticality: "INFORMATIVE", weight: 1, required: false },
    ],
  },
];

async function seed() {
  console.log("Starting seed...");

  for (const skillDef of SKILLS) {
    const existing = db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.name, skillDef.name))
      .all();

    if (existing.length > 0) {
      console.log(`  Skill "${skillDef.name}" already exists — skipping.`);
      continue;
    }

    const skillId = uuidv4();

    db.insert(skills).values({
      id: skillId,
      name: skillDef.name,
      doc_type: skillDef.doc_type,
      version: "1.0.0",
      description: skillDef.description,
      priority: "P0",
      status: "active",
      created_at: now,
      updated_at: now,
    }).run();

    console.log(`  Inserted skill: ${skillDef.name} (${skillId})`);

    const fieldRows = skillDef.fields.map((f, idx) => ({
      id: uuidv4(),
      skill_id: skillId,
      field_name: f.field_name,
      field_type: f.field_type,
      criticality: f.criticality,
      weight: f.weight,
      required: f.required ? 1 : 0,
      validation_pattern: null,
      description: "",
      sort_order: idx,
    }));

    db.insert(skill_fields).values(fieldRows).run();
    console.log(`    Inserted ${fieldRows.length} fields for "${skillDef.name}"`);
  }

  console.log("Seed complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
