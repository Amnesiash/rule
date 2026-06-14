# Private

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| LocalAreaNetwork |  | true | http | classical | text | rules |  | [LocalAreaNetwork.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list) |  |  |
| private |  | true | http | classical | text | rules |  | [private.txt](https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/private.txt) |  |  |
| lancidr |  | true | http | classical | text | rules |  | [lancidr.txt](https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/lancidr.txt) |  |  |

## Mihomo 用法（复制粘贴）

```yaml
proxy-groups:
  - name: "Private"
    type: select
    proxies: []
rules:
  - RULE-SET,Private_Domain,Private
  - RULE-SET,Private_IP,Private,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
rule-providers:
  Private_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Private/Private_Domain.mrs }
  Private_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Private/Private_IP.mrs }
```

## 产物文件

### mrs(ipcidr)

#### Private_IP.mrs

GitHub: [Private_IP.mrs](https://github.com/Amnesiash/rule/blob/release/Private/Private_IP.mrs)
Text: [Private_IP.txt](https://github.com/Amnesiash/rule/blob/release/Private/Private_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Private/Private_IP.mrs
```

### mrs(domain)

#### Private_Domain.mrs

GitHub: [Private_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Private/Private_Domain.mrs)
Text: [Private_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Private/Private_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Private/Private_Domain.mrs
```

### yaml(all)

#### Private.yaml

GitHub: [Private.yaml](https://github.com/Amnesiash/rule/blob/release/Private/Private.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Private/Private.yaml
```
