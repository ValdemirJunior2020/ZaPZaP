// Small, accessible, dependency-free Nexus AI support dialog.
(() => {
  "use strict";
  const address = "nexusai.helpdesk@gmail.com";
  let dialog = null;
  let copyButton = null;
  let status = null;
  let returnFocus = null;
  const styles = `
.nx-support-dialog{border:1px solid #d6eadd;border-radius:19px;padding:0;width:min(390px,calc(100vw - 28px));max-width:calc(100vw - 28px);background:#fff;color:#183d2e;box-shadow:0 24px 75px #15392b36;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}
.nx-support-dialog::backdrop{background:rgba(8,28,23,.46)}
.nx-support-inner{padding:23px}
.nx-support-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.nx-support-title{margin:0;font-weight:850;font-size:19px;letter-spacing:-.4px}
.nx-support-close{border:0;background:#f0f6f2;color:#446f5a;border-radius:9px;font-size:21px;width:34px;height:34px;cursor:pointer}
.nx-support-caption{font-size:12px;color:#688575;margin:8px 0 18px;line-height:1.5}
.nx-support-address{display:block;background:#f3faf5;border:1px solid #d2e8db;border-radius:11px;padding:13px 10px;font-size:13px;font-weight:750;text-align:center;overflow-wrap:anywhere;user-select:all}
.nx-support-copy{border:0;border-radius:11px;background:#078f68;color:white;padding:12px 18px;font-size:14px;font-weight:800;cursor:pointer;width:100%;margin-top:14px;min-height:44px}
.nx-support-copy:focus-visible,.nx-support-close:focus-visible{outline:3px solid #79dabb;outline-offset:2px}
.nx-support-status{min-height:18px;color:#13764f;text-align:center;font-size:12px;margin:8px 0 0}
`;
  function createDialog() {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);
    dialog = document.createElement("dialog");
    dialog.className = "nx-support-dialog";
    dialog.setAttribute("aria-labelledby", "nx-support-heading");
    dialog.innerHTML = `<div class="nx-support-inner">
      <div class="nx-support-top"><h2 class="nx-support-title" id="nx-support-heading">Nexus AI Support</h2>
        <button class="nx-support-close" type="button" aria-label="Close support popup">×</button></div>
      <p class="nx-support-caption">Need assistance? Copy our support email address below.</p>
      <span class="nx-support-address" id="nx-support-address"></span>
      <button class="nx-support-copy" type="button">Copy email</button>
      <p class="nx-support-status" role="status" aria-live="polite"></p>
    </div>`;
    dialog.querySelector("#nx-support-address").textContent = address;
    copyButton = dialog.querySelector(".nx-support-copy");
    status = dialog.querySelector(".nx-support-status");
    dialog.querySelector(".nx-support-close").addEventListener("click", () => dialog.close());
    copyButton.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(address);
        copyButton.textContent = "Copied!";
        status.textContent = "Email address copied.";
      } catch {
        // Manual selection works in embedded mobile browsers that restrict clipboard access.
        const range = document.createRange();
        range.selectNodeContents(dialog.querySelector("#nx-support-address"));
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        status.textContent = "Select and copy the highlighted email address.";
      }
    });
    dialog.addEventListener("close", () => {
      if (returnFocus?.isConnected) returnFocus.focus();
    });
    document.body.appendChild(dialog);
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-nexus-support]");
    if (!trigger) return;
    event.preventDefault();
    if (!dialog) createDialog();
    returnFocus = trigger;
    copyButton.textContent = "Copy email";
    status.textContent = "";
    if (!dialog.open) dialog.showModal();
  });
})();
