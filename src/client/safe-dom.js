/* Central HTML security boundary for the static client. */
(() => {
  "use strict";

  const config = Object.freeze({
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS: ["base", "embed", "iframe", "object", "script"],
    FORBID_ATTR: ["srcdoc"],
    ALLOW_DATA_ATTR: true,
    ALLOW_ARIA_ATTR: true
  });

  function sanitize(markup) {
    if (!window.DOMPurify) throw new Error("The HTML sanitizer is unavailable.");
    return window.DOMPurify.sanitize(String(markup ?? ""), config);
  }

  function setHTML(element, markup) {
    if (element) element.innerHTML = sanitize(markup);
    return element;
  }

  function insertHTML(element, position, markup) {
    if (element) element.insertAdjacentHTML(position, sanitize(markup));
    return element;
  }

  window.REP_SAFE_DOM = Object.freeze({ sanitize, setHTML, insertHTML });
})();
