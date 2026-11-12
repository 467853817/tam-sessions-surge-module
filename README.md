# tam-sessions-surge-module

Surge 专用模块：改写天安门城楼预约接口 `bookingquery/sessions` 的响应，让场次显示为「有票可约」。

**只影响客户端显示，不影响服务端真实库存与下单校验。**

---

## 一键导入（推荐）

在 Surge → **模块** → **安装新模块**，粘贴以下任一链接：

```
https://fastly.jsdelivr.net/gh/467853817/tam-sessions-surge-module@main/booking_sessions.sgmodule
```

备用节点：

```
https://gcore.jsdelivr.net/gh/467853817/tam-sessions-surge-module@main/booking_sessions.sgmodule
https://testingcf.jsdelivr.net/gh/467853817/tam-sessions-surge-module@main/booking_sessions.sgmodule
https://raw.githubusercontent.com/467853817/tam-sessions-surge-module/main/booking_sessions.sgmodule
```

安装后勾选启用即可。

---

## 生效条件（缺一不可）

1. 已安装并**完全信任** Surge 的 MITM 证书（系统设置 → 通用 → 关于本机 → 证书信任设置）
2. 开启 **MITM** 和 **脚本**
3. 模块已启用
4. 同时只运行一个代理/抓包 App
5. 改完规则后**杀掉目标 App 再重新打开**（不要用缓存页面）

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `booking_sessions.sgmodule` | Surge 模块（远程安装用） |
| `booking_sessions.js` | 核心改写脚本 |

模块已配置：
- 匹配 `wap.` 和 `www.` 两个域名
- `script-path` 指向本仓库最新脚本（jsDelivr）
- MITM 使用 `%APPEND%`，不会覆盖你已有的 hostname

---

## 改写字段

| 字段 | 无票时 | 改写后 |
|------|--------|--------|
| `remaining` | `-1` | `999` |
| `remaining_total` | `-1` | `999` |
| `remaining_check` | `0` | `1` |
| `status` | `0` | `1`（可选） |

已结束场次默认跳过（`SKIP_EXPIRED = true`），闭馆日空数组原样保留。
