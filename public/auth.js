/* =========================================================
   Férias CK-Labs — checkpoint de embarque (cortina visual).
   NÃO é segurança: o conteúdo é servido integralmente; a
   proteção real planejada é Basic Auth no nginx (TATOOINE).
   Senha: alterar PASSWORD abaixo (único lugar permitido).
   ========================================================= */
(function () {
  var PASSWORD = "mjaf1699";
  var KEY = "ferias_cklabs_auth";

  function unveil() {
    var v = document.getElementById("gate-veil");
    if (v) v.remove();
  }

  var authed = false;
  try { authed = sessionStorage.getItem(KEY) === "ok"; } catch (e) { /* fica fechado */ }
  if (authed) { unveil(); return; }

  var ov = document.createElement("div");
  ov.style.cssText =
    "visibility:visible;position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;" +
    "display:flex;align-items:center;justify-content:center;padding:20px;" +
    "background:#fef3c7;font-family:'Inter Variable',Inter,sans-serif";
  ov.innerHTML =
    '<form id="ck-form" style="background:#fff;border-radius:14px;box-shadow:0 6px 0 rgba(28,25,23,.12);' +
    'width:min(360px,92vw);overflow:hidden;text-align:center">' +
    '<div style="background:#1c1917;color:#fef3c7;font-family:monospace;font-size:.7rem;' +
    'letter-spacing:.25em;padding:10px">CHECKPOINT DE EMBARQUE</div>' +
    '<div style="padding:26px 24px">' +
    '<div style="font-size:2.2rem" aria-hidden="true">🛂</div>' +
    '<h1 style="margin:8px 0 4px;font-size:1.1rem;color:#1c1917">Férias CK-Labs</h1>' +
    '<p style="color:#78716c;font-size:.85rem;margin:0 0 16px">Área privada. Informe a senha.</p>' +
    '<input id="ck-pass" type="password" name="password" autocomplete="current-password" ' +
    'placeholder="Senha" aria-label="Senha" ' +
    'style="width:100%;padding:12px;border:1.5px solid #d6d3d1;border-radius:10px;font-size:1rem" />' +
    '<div id="ck-err" role="alert" style="color:#b91c1c;font-size:.8rem;min-height:18px;margin:8px 0"></div>' +
    '<button type="submit" style="width:100%;padding:12px;border:0;border-radius:10px;' +
    'background:#f59e0b;color:#1c1917;font-weight:800;font-size:1rem;cursor:pointer">Embarcar</button>' +
    '</div>' +
    '<div style="border-top:2px dashed #e7e5e4;padding:8px;font-family:monospace;' +
    'font-size:.6rem;color:#a8a29e">CK-LABS AIRLINES · ACESSO RESTRITO</div>' +
    "</form>";

  function mount() {
    document.body.appendChild(ov);
    var input = document.getElementById("ck-pass");
    input.focus();
    document.getElementById("ck-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = (input.value || "").trim();
      if (val === PASSWORD) {
        try { sessionStorage.setItem(KEY, "ok"); } catch (e2) { /* segue sem persistir */ }
        ov.remove();
        unveil();
      } else {
        document.getElementById("ck-err").textContent = "Senha incorreta.";
        input.select();
      }
    });
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
