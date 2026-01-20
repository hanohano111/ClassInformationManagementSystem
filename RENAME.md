# 项目重命名与配置指引

本指南帮助你将本模板重命名为自己的课堂信息化小程序项目，并调整相关配置。按步骤完成可避免构建、发布或云开发环境中的命名冲突。

## 1. 基础信息
- 当前项目根目录：`ClassInformation`
- 主要清单文件：`project.config.json`、`app.json`、`package.json`
- 小程序平台：微信小程序 + 云开发

## 2. 推荐命名规范
- **小程序名称**：简洁、避免特殊字符，示例：`课堂助手`、`班级云`
- **AppID 对应的项目名**：与微信小程序后台一致
- **代码目录名**：建议使用英文短名，示例：`class-assistant`、`edu-classroom`

## 3. 需修改的文件与字段
1) `project.config.json`  
   - `projectname`：改为新项目名  
   - `appid`：填写你的小程序 AppID  
   - 如有自定义编译条件，更新 `setting` 里对应路径

2) `app.json`  
   - `window.navigationBarTitleText`：更新为新项目名  
   - 若有自定义 tabBar 文案/图标，同步修改 `tabBar.list`

3) `package.json`  
   - `name`、`description`、`version`、`author`：按需更新

4) `README.md` / 文档  
   - 将项目介绍、截图、链接替换为你的项目信息

5) 云开发环境（如使用）  
   - 确认环境 ID，无需在代码中硬编码；若有硬编码需替换  
   - 数据库集合命名保持与现有设计一致或批量调整

## 4. 路径与资源检查
- 图片/静态资源：`static/` 下若包含品牌 Logo，请替换为新品牌资源
- 自定义组件或样式变量：`variable.less` 等文件中的品牌色、字体可按需更新

## 5. 加密与安全配置
- 加密相关文件：`config/api-encryption-config.js`、`api/request.js`、`utils/crypto.js`
- 如后端域名或密钥获取接口有变动，需在请求层调整基础 URL 与获取密钥逻辑

## 6. 构建与校验
- 运行 `npm install`，在微信开发者工具中重新构建 npm
- 打开项目确保页面正常渲染、接口调用路径无误

## 7. 常见问题
- **项目名已被占用？** 更换本地目录名与 `project.config.json` 的 `projectname`。  
- **AppID 未同步？** 在微信开发者工具「详情」-「基本信息」确认 AppID，并与 `project.config.json` 保持一致。  
- **图标/标题仍显示旧名？** 检查 `app.json` 的 `window` 与 `tabBar` 配置，重新编译预览。  
- **接口域名异常？** 确认开发/体验环境域名在小程序后台已配置可信域。  

完成以上修改后，即可将模板平滑迁移为你的项目。若需更多个性化调整，可在 `docs/` 目录补充你的团队规范与部署说明。***
