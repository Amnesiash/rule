# AI

Source config: [source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## Source Files

| name |description |enabled |type |behavior |format |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| AI |  | true | http | classical | text | rules |  | [AI.txt](https://raw.githubusercontent.com/666OS/rules/release/mihomo/AI.txt) |  |  |
| AI |  | true | http | classical | text | rules |  | [AI.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/AI.list) |  |  |
| AI |  | true | http | classical | text | rules |  | [AI.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AI.list) |  |  |

## Mihomo Config

```yaml
proxy-groups:
  - name: "AI"
    type: select
    proxies: []
rules:
  - RULE-SET,AI_Domain,AI
  - RULE-SET,AI,AI,no-resolve
  - RULE-SET,AI_IP,AI,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  AI_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_Domain.mrs }
  AI: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_Remaining.yaml }
  AI_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_IP.mrs }
```

## Artifacts

### mrs(ipcidr)

#### AI_IP.mrs

GitHub: [AI_IP.mrs](https://github.com/Amnesiash/rule/blob/release/AI/AI_IP.mrs)
Text: [AI_IP.txt](https://github.com/Amnesiash/rule/blob/release/AI/AI_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_IP.mrs
```

### mrs(domain)

#### AI_Domain.mrs

GitHub: [AI_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/AI/AI_Domain.mrs)
Text: [AI_Domain.txt](https://github.com/Amnesiash/rule/blob/release/AI/AI_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_Domain.mrs
```

### yaml(all)

#### AI.yaml

GitHub: [AI.yaml](https://github.com/Amnesiash/rule/blob/release/AI/AI.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI.yaml
```

### yaml(remaining)

#### AI_Remaining.yaml

GitHub: [AI_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/AI/AI_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/AI/AI_Remaining.yaml
```
