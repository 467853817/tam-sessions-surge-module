/*
 * bookingquery/sessions 响应改写脚本
 * 适配: Surge / Loon / Quantumult X / Shadowrocket / Stash / Stream(StormSniffer) 等支持 JS 的引擎
 *
 * 设计要点:
 *   1. 只做字段级改写, 后端返回的真实结构(esid / 起止时间 / summary / 闭馆空数组)原样透传
 *   2. 不写死任何日期, 日期键全部来自后端响应
 *   3. SKIP_EXPIRED 打开后, 已结束的场次不会被标成有票, 避免"过去时间显示可预约"
 */

(function () {
  'use strict';

  // ======== 可调参数 ========
  var FORCE_VALUE = 999;        // 显示成多少张余票
  var FORCE_STATUS = 1;         // 1 = 可选, 0 = 不可选
  var FORCE_CODE = null;        // 需要把 code 改成成功码时写 'A00000'
  var TOUCH_ALTERNATE = false;  // true 时把 alternate:-1 改为 0

  // ======== 时间窗口 ========
  var SKIP_EXPIRED = true;      // true = 已结束的场次保持原样(不标成有票)
  var DAY_WINDOW_DAYS = 0;      // 0 = 不限制; N = 只处理从今天起 N 天内的日期
  var DAY_MS = 86400000;

  var IS_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
  var TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;

  function parseMinute(s) {
    if (typeof s !== 'string') return null;
    var m = TIME_RE.exec(s);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0).getTime();
  }

  function dayStartMs(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0).getTime();
  }

  function rewriteObject(obj, nowMs, opts) {
    if (!obj || typeof obj !== 'object') return obj;
    opts = opts || {};
    var skipExpired = opts.skipExpired === undefined ? SKIP_EXPIRED : opts.skipExpired;
    var windowDays = opts.windowDays === undefined ? DAY_WINDOW_DAYS : opts.windowDays;

    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var today = new Date(now);
    today.setHours(0, 0, 0, 0);
    var todayMs = today.getTime();
    var limitMs = windowDays > 0 ? todayMs + windowDays * DAY_MS : Infinity;

    if (FORCE_CODE) obj.code = FORCE_CODE;

    Object.keys(obj).forEach(function (key) {
      if (!IS_DATE_KEY.test(key)) return;
      var day = obj[key];
      if (!day || typeof day !== 'object') return;
      var list = day.sessions;
      if (!Array.isArray(list)) return;
      if (list.length === 0) return;                 // 闭馆日空数组: 原样保留, 不新增字段

      var ds = dayStartMs(key);
      if (windowDays > 0 && ds !== null && (ds < todayMs || ds > limitMs)) {
        return;                                      // 窗口外的日期: 不改
      }

      var touched = 0;
      list.forEach(function (s) {
        if (!s || typeof s !== 'object') return;
        var end = parseMinute(s.endtime);
        if (end === null) end = parseMinute(s.begintime);
        if (skipExpired && end !== null && end <= now) return;   // 已结束: 保持原值

        s.remaining = FORCE_VALUE;
        s.remaining_check = 1;
        if (FORCE_STATUS !== null && FORCE_STATUS !== undefined) s.status = FORCE_STATUS;
        if (TOUCH_ALTERNATE && typeof s.alternate === 'number' && s.alternate < 0) s.alternate = 0;
        touched++;
      });

      if (touched === 0) {
        day.remaining_total = 0;                     // 全天已过: 归零, 不伪造有票
      } else {
        day.remaining_total = FORCE_VALUE;
        day.remaining_check = 1;
      }
    });
    return obj;
  }

  // ======== 正则兜底(JSON 解析失败时, 无法判断时间, 只做数值替换) ========
  function rewriteText(body) {
    return body
      .replace(/"remaining"\s*:\s*-?\d+/g, '"remaining":' + FORCE_VALUE)
      .replace(/"remaining_total"\s*:\s*-?\d+/g, '"remaining_total":' + FORCE_VALUE)
      .replace(/"remaining_check"\s*:\s*-?\d+/g, '"remaining_check":1');
  }

  function rewriteBody(body, nowMs, opts) {
    if (typeof body !== 'string' || !body) return body;
    try {
      return JSON.stringify(rewriteObject(JSON.parse(body), nowMs, opts));
    } catch (e) {
      return rewriteText(body);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rewriteBody: rewriteBody, rewriteObject: rewriteObject, parseMinute: parseMinute };
  }

  if (typeof $response !== 'undefined' && typeof $done === 'function') {
    try {
      $done({ body: rewriteBody($response.body) });
    } catch (e) {
      $done({});
    }
  }
})();
