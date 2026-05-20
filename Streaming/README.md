# Streaming

Source config: [source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## Source Files

| name |description |enabled |type |behavior |format |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| !CN |  | true | http | classical | text | rules |  | [!CN.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Extra/Streaming/!CN.list) |  |  |
| ProxyMedia |  | true | http | classical | text | rules |  | [ProxyMedia.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list) |  |  |

## Mihomo Config

```yaml
proxy-groups:
  - name: "Streaming"
    type: select
    proxies: []
rules:
  - RULE-SET,Streaming_Domain,Streaming
  - RULE-SET,Streaming,Streaming,no-resolve
  - RULE-SET,Streaming_IP,Streaming,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  Streaming_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_Domain.mrs }
  Streaming: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_Remaining.yaml }
  Streaming_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_IP.mrs }
```

## Artifacts

### mrs(ipcidr)

#### Streaming_IP.mrs

GitHub: [Streaming_IP.mrs](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming_IP.mrs)
Text: [Streaming_IP.txt](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_IP.mrs
```

### mrs(domain)

#### Streaming_Domain.mrs

GitHub: [Streaming_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming_Domain.mrs)
Text: [Streaming_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_Domain.mrs
```

### yaml(all)

#### Streaming.yaml

GitHub: [Streaming.yaml](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming.yaml
```

### yaml(remaining)

#### Streaming_Remaining.yaml

GitHub: [Streaming_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/Streaming/Streaming_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Streaming/Streaming_Remaining.yaml
```
