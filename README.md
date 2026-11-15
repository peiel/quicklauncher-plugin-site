# QuickLauncher 插件目录网站

纯静态网站，无需构建或依赖。入口为 `index.html`；`styles.css` 和 `app.js` 分别负责样式和本地搜索。

`developer.html` 是公开插件开发指南，涵盖协议、宿主能力、本地安装、GitHub Release 和目录收录。`tools/package_github_plugin.py` 可公开下载，使用 `tools/LICENSE` 中的 MIT 协议；它来自 QuickLauncher 项目的 `Tools/package_github_plugin.py`，维护插件协议或打包规则时需同步更新该文件与指南，避免版本不一致。

指南提供可复制的 AI 开发提示词和 `skills/quicklauncher-plugin/SKILL.md` 下载；修改插件协议或发布流程时应一并检查 Skill 与指南的内容是否仍然一致。`developer.js` 仅处理提示词复制，剪贴板不可用时提示手动复制。

网站展示密码生成、计算器、定时提醒、时间戳转换、文本统计和 URL 参数编解码插件的源码与安装说明。点击「在 QuickLauncher 中打开」会通过 `quicklauncher://install?repo=owner%2Frepo` 链接将仓库交给已安装的 QuickLauncher；应用从 GitHub 获取插件，展示审核内容，用户确认后才安装。部分插件需要支持新版插件协议的 QuickLauncher。若无法打开应用，可在设置的「发现插件」中手动输入仓库名。网站不镜像插件资产。

QuickLauncher 应用使用 `catalog.json` 发现已收录插件。`catalog-repositories.json` 是仓库白名单；GitHub Actions 每四小时使用仓库自动化凭据从 GitHub 同步 Release、标签对应提交、资产地址和 SHA-256，推送目录后由 Pages 部署。也可在 Actions 手动运行 Update plugin catalog。同步失败不会发布部分结果；目录超过 48 小时时，应用会暂停使用它进行安装和更新。目录提供的是同步快照，不证明作者身份或资产由标签提交构建。插件包仍由应用直接从 GitHub 获取。

网站卡片通过 `data-repository` 从 `catalog.json` 读取对应的最新正式 Release 标签，和应用使用相同的数据；目录不可用、缺失或超过 48 小时时显示“版本暂不可用”，而不是旧版本。卡片名称、说明和链接仍在 `index.html` 中维护；新插件收录时需同步添加卡片和仓库映射。请勿向网站或目录写入 Token、私钥或个人数据。

运行 `node tests/catalog.test.js` 可验证目录搜索、显示数量、空结果状态和插件的跳转链接；此检查不模拟浏览器界面。
运行 `node tests/catalog-versions.test.js` 可验证版本同步、目录过期及网络故障时的显示行为。
运行 `node tests/developer.test.js` 可执行文档中的 Python 示例、测试选区输入和错误输出，并用公开打包工具打包示例；需要 Python 3.9+，不操作浏览器或应用界面。
运行 `node tests/ai-skill.test.js` 可检查 AI 提示词复制成功及剪贴板不可用时的提示。

发布前应核对版本与源码/Release 链接。推荐将站点源码托管于独立 Git 仓库，并在 Cloudflare Pages 中使用 Git 集成发布：选择静态站点、构建命令 `exit 0`，输出目录指向包含 `index.html` 的仓库根目录。也可使用其他静态托管。不要把凭证或私钥放到此目录。

站点已通过 Cloudflare Pages 的 Git 集成部署，并绑定 `plugin.quicklauncher.flyee.tech`。后续调整自定义域名时，先在 Pages 项目中关联，再按 Cloudflare 提供的目标配置 CNAME 并检查证书状态；应先核对现有 DNS 记录，避免影响其他服务。该域名是多级子域，需要确认最终证书覆盖。
