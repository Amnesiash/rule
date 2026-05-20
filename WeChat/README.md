# WeChat

Source config: [source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## Source Files

| name |description |enabled |type |behavior |format |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| WeChat |  | true | http | classical | text | rules |  | [WeChat.list](https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/WeChat/WeChat.list) |  |  |
| Wechat |  | true | http | classical | text | rules |  | [Wechat.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Wechat.list) |  |  |
| WeChat |  | true | http | classical | text | rules |  | [WeChat.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/WeChat.list) |  |  |

## Mihomo Config

```yaml
proxy-groups:
  - name: "WeChat"
    type: select
    proxies: []
rules:
  - RULE-SET,WeChat_Domain,WeChat
  - RULE-SET,WeChat,WeChat,no-resolve
  - RULE-SET,WeChat_IP,WeChat,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  WeChat_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_Domain.mrs }
  WeChat: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_Remaining.yaml }
  WeChat_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_IP.mrs }
```

## Artifacts

### mrs(ipcidr)

#### WeChat_IP.mrs

GitHub: [WeChat_IP.mrs](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat_IP.mrs)
Text: [WeChat_IP.txt](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_IP.mrs
```

### mrs(domain)

#### WeChat_Domain.mrs

GitHub: [WeChat_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat_Domain.mrs)
Text: [WeChat_Domain.txt](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_Domain.mrs
```

### yaml(all)

#### WeChat.yaml

GitHub: [WeChat.yaml](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat.yaml
```

### yaml(remaining)

#### WeChat_Remaining.yaml

GitHub: [WeChat_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/WeChat/WeChat_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/WeChat/WeChat_Remaining.yaml
```
