# rule

`rule` 是 xream 的 Mihomo rule-provider 构建仓库。它从 `source/` 下的 YAML 配置拉取、读取或内联规则源，按 Mihomo `domain` / `ipcidr` / `classical` 能力拆分后，生成可直接引用的 `.mrs`、`.txt`、`.yaml` 产物和每个目录的使用说明。

`main` 分支维护 source 配置、构建脚本和测试；生成结果发布到 `release` 分支。

## 订阅链接（改动项）

由于我不想把规则源逐条写进 `source/*/*.yaml`，所以把订阅链接集中写到仓库根目录的 `source.txt`。

构建时会直接根据 `source.txt` 里的链接拉取内容并生成 release 产物；同时会把上游原文件备份到 `source/<source>/`（仅用于留档，不参与生成）。

## 使用入口

- Release 分支：[xream/rule@release](https://github.com/xream/rule/tree/release)
- 每个 `source/<source-name>/` 会生成对应的 `release/<source-name>/`
- 每个 release 目录里的 `README.md` 会生成可复制的 Mihomo 配置、source 链接和 raw URL

通用 raw URL 形式：

```text
https://raw.githubusercontent.com/xream/rule/release/<source-name>/<artifact-name>
```

普通路由规则会固定生成 `domain`、`ipcidr`、`classical YAML` 三类 provider，并生成 `rules`、`rule-providers` 和对应的 `proxy-groups`：

如果 release 产物在 GitHub private repo，可用 `github-token-header` 给 raw URL 请求加 GitHub token。

```yaml
proxy-groups:
  - name: "<rule-set-name>"
    type: select
    proxies: []

rules:
  - RULE-SET,<rule-set-name>_Domain,<rule-set-name>
  - RULE-SET,<rule-set-name>,<rule-set-name>
  - RULE-SET,<rule-set-name>_IP,<rule-set-name>,no-resolve

rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  ip: &ip { type: http, behavior: ipcidr, format: mrs, interval: 86400, header: *github-token-header }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }
  yaml: &yaml { type: http, behavior: classical, format: yaml, interval: 86400, header: *github-token-header }

rule-providers:
  <rule-set-name>_Domain: { <<: *domain, url: https://raw.githubusercontent.com/xream/rule/release/<source-name>/<rule-set-name>_Domain.mrs }
  <rule-set-name>: { <<: *yaml, url: https://raw.githubusercontent.com/xream/rule/release/<source-name>/<rule-set-name>.yaml }
  <rule-set-name>_IP: { <<: *ip, url: https://raw.githubusercontent.com/xream/rule/release/<source-name>/<rule-set-name>_IP.mrs }
```

如果上游当前没有某一类规则，对应 provider 会写入一个不可命中的占位规则，release README 会在对应 `rules` / `rule-providers` 行追加 `placeholder` 注释，并把占位项排在同组真实规则后面。明确知道自己只需要某些 provider 时，可以不复制带 `placeholder` 注释的项。

`mihomo: fake-ip-filter` 会生成 `dns.fake-ip-filter` 用法：

```yaml
dns:
  fake-ip-filter-mode: blacklist
  fake-ip-filter:
    - "rule-set:<rule-set-name>_Domain"

rule-anchor:
  github-token-header: &github-token-header { Authorization: ["Bearer <YOUR_GITHUB_TOKEN>"] }
  domain: &domain { type: http, behavior: domain, format: mrs, interval: 86400, header: *github-token-header }

rule-providers:
  <rule-set-name>_Domain: { <<: *domain, url: https://raw.githubusercontent.com/xream/rule/release/<source-name>/<rule-set-name>_Domain.mrs }
```

实际 provider 名、group 名和文件名以 release 目录生成的 `README.md` 为准。

## 产物规则

- `<stem>_Domain.mrs`：Mihomo `domain` behavior rule-provider
- `<stem>_Domain.txt`：从 domain `.mrs` 反导出的可读文本
- `<stem>_IP.mrs`：Mihomo `ipcidr` behavior rule-provider
- `<stem>_IP.txt`：从 IP `.mrs` 反导出的可读文本，会补回 `IP-CIDR,` / `IP-CIDR6,` 前缀方便检查
- `<stem>.yaml`：不能安全转换为 `domain` / `ipcidr` 的剩余 classical 规则
- `<entry>.original.<ext>`：本次拉取、读取或内联得到的上游原始内容
- `artifacts-manifest.json`：provider 产物清单，记录三类 provider artifact 是否为占位
- `README.md`：该 release 目录的 source、Mihomo 配置和 artifact 链接

同一个 config YAML 内的 enabled 条目默认合并成同一组产物，并按输出 bucket 去重，保留首次出现顺序。设置 `separate: true` 后，该条目会单独生成一组产物。

默认产物 stem 来自 config 文件名；`separate: true` 时来自条目 `name`。不适合文件名或 provider key 的字符会替换为 `_`，domain / ipcidr 产物会分别追加 `_Domain` / `_IP`。

普通路由规则即使某个 bucket 为空也会生成对应产物，避免上游之后新增类型时还要重新补 Mihomo provider 配置。占位规则使用：

- `domain`：`blackhole.invalid`
- `ipcidr`：`203.0.113.1/32`
- `yaml(remaining)`：`DOMAIN,blackhole.invalid`

## Source 配置

配置文件放在：

```text
source/<source-name>/<rule-set-name>.yaml
```

构建脚本会扫描每个 source 目录下所有 `.yaml` / `.yml` 文件，只处理看起来像 source entry 数组的配置文件。配置文件必须是顶层数组，每一项表示一个规则源：

```yaml
- name: Example
  description: Example rules
  type: http
  behavior: classical
  format: yaml
  url: https://example.com/rules.yaml

- name: LocalExample
  type: file
  behavior: domain
  format: text
  path: local-rules.txt

- name: InlineExample
  type: inline
  behavior: ipcidr
  format: text
  payload:
    - 192.0.2.0/24
```

字段说明：

| field | required | description |
| --- | --- | --- |
| `name` | enabled entry 必填 | 上游条目名称，也用于原始文件名。 |
| `description` | no | release README 的 source 表格说明。 |
| `enabled` | no | 默认 `true`；只有显式 `false` 才会禁用。 |
| `type` | yes | `http`、`file`、`inline`。 |
| `url` | `type: http` | 绝对 URL。 |
| `headers` | no | `type: http` 时的请求 headers，必须是 scalar mapping。 |
| `path` | `type: file` | 本地规则文件路径；相对当前 source 目录解析，且不能指向项目外。 |
| `payload` | `type: inline` | 内联规则内容；可以是 string、array 或 YAML object。 |
| `behavior` | `format: mrs` 时必填 | `domain`、`ipcidr`、`classical`；`format: mrs` 不能使用 `classical`。 |
| `format` | no | `yaml`、`text`、`mrs`；默认 `yaml`。 |
| `mihomo` | no | 默认 `rules`；可设为 `fake-ip-filter`。 |
| `separate` | no | 默认 `false`；设为 `true` 时该条目单独生成产物。 |

`mihomo: fake-ip-filter` 只会生成以 config 文件名为 stem 的 domain `.mrs`，并写入 `dns.fake-ip-filter` 示例。同一个 YAML 中只要出现 enabled 的 `mihomo: fake-ip-filter`，非 `fake-ip-filter` 条目会被忽略；普通路由规则应放到另一个 YAML。

## 分类逻辑

构建时会把普通路由规则拆成三类，并固定输出三类产物：

- `mrs(domain)`：可安全转换成 Mihomo `domain` behavior 的规则
- `mrs(ipcidr)`：可安全转换成 Mihomo `ipcidr` behavior 的规则
- `yaml(remaining)`：不能等价转换的规则，保留为 classical YAML

`mihomo: fake-ip-filter` 是例外，只输出 domain `.mrs` / `.txt`，不会生成 IP 或 remaining YAML provider。

常见转换：

- `DOMAIN,example.com` -> `example.com`
- `DOMAIN-SUFFIX,example.com` -> `+.example.com`
- `DOMAIN-WILDCARD,*.example.com` -> `*.example.com`
- plain domain payload -> domain
- `IP-CIDR,192.0.2.0/24` -> `192.0.2.0/24`
- `IP-CIDR6,2001:db8::/32` -> `2001:db8::/32`
- plain IP payload -> `/32` 或 `/128`
- `PROCESS-NAME,Example.app` -> remaining YAML

`DOMAIN,*`、`DOMAIN,+.example.com`、尾部带 `.` 或含有不安全通配符语义的 classical exact match 不会强行转换成 DomainTrie payload，会留在 remaining YAML。

## 本地开发

安装依赖：

```bash
bun install
```

运行测试：

```bash
bun test
```

生成 release 产物：

```bash
bun run build:release -- --repo xream/rule
```

检查三类 provider 产物的逻辑新增 / 减少，并在有变化时发送 Telegram 通知：

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... bun run notify:artifact-changes
```

通知只比较 `domain-mrs`、`ipcidr-mrs`、`remaining-yaml` 是否从占位变成真实，或从真实变回占位；规则内容变化、`.txt`、原始文件和 README 变化不会触发通知。消息使用 Telegram HTML 格式。默认比较当前 `.release/artifacts-manifest.json` 和 `origin/release`；可用 `--previous-manifest`、`--previous-release-dir` 或 `--previous-ref` 指定对比基线，`--dry-run` 可只打印消息不发送，`--out <path>` 可先写出 HTML 消息，`--message-file <path>` 可在发布成功后发送已写出的消息。

默认输出目录是 `.release`，临时工作目录是 `.release-work`。可用参数：

```bash
bun run build:release -- \
  --source source \
  --out .release \
  --work .release-work \
  --repo xream/rule \
  --mihomo-channel release \
  --mihomo /path/to/mihomo
```

不传 `--mihomo` 时，构建脚本会按 `--mihomo-channel` 下载 Mihomo 二进制。默认是 `release`，下载最新正式版到 `.tools/mihomo-release`；也可以设为 `alpha`，下载 Alpha 版到 `.tools/mihomo-alpha`。

## 发布流程

GitHub Actions 会在手动触发，或 `source/**`、`scripts/**`、`package.json`、`bun.lock`、`.github/workflows/release.yml` 这些路径推送到 `main` 后运行：

1. 安装 Bun 依赖
2. 运行 `bun test`
3. 执行 `bun run build:release`
4. 对比 `origin/release` 和本次 `.release/artifacts-manifest.json`，有三类 provider 产物新增 / 减少时先写出 Telegram HTML 消息
5. 将 `.release` 以 orphan commit 强制发布到 `release` 分支
6. 发布成功后发送 Telegram 通知

Telegram 通知需要在 GitHub Actions secrets 中配置 `TELEGRAM_BOT_TOKEN` 和 `TELEGRAM_CHAT_ID`。未配置时步骤会跳过发送并打印将要发送的 HTML 消息。
