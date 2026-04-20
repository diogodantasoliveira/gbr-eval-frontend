import { PII_PATTERNS, type PiiPattern } from "./patterns";

export interface RedactionResult {
  value: string;
  redacted: boolean;
  matches: string[];
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digit
  const nums = digits.split('').map(Number);
  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += nums[i] * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (nums[9] !== check) return false;
  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += nums[i] * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return nums[10] === check;
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const nums = digits.split('').map(Number);
  const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += nums[i] * weights1[i];
  let check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (nums[12] !== check) return false;
  const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  sum = 0;
  for (let i = 0; i < 13; i++) sum += nums[i] * weights2[i];
  check = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return nums[13] === check;
}

export function redactString(value: string): RedactionResult {
  const matches: string[] = [];
  let result = value;

  for (const pattern of PII_PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    const found = result.match(re);
    if (found) {
      if (pattern.name === "CPF_unformatted") {
        // Only redact if valid CPF check digits, preserve last 2 digits
        for (const match of found) {
          if (isValidCpf(match)) {
            matches.push(pattern.name);
            result = result.replace(match, "000000000" + match.slice(-2));
          }
        }
      } else if (pattern.name === "CNPJ_unformatted") {
        // Only redact if valid CNPJ check digits, preserve last 2 digits
        for (const match of found) {
          if (isValidCnpj(match)) {
            matches.push(pattern.name);
            result = result.replace(match, "000000000000" + match.slice(-2));
          }
        }
      } else {
        matches.push(...found.map(() => pattern.name));
        result = result.replace(re, pattern.replacement);
      }
    }
  }

  return { value: result, redacted: matches.length > 0, matches };
}

export interface ScanResult {
  hasPii: boolean;
  findings: Array<{ field: string; patterns: string[] }>;
}

export function scanForPii(
  data: Record<string, unknown>,
  prefix = ""
): ScanResult {
  const findings: Array<{ field: string; patterns: string[] }> = [];

  for (const [key, val] of Object.entries(data)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") {
      const { matches } = redactString(val);
      if (matches.length > 0) {
        findings.push({ field: fieldPath, patterns: [...new Set(matches)] });
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (typeof item === "string") {
          const { matches } = redactString(item);
          if (matches.length > 0) {
            findings.push({
              field: `${fieldPath}[${idx}]`,
              patterns: [...new Set(matches)],
            });
          }
        } else if (typeof item === "object" && item !== null) {
          const nested = scanForPii(
            item as Record<string, unknown>,
            `${fieldPath}[${idx}]`
          );
          findings.push(...nested.findings);
        }
      });
    } else if (typeof val === "number") {
      const { matches } = redactString(String(val));
      if (matches.length > 0) {
        findings.push({ field: fieldPath, patterns: [...new Set(matches)] });
      }
    } else if (typeof val === "object" && val !== null) {
      const nested = scanForPii(val as Record<string, unknown>, fieldPath);
      findings.push(...nested.findings);
    }
  }

  return { hasPii: findings.length > 0, findings };
}

export function redactRecord(
  data: Record<string, unknown>
): Record<string, unknown> {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    if (typeof val === "string") {
      result[key] = redactString(val).value;
    } else if (typeof val === "number") {
      const asStr = String(val);
      const redacted = redactString(asStr);
      if (redacted.redacted) {
        const num = Number(redacted.value);
        result[key] = Number.isFinite(num) ? num : 0;
      } else {
        result[key] = val;
      }
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) => {
        if (typeof item === "string") return redactString(item).value;
        if (typeof item === "number") {
          const r = redactString(String(item));
          if (r.redacted) {
            const num = Number(r.value);
            return Number.isFinite(num) ? num : 0;
          }
          return item;
        }
        if (typeof item === "object" && item !== null)
          return redactRecord(item as Record<string, unknown>);
        return item;
      });
    } else if (typeof val === "object" && val !== null) {
      result[key] = redactRecord(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }

  return result;
}
