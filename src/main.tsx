import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* file:// 下不注册 service worker：既没有 sw.js，也会被浏览器拒绝 */
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  location.protocol.startsWith("http")
) {
  /*
   * 请求持久化存储：装成 App 之后，尽量避免系统在空间紧张时清掉本地数据。
   * iOS 上这个 API 不一定生效，但 Chrome / Android 上有效，问了没坏处。
   */
  navigator.storage?.persist?.().catch(() => undefined);

  const hadController = Boolean(navigator.serviceWorker.controller);

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI).href)
      .then((registration) => registration.update().catch(() => undefined))
      .catch(() => undefined);
  });

  /*
   * 新版本接管后自动刷新一次。
   * 否则用户会一直看到 service worker 缓存里的旧界面 ——
   * "明明更新了，刷新了还是老样子"就是这么来的。
   */
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    window.location.reload();
  });
}
