
// ================= Networking (PeerJS, host-authoritative — same model as Mine with friends) =================
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
function lobbyMsg(text, bad) { const el = document.getElementById("lobby-msg"); el.textContent = text; el.className = "lobby-msg" + (bad ? " bad" : ""); }
function myName() { return document.getElementById("my-name").value.trim().slice(0, 12) || null; }
function teardown() {
  try { net.conn && net.conn.close(); } catch {}
  try { net.peer && net.peer.destroy(); } catch {}
  net = { peer: null, conn: null, isHost: false, seat: 0, code: "", connected: false };
  clockSkew = 0;
}
function recordRecent(code, role) {
  const list = (readJSON(RECENT_KEY) || []).filter(r => r.code !== code);
  list.unshift({ code, role, at: Date.now() });
  writeJSON(RECENT_KEY, list.slice(0, 8));
}

function hostLobby(code) {
  const name = myName();
  if (!name) return lobbyMsg("Enter your name first.", true);
  if (typeof Peer === "undefined") return lobbyMsg("Couldn't load the multiplayer library. Check your connection.", true);
  teardown();
  lobbyMsg("Opening lobby…");
  const reopening = !!code;
  code = code || genCode();
  const peer = new Peer(PEER_PREFIX + code);
  net.peer = peer;
  peer.on("open", () => {
    net.isHost = true; net.seat = 0; net.code = code;
    const saved = readJSON(saveKey(code));
    state = saved && saved.players ? migrate(saved) : newGame();
    state.players.forEach(p => p.line = null);
    state.players[0].name = name; state.players[0].look = myLook;
    writeJSON(PREFS_KEY, { ...(readJSON(PREFS_KEY) || {}), name, lastCode: code });
    recordRecent(code, "host");
    save(); enterGame();
  });
  peer.on("connection", c => {
    if (net.conn && net.conn.open) {   // only one guest allowed
      c.on("open", () => { c.send({ type: "full" }); setTimeout(() => c.close(), 300); });
      return;
    }
    net.conn = c;
    c.on("data", msg => onHostData(c, msg));
    c.on("close", () => { if (net.conn === c) { net.conn = null; state.players[1].line = null; setConnected(false); } });
  });
  peer.on("error", err => {
    if (err.type === "unavailable-id") {
      if (reopening) return lobbyMsg(`Lobby ${code} is already open somewhere else.`, true);
      return hostLobby();
    }
    if (!net.code) lobbyMsg("Couldn't open a lobby: " + err.type, true);
  });
  peer.on("disconnected", () => { try { peer.reconnect(); } catch {} });
}

function onHostData(c, msg) {
  if (msg.type === "hello") {
    if (msg.saved && msg.saved.players && progress(msg.saved) > progress(state)) {
      const me = state.players[0];
      state = migrate(msg.saved);
      Object.assign(state.players[0], { x: me.x, y: me.y, dir: me.dir });
    }
    state.players.forEach(p => p.line = null);
    state.players[0].name = myName() || state.players[0].name; state.players[0].look = myLook;
    state.players[1].name = String(msg.name || "Player 2").slice(0, 12);
    state.players[1].look = cleanLook(msg.look, 1);
    save(); setConnected(true);
    broadcast({ text: `${state.players[1].name} joined — let's go fishing!`, ok: true });
  } else if (msg.type === "chat") {
    addChat(1, msg.text);
  } else if (msg.type === "action") {
    const result = applyAction(1, msg.action);
    if (result) { save(); broadcast(result); }
  } else if (msg.type === "move") {
    const g = state.players[1];
    if (DIRS[msg.dir]) g.dir = msg.dir;
    if (typeof msg.x === "number" && typeof msg.y === "number" && walkable(msg.x, msg.y) && Math.hypot(msg.x - g.x, msg.y - g.y) < 4) { g.x = msg.x; g.y = msg.y; }
    else if ((msg.tp ?? g.tp) !== g.tp) {}
    g.anim = msg.anim || 0;
  }
}

