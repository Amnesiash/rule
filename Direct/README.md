# Direct

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| AddDirect |  | true | http | classical | text | rules |  | [AddDirect.list](https://raw.githubusercontent.com/Amnesiash/ladder_rules_script/main/Rules/Custom/AddDirect.list) |  |  |
| Direct |  | true | http | classical | text | rules |  | [Direct.txt](https://raw.githubusercontent.com/666OS/rules/release/mihomo/Direct.txt) |  |  |
| UnBan |  | true | http | classical | text | rules |  | [UnBan.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list) |  |  |
| Direct+ |  | true | http | classical | text | rules |  | [Direct+.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Direct+.list) |  |  |

## Mihomo 用法（复制粘贴）

```yaml
proxy-groups:
  - name: "Direct"
    type: select
    proxies: []
rules:
  - RULE-SET,Direct_Domain,Direct
  - RULE-SET,Direct,Direct,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  Direct_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Direct/Direct_Domain.mrs }
  Direct: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Direct/Direct_Remaining.yaml }
```

## 产物文件

### mrs(domain)

#### Direct_Domain.mrs

GitHub: [Direct_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Direct/Direct_Domain.mrs)
Text: [Direct_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Direct/Direct_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Direct/Direct_Domain.mrs
```

### yaml(all)

#### Direct.yaml

GitHub: [Direct.yaml](https://github.com/Amnesiash/rule/blob/release/Direct/Direct.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Direct/Direct.yaml
```

### yaml(remaining)

#### Direct_Remaining.yaml

GitHub: [Direct_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/Direct/Direct_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Direct/Direct_Remaining.yaml
```
