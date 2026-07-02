# Proxy

配置文件：[source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## 订阅列表

| 名称 |备注 |启用 |类型 |行为 |格式 |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| Proxy |  | true | http | classical | text | rules |  | [Proxy.txt](https://raw.githubusercontent.com/666OS/rules/release/mihomo/Proxy.txt) |  |  |
| AddProxy |  | true | http | classical | text | rules |  | [AddProxy.list](https://raw.githubusercontent.com/Amnesiash/ladder_rules_script/main/Rules/Custom/AddProxy.list) |  |  |
| ProxyGFWlist |  | true | http | classical | text | rules |  | [ProxyGFWlist.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyGFWlist.list) |  |  |
| Proxy |  | true | http | classical | text | rules |  | [Proxy.list](https://raw.githubusercontent.com/ConnersHua/RuleGo/master/Surge/Ruleset/Proxy.list) |  |  |
| proxy |  | true | http | classical | text | rules |  | [proxy.txt](https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt) |  |  |

## Mihomo 用法（复制粘贴）

```yaml
proxy-groups:
  - name: "Proxy"
    type: select
    proxies: []
rules:
  - RULE-SET,Proxy_Domain,Proxy
  - RULE-SET,Proxy,Proxy,no-resolve
  - RULE-SET,Proxy_IP,Proxy,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }
rule-providers:
  Proxy_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_Domain.mrs }
  Proxy: { <<: *yaml, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_Remaining.yaml }
  Proxy_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_IP.mrs }
```

## 产物文件

### mrs(ipcidr)

#### Proxy_IP.mrs

GitHub: [Proxy_IP.mrs](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy_IP.mrs)
Text: [Proxy_IP.txt](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_IP.mrs
```

### mrs(domain)

#### Proxy_Domain.mrs

GitHub: [Proxy_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy_Domain.mrs)
Text: [Proxy_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_Domain.mrs
```

### yaml(all)

#### Proxy.yaml

GitHub: [Proxy.yaml](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy.yaml
```

### yaml(remaining)

#### Proxy_Remaining.yaml

GitHub: [Proxy_Remaining.yaml](https://github.com/Amnesiash/rule/blob/release/Proxy/Proxy_Remaining.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Proxy/Proxy_Remaining.yaml
```