function broadcast(result) {
  if (net.conn && net.conn.open) net.conn.send({ type: "state", state, result, now: Date.now() });
  onResult(result);
}
let lastMoveSent = 0, lastMoveKey = "";
function sendMove(force) {
  const me = state.players[net.seat], now = performance.now();
  const key = me.x.toFixed(2) + me.y.toFixed(2) + me.dir + (me.anim || 0);
  if (!force && (key === lastMoveKey || now - lastMoveSent < 70)) return;
  lastMoveKey = key; lastMoveSent = now;
  if (net.conn && net.conn.open) net.conn.send({ type: net.isHost ? "pos" : "move", seat: net.seat, x: +me.x.toFixed(3), y: +me.y.toFixed(3), dir: me.dir, anim: me.anim || 0 });
}

function joinLobby(code) {
  const name = myName();
  if (!name) return lobbyMsg("Enter your name first.", true);
  code = (code || "").trim().toUpperCase();
  if (code.length !== 5) return lobbyMsg("Lobby codes are 5 characters.", true);
  if (typeof Peer === "undefined") return lobbyMsg("Couldn't load the multiplayer library. Check your connection.", true);
  teardown();
  lobbyMsg("Joining " + code + "…");
  const peer = new Peer();
  net.peer = peer;
  peer.on("open", () => {
    const c = peer.connect(PEER_PREFIX + code, { reliable: true });
    net.conn = c;
    c.on("open", () => c.send({ type: "hello", name, look: myLook, saved: readJSON(saveKey(code)) }));
    c.on("data", msg => {
      if (msg.type === "full") { teardown(); showLobby(); return lobbyMsg("That lobby is full (2 players max).", true); }
      if (msg.type === "pos") {
        const p = state && state.players[msg.seat];
        if (p && msg.seat !== net.seat) Object.assign(p, { x: msg.x, y: msg.y, dir: msg.dir, anim: msg.anim || 0 });
        return;
      }
      if (msg.type === "chat") { addChat(msg.seat, msg.text); return; }
      if (msg.type === "state") {
        const first = !net.code;
        if (typeof msg.now === "number") clockSkew = Date.now() - msg.now;
        const mine = state && state.players[1];
        state = migrate(msg.state);
        state.players.forEach((p, i) => { p.line = msg.state.players[i].line || null; });
        // keep our own live position (the host's copy can be a step behind) unless the host moved us on purpose
        if (!first && mine && state.players[1].tp === mine.tp) Object.assign(state.players[1], { x: mine.x, y: mine.y, dir: mine.dir });
        if (first) {
          net.isHost = false; net.seat = 1; net.code = code;
          writeJSON(PREFS_KEY, { ...(readJSON(PREFS_KEY) || {}), name, lastCode: code });
          recordRecent(code, "guest");
          enterGame();
        }
        save(); setConnected(true); onResult(msg.result);
      }
    });
    c.on("close", () => {
      setConnected(false);
      if (net.code) toast("The host left. Your progress is saved — rejoin when they reopen the lobby.", "bad", 8000);
    });
  });
  peer.on("error", err => {
    if (err.type === "peer-unavailable") { teardown(); showLobby(); lobbyMsg(`No open lobby with code ${code}.`, true); }
    else if (!net.code) lobbyMsg("Couldn't join: " + err.type, true);
  });
}

function sendAction(action) {
  if (!state) return;
  if (net.isHost) {
    const result = applyAction(0, action);
    if (result) { save(); broadcast(result); }
  } else if (net.conn && net.conn.open) {
    net.conn.send({ type: "action", action });
  }
}

// ---- Chat (with speech bubbles over the angler)
const bubbles = [null, null];
function addChat(seat, text) {
  text = String(text || "").slice(0, 120).trim();
  if (!text || !state) return;
  const log = document.getElementById("chat-log"), d = document.createElement("div");
  d.innerHTML = `<b class="who${seat}">${esc(state.players[seat].name)}:</b> ${esc(text)}`;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
  while (log.children.length > 40) log.firstChild.remove();
  bubbles[seat] = { text: text.length > 40 ? text.slice(0, 38) + "…" : text, until: performance.now() + 5000 };
}
function sendChat(text) {
  text = text.trim(); if (!text) return;
  if (net.isHost) { addChat(0, text); if (net.conn && net.conn.open) net.conn.send({ type: "chat", seat: 0, text }); }
  else { addChat(1, text); if (net.conn && net.conn.open) net.conn.send({ type: "chat", text }); }
}
