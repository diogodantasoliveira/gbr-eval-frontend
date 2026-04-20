export interface PiiPattern {
  name: string;
  regex: RegExp;
  replacement: string;
}

export const PII_PATTERNS: PiiPattern[] = [
  {
    name: "CPF",
    regex: /\d{3}\.\d{3}\.\d{3}-(\d{2})/g,
    replacement: "000.000.000-$1",
  },
  {
    name: "CNPJ",
    regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-(\d{2})/g,
    replacement: "00.000.000/0000-$1",
  },
  {
    name: "Email",
    regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
    replacement: "redacted@example.com",
  },
  {
    name: "Phone",
    regex: /\(\d{2}\)\s?\d{4,5}-\d{4}/g,
    replacement: "(00) 00000-0000",
  },
  {
    name: "Address",
    regex: /(?:Rua|Av\.?|Avenida|Travessa|Alameda|Praça|Estrada|Rodovia|Rod\.|R\.|Lg\.|Largo|Beco|Viela|Condomínio|Conjunto|Quadra|Lote|Vila)\s+[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s]{0,80}(?:,\s?(?:n[°ºo.]?\s?)?\d+)?/gi,
    replacement: "[ENDERECO REDACTED]",
  },
  {
    name: "RG",
    regex: /\b\d{2}\.\d{3}\.\d{3}-[\dXx]\b/g,
    replacement: "00.000.000-X",
  },
  {
    name: "BRL_currency",
    regex: /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g,
    replacement: "R$ 0,00",
  },
  {
    name: "CPF_unformatted",
    regex: /\b\d{11}\b/g,
    replacement: "00000000000",
  },
  {
    name: "CNPJ_unformatted",
    regex: /\b\d{14}\b/g,
    replacement: "00000000000000",
  },
  {
    name: "PIS/PASEP",
    regex: /\b\d{3}\.\d{5}\.\d{2}-\d\b/g,
    replacement: "000.00000.00-0",
  },
];
