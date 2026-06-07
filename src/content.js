(() => {
  "use strict";

  const BTN_ID = "diffshub-open-btn";
  const TARGET_HOST = "diffshub.com";
  const SVG_NS = "http://www.w3.org/2000/svg";

  function diffshubUrl() {
    const u = new URL(location.href);
    u.hostname = TARGET_HOST;
    return u.toString();
  }

  // The PR title <h1> carries the PR number, so we can find it without relying
  // on hashed class names. (Compare pages have no stable anchor — handled in
  // the background worker via the menu/toolbar instead.)
  function findPrTitle() {
    const m = location.pathname.match(/\/pull\/(\d+)/);
    if (!m) return null;
    const needle = "#" + m[1];
    for (const h of document.querySelectorAll("h1")) {
      if ((h.textContent ?? "").includes(needle)) return h;
    }
    return null;
  }

  function buildIcon() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    // Primer Octicon "link-external".
    path.setAttribute(
      "d",
      "M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"
    );
    svg.appendChild(path);
    return svg;
  }

  function buildButton() {
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.title = "Open in Diffshub";
    btn.setAttribute("aria-label", "Open in Diffshub");
    btn.appendChild(buildIcon());

    const label = document.createElement("span");
    label.textContent = "Diffshub";
    btn.appendChild(label);

    Object.assign(btn.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      height: "30px",
      padding: "0 12px",
      marginLeft: "8px",
      boxSizing: "border-box",
      borderRadius: "6px",
      border:
        "1px solid var(--button-default-borderColor-rest, var(--borderColor-default, rgba(31,35,40,0.15)))",
      background: "var(--button-default-bgColor-rest, var(--color-btn-bg, #f6f8fa))",
      color: "var(--button-default-fgColor-rest, var(--color-btn-text, #24292f))",
      fontFamily: "inherit",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "1",
      cursor: "pointer",
      verticalAlign: "middle",
      textDecoration: "none",
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(diffshubUrl(), "_blank", "noopener,noreferrer");
    });

    return btn;
  }

  function tryInject() {
    if (!/\/pull\/\d+/.test(location.pathname)) return;
    if (document.getElementById(BTN_ID)) return;
    const anchor = findPrTitle();
    if (!anchor) return;
    const btn = buildButton();
    // Nudge up ~16% of font-size: vertical-align:middle sits below the title's
    // visual (cap-height) center.
    const fs = parseFloat(getComputedStyle(anchor).fontSize);
    if (fs > 0) btn.style.transform = `translateY(${(-fs * 0.16).toFixed(1)}px)`;
    anchor.appendChild(btn);
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById(BTN_ID)) tryInject();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // GitHub navigates via Turbo/SPA, not full loads.
  document.addEventListener("turbo:load", tryInject);
  document.addEventListener("pjax:end", tryInject);
  window.addEventListener("popstate", tryInject);

  tryInject();
})();
