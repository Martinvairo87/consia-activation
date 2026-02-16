// CONSIA OWNER PANEL — TOP 1 GLOBAL ACTIVE

let API = "https://api.consia.world";
let autoTimer = null;

const $ = (id) => document.getElementById(id);

function getToken() {
  return sessionStorage.getItem("CONSIA_OWNER_TOKEN") || "";
}
function setToken(t) {
  sessionStorage.setItem("CONSIA_OWNER_TOKEN", t);
}

function headers(owner=false) {
  const h = { "content-type":"application/json", "x-consia-device":"owner-panel" };
  if (owner) {
    const t = getToken();
    if (t) h["authorization"] = "Bearer " + t;
  }
  return h;
}

async function call(path, { method="GET", owner=false, body=null } = {}) {
  const url = API.replace(/\/$/,"") + path;
  const opt = { method, headers: headers(owner) };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(url, opt);
  let data = null;
  try { data = await res.json(); } catch { data = { ok:false, error:"non_json" }; }
  return { res, data };
}

function setOnline(isOnline) {
  const badge = $("badge");
  if (isOnline) {
    badge.className = "badge ok";
    badge.textContent = "API ONLINE";
  } else {
    badge.className = "badge danger";
    badge.textContent = "API OFFLINE";
  }
}

function out(obj) {
  $("out").textContent = JSON.stringify(obj, null, 2);
}

function renderStatus(s) {
  $("s_service").textContent = s.service || "—";
  $("s_version").textContent = s.version || "—";
  $("s_core").textContent = s.core || "—";
  $("s_ai").textContent = s.ai || "—";
  $("s_global").textContent = s.global || s.status || "—";
  $("s_ts").textContent = String(s.ts || "—");
}

async function loadStatus() {
  const { res, data } = await call("/", { method:"GET", owner:false });
  setOnline(res.ok && data.ok);
  if (data && typeof data === "object") renderStatus(data);
  return data;
}

async function ownerStatus() {
  const { data } = await call("/owner/status", { owner:true });
  out(data);
  return data;
}

async function whoami() {
  const { data } = await call("/owner/whoami", { owner:true });
  out(data);
}

async function health() {
  const { data } = await call("/health", { owner:false });
  out(data);
}

async function executeBest() {
  const { data } = await call("/owner/execute-best-action", { method:"POST", owner:true });
  out(data);
  await loadStatus();
  return data;
}

async function emergencyLock() {
  const { data } = await call("/owner/emergency-lock", { method:"POST", owner:true });
  out(data);
  await loadStatus();
}

async function safeMode() {
  const { data } = await call("/owner/safe-mode", { method:"POST", owner:true });
  out(data);
  await loadStatus();
}

async function logsLoad() {
  const limit = parseInt($("logLimit").value || "80", 10);
  const { data } = await call(`/owner/logs?limit=${limit}`, { owner:true });
  $("logs").textContent = JSON.stringify(data.logs || [], null, 2);
  return data.logs || [];
}

function logsFilterApply() {
  const raw = $("logs").textContent || "[]";
  let arr = [];
  try { arr = JSON.parse(raw); } catch {}
  const q = ($("logFilter").value || "").toLowerCase();
  if (!q) return;
  const filtered = arr.filter(x => JSON.stringify(x).toLowerCase().includes(q));
  $("logs").textContent = JSON.stringify(filtered, null, 2);
}

function logsClear() {
  $("logs").textContent = "[]";
  $("logFilter").value = "";
}

function copyLogs() {
  navigator.clipboard.writeText($("logs").textContent || "[]");
}

function exportJSON() {
  const blob = new Blob([$("logs").textContent || "[]"], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `consia_logs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadNodes() {
  const { data } = await call("/system/nodes", { owner:false });
  $("nodes").textContent = JSON.stringify(data, null, 2);
}

async function vaultStatus() {
  const { data } = await call("/owner/vault/status", { owner:true });
  $("vault").textContent = JSON.stringify(data, null, 2);
}

async function vaultRotate() {
  const { data } = await call("/owner/vault/rotate", { method:"POST", owner:true });
  $("vault").textContent = JSON.stringify(data, null, 2);
}

async function vaultLock() {
  const { data } = await call("/owner/vault/lock", { method:"POST", owner:true });
  $("vault").textContent = JSON.stringify(data, null, 2);
}

async function vaultUnlock() {
  const { data } = await call("/owner/vault/unlock", { method:"POST", owner:true });
  $("vault").textContent = JSON.stringify(data, null, 2);
}

function setAuto(on) {
  const b = $("autoBadge");
  if (on) { b.className = "badge ok"; b.textContent = "AUTO: ON"; }
  else { b.className = "badge warn"; b.textContent = "AUTO: OFF"; }
}

function startAuto() {
  stopAuto();
  const sec = Math.max(3, parseInt($("intervalInput").value || "12", 10));
  setAuto(true);
  autoTimer = setInterval(async () => {
    await executeBest();
    await logsLoad();
  }, sec * 1000);
}

function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  setAuto(false);
}

function tabSwitch(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".pane").forEach(p => p.classList.add("hide"));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add("active");
  document.getElementById(`pane-${name}`).classList.remove("hide");
}

// INIT
(function init(){
  const savedApi = sessionStorage.getItem("CONSIA_API") || API;
  API = savedApi;
  $("apiInput").value = API;

  const t = getToken();
  if (t) $("tokenInput").value = t;

  $("btnShow").onclick = () => {
    const i = $("tokenInput");
    i.type = (i.type === "password") ? "text" : "password";
  };

  $("btnSave").onclick = () => {
    API = $("apiInput").value.trim().replace(/\/$/,"");
    sessionStorage.setItem("CONSIA_API", API);
    setToken($("tokenInput").value.trim());
    alert("Token saved (session only).");
  };

  $("btnRefresh").onclick = async () => { await loadStatus(); };

  $("btnExec").onclick = async () => { await executeBest(); };
  $("btnLock").onclick = async () => { await emergencyLock(); };
  $("btnSafe").onclick = async () => { await safeMode(); };

  $("btnStart").onclick = () => startAuto();
  $("btnStop").onclick = () => stopAuto();

  $("btnOwnerStatus").onclick = async () => { await ownerStatus(); };
  $("btnHealth").onclick = async () => { await health(); };
  $("btnWhoami").onclick = async () => { await whoami(); };

  $("btnLogsLoad").onclick = async () => { await logsLoad(); };
  $("btnLogsLive").onclick = () => startAuto();
  $("btnLogsClear").onclick = () => logsClear();

  $("logFilter").oninput = () => {
    // no destructive filtering; apply when text exists
  };
  $("logFilter").onchange = () => logsFilterApply();

  $("btnCopy").onclick = () => copyLogs();
  $("btnExport").onclick = () => exportJSON();

  $("btnNodes").onclick = async () => { await loadNodes(); };

  $("btnVaultStatus").onclick = async () => { await vaultStatus(); };
  $("btnVaultRotate").onclick = async () => { await vaultRotate(); };
  $("btnVaultLock").onclick = async () => { await vaultLock(); };
  $("btnVaultUnlock").onclick = async () => { await vaultUnlock(); };

  document.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => tabSwitch(t.dataset.tab);
  });

  loadStatus();
})();
