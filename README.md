# QuickLauncher 插件目录网站

纯静态网站，无需构建或依赖。入口为 `index.html`；`styles.css` 和 `app.js` 分别负责样式和本地搜索。

网站展示密码生成、计算器和定时提醒插件的源码与安装说明。点击「在 QuickLauncher 中打开」会通过 `quicklauncher://install?repo=owner%2Frepo` 链接将仓库交给已安装的 QuickLauncher；应用从 GitHub 获取插件，展示审核内容，用户确认后才安装。计算器和提醒插件需要支持新版插件协议的 QuickLauncher。若无法打开应用，可在设置的「发现插件」中手动输入仓库名。网站不镜像插件资产。

插件版本和 Release 链接目前写在 `index.html` 中；新版本发布后需要同步修改网站并重新部署。

运行 `node tests/catalog.test.js` 可验证目录搜索、显示数量、空结果状态和三个插件的跳转链接；此检查不模拟浏览器界面。

发布前应核对版本与源码/Release 链接。推荐将站点源码托管于独立 Git 仓库，并在 Cloudflare Pages 中使用 Git 集成发布：选择静态站点、构建命令 `exit 0`，输出目录指向包含 `index.html` 的仓库根目录。也可使用其他静态托管。不要把凭证或私钥放到此目录。

站点已通过 Cloudflare Pages 的 Git 集成部署，并绑定 `plugin.quicklauncher.flyee.tech`。后续调整自定义域名时，先在 Pages 项目中关联，再按 Cloudflare 提供的目标配置 CNAME 并检查证书状态；应先核对现有 DNS 记录，避免影响其他服务。该域名是多级子域，需要确认最终证书覆盖。
