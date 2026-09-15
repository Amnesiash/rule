# Telegram

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| Telegram |  | true | http | classical | text | rules |  | [Telegram.list](https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list) |  |  |
| Telegram |  | true | http | classical | text | rules |  | [Telegram.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list) |  |  |
| Telegram |  | true | http | classical | text | rules |  | [Telegram.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/Telegram.list) |  |  |
| telegramcidr |  | true | http | classical | text | rules |  | [telegramcidr.txt](https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/telegramcidr.txt) |  |  |

## Mihomo 用法（复制粘贴）

```yaml
proxy-groups:
  - name: "Telegram"
    type: select
    proxies: []
rules:
  - RULE-SET,Telegram_Domain,Telegram
  - RULE-SET,Telegram,Telegram,no-resolve
  - RULE-SET,Telegram_IP,Telegram,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  Telegram_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_Domain.mrs }
  Telegram: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_Remaining.yaml }
  Telegram_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_IP.mrs }
```

## 产物文件

### mrs(ipcidr)

#### Telegram_IP.mrs

GitHub: [Telegram_IP.mrs](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram_IP.mrs)
Text: [Telegram_IP.txt](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_IP.mrs
```

### mrs(domain)

#### Telegram_Domain.mrs

GitHub: [Telegram_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram_Domain.mrs)
Text: [Telegram_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_Domain.mrs
```

### yaml(all)

#### Telegram.yaml

GitHub: [Telegram.yaml](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram.yaml
```

### yaml(remaining)

#### Telegram_Remaining.yaml

GitHub: [Telegram_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/Telegram/Telegram_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Telegram/Telegram_Remaining.yaml
```
