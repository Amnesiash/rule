# Apple

Source config: [source.txt](https://github.com/Amnesiash/rule/blob/main/source.txt)

## Source Files

| name |description |enabled |type |behavior |format |mihomo |headers |url |path |payload |
| --- |--- |--- |--- |--- |--- |--- |--- |--- |--- |--- |
| Apple |  | true | http | classical | text | rules |  | [Apple.list](https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list) |  |  |

## Mihomo Config

```yaml
proxy-groups:
  - name: "Apple"
    type: select
    proxies: []
rules:
  - RULE-SET,Apple_Domain,Apple
  - RULE-SET,Apple_IP,Apple,no-resolve
rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
rule-providers:
  Apple_Domain: { <<: *domain, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Apple/Apple_Domain.mrs }
  Apple_IP: { <<: *ip, url: https://raw.githubusercontent.com/Amnesiash/rule/release/Apple/Apple_IP.mrs }
```

## Artifacts

### mrs(ipcidr)

#### Apple_IP.mrs

GitHub: [Apple_IP.mrs](https://github.com/Amnesiash/rule/blob/release/Apple/Apple_IP.mrs)
Text: [Apple_IP.txt](https://github.com/Amnesiash/rule/blob/release/Apple/Apple_IP.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Apple/Apple_IP.mrs
```

### mrs(domain)

#### Apple_Domain.mrs

GitHub: [Apple_Domain.mrs](https://github.com/Amnesiash/rule/blob/release/Apple/Apple_Domain.mrs)
Text: [Apple_Domain.txt](https://github.com/Amnesiash/rule/blob/release/Apple/Apple_Domain.txt)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Apple/Apple_Domain.mrs
```

### yaml(all)

#### Apple.yaml

GitHub: [Apple.yaml](https://github.com/Amnesiash/rule/blob/release/Apple/Apple.yaml)
Source: _Unavailable_

```text
https://raw.githubusercontent.com/Amnesiash/rule/release/Apple/Apple.yaml
```
