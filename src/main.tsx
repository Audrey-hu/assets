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
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI).href)
      .catch(() => undefined);
  });
}
