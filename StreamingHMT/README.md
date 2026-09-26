# StreamingHMT

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| StreamingSE |  | true | http | classical | text | rules |  | [StreamingSE.list](https://raw.githubusercontent.com/ddgksf2013/Filter/master/StreamingSE.list) |  |  |
| CN |  | true | http | classical | text | rules |  | [CN.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/Streaming/CN.list) |  |  |

## Mihomo 用法（复制粘贴）

```yaml
proxy-groups:
  - name: "StreamingHMT"
    type: select
    proxies: []
rules:
  - RULE-SET,StreamingHMT_Domain,StreamingHMT
  - RULE-SET,StreamingHMT,StreamingHMT,no-resolve
  - RULE-SET,StreamingHMT_IP,StreamingHMT,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  StreamingHMT_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_Domain.mrs }
  StreamingHMT: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_Remaining.yaml }
  StreamingHMT_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_IP.mrs }
```

## 产物文件

### mrs(ipcidr)

#### StreamingHMT_IP.mrs

GitHub: [StreamingHMT_IP.mrs](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT_IP.mrs)
Text: [StreamingHMT_IP.txt](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_IP.mrs
```

### mrs(domain)

#### StreamingHMT_Domain.mrs

GitHub: [StreamingHMT_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT_Domain.mrs)
Text: [StreamingHMT_Domain.txt](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_Domain.mrs
```

### yaml(all)

#### StreamingHMT.yaml

GitHub: [StreamingHMT.yaml](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT.yaml
```

### yaml(remaining)

#### StreamingHMT_Remaining.yaml

GitHub: [StreamingHMT_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/StreamingHMT/StreamingHMT_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/StreamingHMT/StreamingHMT_Remaining.yaml
```
