# AI

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| AI |  | true | http | classical | text | rules |  | [AI.txt](https://raw.githubusercontent.com/666OS/rules/release/mihomo/AI.txt) |  |  |
| AI |  | true | http | classical | text | rules |  | [AI.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/AI.list) |  |  |
| AI |  | true | http | classical | text | rules |  | [AI.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/AI.list) |  |  |

## Mihomo 用法（复制粘贴）

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

## 产物文件

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
