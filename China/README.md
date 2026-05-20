# China

Source config: [source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## Source Files

| name |description |enabled |type |behavior |format |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| China |  | true | http | classical | text | rules |  | [China.txt](https://raw.githubusercontent.com/666OS/rules/release/mihomo/China.txt) |  |  |
| ChinaDomain |  | true | http | classical | text | rules |  | [ChinaDomain.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list) |  |  |
| ChinaCompanyIp |  | true | http | classical | text | rules |  | [ChinaCompanyIp.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list) |  |  |
| Direct |  | true | http | classical | text | rules |  | [Direct.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Direct.list) |  |  |

## Mihomo Config

```yaml
proxy-groups:
  - name: "China"
    type: select
    proxies: []
rules:
  - RULE-SET,China_Domain,China
  - RULE-SET,China,China,no-resolve
  - RULE-SET,China_IP,China,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  China_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_Domain.mrs }
  China: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_Remaining.yaml }
  China_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_IP.mrs }
```

## Artifacts

### mrs(ipcidr)

#### China_IP.mrs

GitHub: [China_IP.mrs](https://github.com/Amnesiash/rule/blob/release/China/China_IP.mrs)
Text: [China_IP.txt](https://github.com/Amnesiash/rule/blob/release/China/China_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_IP.mrs
```

### mrs(domain)

#### China_Domain.mrs

GitHub: [China_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/China/China_Domain.mrs)
Text: [China_Domain.txt](https://github.com/Amnesiash/rule/blob/release/China/China_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_Domain.mrs
```

### yaml(all)

#### China.yaml

GitHub: [China.yaml](https://github.com/Amnesiash/rule/blob/release/China/China.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/China/China.yaml
```

### yaml(remaining)

#### China_Remaining.yaml

GitHub: [China_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/China/China_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/China/China_Remaining.yaml
```
