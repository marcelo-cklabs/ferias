/* =========================================================
   Férias CK-Labs — gate de senha simples (hardcoded).
   Repo é PRIVADO, então a senha no front é aceitável por ora.
   Para trocar a senha: alterar PASSWORD abaixo.
   Se um dia quiser algo mais robusto: migrar para Basic Auth no nginx do TATOOINE.
   ========================================================= */
(function () {
  var PASSWORD = "mjaf1699"; // <-- definir com o Marcelo
  var KEY = "ferias_cklabs_auth";

  if (sessionStorage.getItem(KEY) === "ok") return; // já autenticado nesta aba

  // Overlay de bloqueio
  var ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;" +
    "justify-content:center;background:linear-gradient(135deg,#0e7490,#0c4a6e);font-family:sans-serif";
  ov.innerHTML =
    '<div style="background:#fff;padding:28px 26px;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.3);width:min(340px,90vw);text-align:center">' +
    '<div style="font-size:2rem">🔒</div>' +
    '<h2 style="margin:8px 0 4px;font-size:1.15rem;color:#0f172a">Férias CK-Labs</h2>' +
    '<p style="color:#64748b;font-size:.85rem;margin-bottom:14px">Área privada. Informe a senha.</p>' +
    '<input id="ck-pass" type="password" placeholder="Senha" ' +
    'style="width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:1rem" />' +
    '<div id="ck-err" style="color:#b91c1c;font-size:.8rem;height:16px;margin:6px 0"></div>' +
    '<button id="ck-ok" style="width:100%;padding:11px;border:0;border-radius:10px;background:#f59e0b;' +
    'color:#fff;font-weight:800;font-size:1rem;cursor:pointer">Entrar</button>' +
    "</div>";

  // Esconde o conteúdo até autenticar
  document.documentElement.style.overflow = "hidden";
  function mount() {
    document.body.appendChild(ov);
    document.getElementById("ck-pass").focus();
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  function tryLogin() {
    var val = document.getElementById("ck-pass").value;
    if (val === PASSWORD) {
      sessionStorage.setItem(KEY, "ok");
      ov.remove();
      document.documentElement.style.overflow = "";
    } else {
      document.getElementById("ck-err").textContent = "Senha incorreta.";
      document.getElementById("ck-pass").select();
    }
  }
  ov.addEventListener("click", function (e) {
    if (e.target.id === "ck-ok") tryLogin();
  });
  ov.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryLogin();
  });
})();
