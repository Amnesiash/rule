import { test } from "bun:test";
import assert from "node:assert/strict";
import { parseRuleContent, rulesToYaml, splitRules } from "../lib/rules.mjs";

test("splits mixed classical YAML into domain, ipcidr, and remaining buckets", () => {
  const content = `
payload:
  - DOMAIN,example.com
  - DOMAIN-SUFFIX,example.org
  - DOMAIN-WILDCARD,*.example.net
  - IP-CIDR,192.0.2.0/24
  - IP-CIDR6,2001:db8::/32
  - PROCESS-NAME,Example.app
`;
  const result = splitRules({ content, format: "yaml", behavior: "classical" });
  assert.deepEqual(result.domain, ["example.com", "+.example.org", "*.example.net"]);
  assert.deepEqual(result.ipcidr, ["192.0.2.0/24", "2001:db8::/32"]);
  assert.deepEqual(result.remaining, ["PROCESS-NAME,Example.app"]);
});

test("ignores text comments and blank lines", () => {
  const content = `
# comment
// premium comment
DOMAIN,example.com

IP-CIDR,198.51.100.0/24
`;
  const result = splitRules({ content, format: "text", behavior: "classical" });
  assert.deepEqual(result.domain, ["example.com"]);
  assert.deepEqual(result.ipcidr, ["198.51.100.0/24"]);
  assert.deepEqual(result.remaining, []);
});

test("keeps non-equivalent domain and source IP rules in YAML remainder", () => {
  const content = `
payload:
  - DOMAIN-KEYWORD,example
  - DOMAIN-REGEX,.*example.*
  - DOMAIN,*
  - DOMAIN,*.example.com
  - DOMAIN,+.example.com
  - DOMAIN,.example.com
  - DOMAIN,foo+bar.example
  - DOMAIN,https://example.com/path
  - SRC-IP-CIDR,10.0.0.0/8
  - GEOIP,CN
`;
  const result = splitRules({ content, format: "yaml", behavior: "classical" });
  assert.deepEqual(result.domain, []);
  assert.deepEqual(result.ipcidr, []);
  assert.deepEqual(result.remaining, [
    "DOMAIN-KEYWORD,example",
    "DOMAIN-REGEX,.*example.*",
    "DOMAIN,*",
    "DOMAIN,*.example.com",
    "DOMAIN,+.example.com",
    "DOMAIN,.example.com",
    "DOMAIN,foo+bar.example",
    "DOMAIN,https://example.com/path",
    "SRC-IP-CIDR,10.0.0.0/8",
    "GEOIP,CN",
  ]);
});

test("normalizes host IP classical CIDR payloads", () => {
  const content = `
payload:
  - IP-CIDR,192.0.2.0/24
  - IP-CIDR6,2001:db8::/32
  - IP-CIDR6,2001:db8::1
  - IP-CIDR,192.0.2.1
  - IP-CIDR,999.0.0.0/8
  - IP-CIDR,192.0.2.0/33
  - IP-CIDR6,192.0.2.0/24
`;
  const result = splitRules({ content, format: "yaml", behavior: "classical" });
  assert.deepEqual(result.domain, []);
  assert.deepEqual(result.ipcidr, ["192.0.2.0/24", "2001:db8::/32", "2001:db8::1/128", "192.0.2.1/32"]);
  assert.deepEqual(result.remaining, [
    "IP-CIDR,999.0.0.0/8",
    "IP-CIDR,192.0.2.0/33",
    "IP-CIDR6,192.0.2.0/24",
  ]);
});

test("extracts only literal-safe classical DOMAIN payloads", () => {
  const content = `
payload:
  - DOMAIN,example.com
  - DOMAIN,mijia cloud
  - DOMAIN-SUFFIX,example.org
  - DOMAIN-WILDCARD,*.example.net
`;
  const result = splitRules({ content, format: "yaml", behavior: "classical" });
  assert.deepEqual(result.domain, ["example.com", "mijia cloud", "+.example.org", "*.example.net"]);
  assert.deepEqual(result.ipcidr, []);
  assert.deepEqual(result.remaining, []);
});

test("passes mrs input through without splitting", () => {
  const result = splitRules({ content: "binary", format: "mrs", behavior: "domain" });
  assert.equal(result.passthroughMrs, true);
  assert.deepEqual(result.domain, []);
  assert.deepEqual(result.ipcidr, []);
  assert.deepEqual(result.remaining, []);
});

test("infers obvious plain domain and cidr payloads when behavior is omitted", () => {
  const result = splitRules({
    content: "example.com\n*\nmijia cloud\n203.0.113.0/24\n203.0.113.1\n2001:db8::1\nPROCESS-NAME,Example.app\n",
    format: "text",
  });
  assert.deepEqual(result.domain, ["example.com", "*", "mijia cloud"]);
  assert.deepEqual(result.ipcidr, ["203.0.113.0/24", "203.0.113.1/32", "2001:db8::1/128"]);
  assert.deepEqual(result.remaining, ["PROCESS-NAME,Example.app"]);
});

test("uses mihomo domain trie compatibility for plain domain payloads", () => {
  const result = splitRules({
    content: `
payload:
  - "*"
  - mijia cloud
  - +.example.com
  - trailing.example.
  - https://example.com/path
`,
    format: "yaml",
    behavior: "domain",
  });
  assert.deepEqual(result.domain, ["*", "mijia cloud", "+.example.com"]);
  assert.deepEqual(result.ipcidr, []);
  assert.deepEqual(result.remaining, ["trailing.example.", "https://example.com/path"]);
});

test("serializes remaining rules as YAML payload", () => {
  assert.equal(rulesToYaml(["PROCESS-NAME,Example.app"]), "payload:\n  - PROCESS-NAME,Example.app\n");
});

test("rejects YAML without payload or rules array", () => {
  assert.throws(() => parseRuleContent("not_payload: []", "yaml"), /payload or rules array/);
});
