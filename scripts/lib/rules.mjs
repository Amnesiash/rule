import YAML from "yaml";
import { isIP } from "node:net";

const SAFE_DOMAIN_TYPES = new Set(["DOMAIN-SUFFIX", "DOMAIN-WILDCARD"]);
const SAFE_IPCIDR_TYPES = new Set(["IP-CIDR", "IP-CIDR6"]);
const COMMENT_PREFIXES = ["#", "//"];

export class RuleSplitError extends Error {
  constructor(message, context = {}) {
    const location = [context.sourceName, context.entryName].filter(Boolean).join(":");
    super(location ? `${location}: ${message}` : message);
    this.name = "RuleSplitError";
    this.context = context;
  }
}

export function parseRuleContent(content, format, context = {}) {
  if (format === "mrs") {
    return [];
  }
  if (format === "text") {
    return String(content)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !COMMENT_PREFIXES.some((prefix) => line.startsWith(prefix)));
  }
  if (format === "yaml") {
    let parsed;
    try {
      parsed = YAML.parse(String(content)) ?? {};
    } catch (error) {
      throw new RuleSplitError(`invalid rule YAML: ${error.message}`, context);
    }
    if (Array.isArray(parsed)) return parsed.map(String);
    if (Array.isArray(parsed.payload)) return parsed.payload.map(String);
    if (Array.isArray(parsed.rules)) return parsed.rules.map(String);
    throw new RuleSplitError("yaml rule files must contain payload or rules array", context);
  }
  throw new RuleSplitError(`unsupported rule format: ${format}`, context);
}

export function splitRules({ content, format, behavior, context = {} }) {
  if (format === "mrs") {
    return {
      domain: [],
      ipcidr: [],
      remaining: [],
      passthroughMrs: true,
    };
  }

  const rules = parseRuleContent(content, format, context);
  const buckets = {
    domain: [],
    ipcidr: [],
    remaining: [],
    passthroughMrs: false,
  };

  for (const rule of rules) {
    addRuleToBuckets(rule, behavior, buckets);
  }

  return buckets;
}

function addRuleToBuckets(rule, behavior, buckets) {
  const raw = String(rule).trim();
  if (!raw) return;

  if (behavior === "domain") {
    const classified = classifyClassicalRule(raw);
    if (classified.kind === "domain") buckets.domain.push(classified.payload);
    else if (classified.kind === "unknown" && isPlainDomainPayload(raw)) buckets.domain.push(raw);
    else buckets.remaining.push(raw);
    return;
  }

  if (behavior === "ipcidr") {
    const classified = classifyClassicalRule(raw);
    if (classified.kind === "ipcidr") buckets.ipcidr.push(classified.payload);
    else if (classified.kind === "unknown") addUnknownRuleToBuckets(raw, buckets);
    else buckets.remaining.push(raw);
    return;
  }

  const classified = classifyClassicalRule(raw);
  if (classified.kind === "domain") buckets.domain.push(classified.payload);
  else if (classified.kind === "ipcidr") buckets.ipcidr.push(classified.payload);
  else if (classified.kind === "unknown") addUnknownRuleToBuckets(raw, buckets);
  else buckets.remaining.push(raw);
}

function addUnknownRuleToBuckets(raw, buckets) {
  const cidrPayload = normalizeCIDRPayload(raw, { family: 0 });
  if (cidrPayload) {
    buckets.ipcidr.push(cidrPayload);
  } else if (isPlainDomainPayload(raw)) {
    buckets.domain.push(raw);
  } else {
    buckets.remaining.push(raw);
  }
}

export function classifyClassicalRule(ruleRaw) {
  const parsed = parseClassicalPayload(ruleRaw);
  if (!parsed.type || !parsed.payload) return { kind: "unknown", raw: ruleRaw };

  if (parsed.type === "DOMAIN") {
    const payload = String(parsed.payload).trim();
    if (isLiteralClassicalDomainPayload(payload)) {
      return { kind: "domain", payload, raw: ruleRaw };
    }
    return { kind: "remaining", raw: ruleRaw, type: parsed.type };
  }
  if (SAFE_DOMAIN_TYPES.has(parsed.type)) {
    const payload = domainPayloadFor(parsed.type, parsed.payload);
    if (isMihomoDomainTriePayload(payload)) {
      return { kind: "domain", payload, raw: ruleRaw };
    }
    return { kind: "remaining", raw: ruleRaw, type: parsed.type };
  }
  if (SAFE_IPCIDR_TYPES.has(parsed.type)) {
    const payload = normalizeClassicalCIDRPayload(parsed.type, parsed.payload);
    if (payload) {
      return { kind: "ipcidr", payload, raw: ruleRaw };
    }
    return { kind: "remaining", raw: ruleRaw, type: parsed.type };
  }
  return { kind: "remaining", raw: ruleRaw, type: parsed.type };
}

export function parseClassicalPayload(ruleRaw) {
  const parts = String(ruleRaw)
    .split(",")
    .map((part) => part.trim());
  const type = (parts[0] || "").toUpperCase();
  return {
    type,
    payload: parts[1] || "",
    params: parts.slice(2),
  };
}

function domainPayloadFor(type, payload) {
  const value = String(payload).trim();
  if (type === "DOMAIN-SUFFIX") {
    return `+.${value.replace(/^\.+/, "")}`;
  }
  return value;
}

function isPlainDomainPayload(value) {
  const domain = String(value);
  return (
    !domain.includes(",") &&
    !domain.includes("/") &&
    !domain.startsWith("#") &&
    !domain.startsWith("//") &&
    isMihomoDomainTriePayload(domain)
  );
}

function isLiteralClassicalDomainPayload(domain) {
  return (
    isMihomoDomainTriePayload(domain) &&
    !domain.includes("/") &&
    !domain.startsWith("#") &&
    !domain.startsWith("//") &&
    !domain.startsWith(".") &&
    !domain.includes("*") &&
    !domain.includes("+")
  );
}

function isMihomoDomainTriePayload(domain) {
  if (!domain || domain.endsWith(".")) return false;
  if (/^\s|\s$/u.test(domain)) return false;
  const parts = domain.toLowerCase().split(".");
  if (parts.length === 1) return parts[0] !== "";
  return parts.slice(1).every((part) => part !== "");
}

function normalizeClassicalCIDRPayload(type, value) {
  return normalizeCIDRPayload(value, { family: type === "IP-CIDR6" ? 6 : 4 });
}

function normalizeCIDRPayload(value, { family }) {
  const cidr = String(value).trim();
  if (cidr.includes(",")) return null;

  if (!cidr.includes("/")) {
    const addressFamily = isIP(cidr);
    if (addressFamily === 0) return null;
    if (family !== 0 && addressFamily !== family) return null;
    return `${cidr}/${addressFamily === 6 ? 128 : 32}`;
  }

  const slashIndex = cidr.lastIndexOf("/");
  if (slashIndex <= 0 || slashIndex !== cidr.indexOf("/")) return null;

  const address = cidr.slice(0, slashIndex);
  const prefixText = cidr.slice(slashIndex + 1);
  if (!/^\d+$/u.test(prefixText)) return null;

  const addressFamily = isIP(address);
  if (addressFamily === 0) return null;
  if (family !== 0 && addressFamily !== family) return null;

  const prefix = Number(prefixText);
  const maxPrefix = addressFamily === 6 ? 128 : 32;
  if (prefix < 0 || prefix > maxPrefix) return null;
  return `${address}/${prefix}`;
}

export function rulesToYaml(rules) {
  if (!rules.length) return "";
  return YAML.stringify({ payload: rules });
}
