import '../src/style.css';
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "https://quaint-kookabura-706.convex.cloud";
const convex = new ConvexClient(CONVEX_URL);

const CHURCH_NAME = "Calvary Charismatic Center";
const CHURCH_LOCATION = "Adum";

// State
let state = {
  screen: "loading", // loading, entry, register, profile, pinEntry, admin
  phoneInput: "",
  error: "",
  regName: "",
  regMinistry: "",
  currentMember: null,

  // Admin state
  adminTab: "today", // 'today' or 'members'
  adminName: "",
  adminPhone: "",
  adminMinistry: "",
  memberSearch: "",
  todaySearch: "",
  editingPhone: null,
  editName: "",
  editPhone: "",
  editMinistry: "",
  pinInput: "",
  pinError: "",
  changingPin: false,
  currentPinInput: "",
  newPinInput: "",

  // Live Convex Data
  members: [],
  checkins: [],
  adminPin: "1234",
  isBackendConnected: false,
};

function setState(patch) {
  state = Object.assign({}, state, patch);
  render();
}

function normalizePhone(p) {
  return (p || "").replace(/\D/g, "");
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function esc(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}

function churchMark() {
  return `<div class="mark-wrapper"><div class="mark">CCC</div></div>`;
}

function churchHeading() {
  return `
    <p class="church-name">${esc(CHURCH_NAME)}</p>
    <p class="church-location">${esc(CHURCH_LOCATION)}</p>
  `;
}

function liveBadge() {
  return `
    <div class="service-line">
      <span>${esc(todayLabel())}</span>
      <span class="badge-live"><span class="pulse-dot"></span> LIVE</span>
    </div>
  `;
}

// Subscriptions
function initConvexSubscriptions() {
  const today = getTodayKey();

  // 1. Members
  convex.onUpdate(api.members.list, {}, (members) => {
    state.members = members || [];
    state.isBackendConnected = true;
    if (state.screen === "loading") {
      state.screen = "entry";
    }
    render();
  });

  // 2. Check-ins for Today
  convex.onUpdate(api.checkins.getForDate, { date: today }, (checkins) => {
    state.checkins = checkins || [];
    state.isBackendConnected = true;
    render();
  });

  // 3. Admin PIN
  convex.onUpdate(api.settings.getPin, {}, (pin) => {
    if (pin) state.adminPin = pin;
    render();
  });
}

// User Actions
async function handleLookup() {
  const digits = normalizePhone(state.phoneInput);
  if (digits.length < 7) {
    setState({ error: "Please enter a valid phone number (at least 7 digits)." });
    return;
  }

  setState({ screen: "loading", error: "" });
  try {
    const member = await convex.query(api.members.getByPhone, { phone: digits });
    if (member) {
      setState({ screen: "profile", currentMember: member, error: "" });
    } else {
      setState({ screen: "register", regName: "", regMinistry: "", error: "" });
    }
  } catch (err) {
    console.error(err);
    setState({ screen: "entry", error: "Connection error. Please try again." });
  }
}

async function handleRegisterAndCheckIn() {
  const digits = normalizePhone(state.phoneInput);
  const name = state.regName.trim();
  const ministry = state.regMinistry.trim();

  if (!name) {
    setState({ error: "Please enter your full name." });
    return;
  }

  setState({ screen: "loading", error: "" });
  try {
    const result = await convex.mutation(api.checkins.registerAndCheckIn, {
      phone: digits,
      name,
      ministry: ministry || undefined,
      date: getTodayKey(),
    });
    setState({
      screen: "profile",
      currentMember: result.member,
      error: "",
    });
  } catch (err) {
    console.error(err);
    setState({
      screen: "register",
      error: err.message || "Failed to register. Please check your network.",
    });
  }
}

async function handleCheckIn() {
  if (!state.currentMember) return;
  const digits = normalizePhone(state.currentMember.phone);

  setState({ error: "" });
  try {
    await convex.mutation(api.checkins.checkIn, {
      phone: digits,
      date: getTodayKey(),
    });
    // The check-in subscription will update the view automatically
  } catch (err) {
    console.error(err);
    setState({ error: err.message || "Unable to check in. Please try again." });
  }
}

function handlePinSubmit() {
  if (state.pinInput.trim() === state.adminPin) {
    setState({
      screen: "admin",
      pinInput: "",
      pinError: "",
      error: "",
    });
  } else {
    setState({ pinError: "Incorrect staff PIN.", pinInput: "" });
  }
}

async function handleChangePin() {
  if (state.currentPinInput !== state.adminPin) {
    setState({ error: "Current PIN does not match." });
    return;
  }
  if (!/^\d{4,8}$/.test(state.newPinInput)) {
    setState({ error: "New PIN must be 4 to 8 numeric digits." });
    return;
  }

  try {
    await convex.mutation(api.settings.setPin, {
      currentPin: state.currentPinInput,
      newPin: state.newPinInput,
    });
    setState({
      changingPin: false,
      currentPinInput: "",
      newPinInput: "",
      error: "",
    });
  } catch (err) {
    setState({ error: err.message || "Failed to update PIN." });
  }
}

async function handleAdminAddMember() {
  const digits = normalizePhone(state.adminPhone);
  const name = state.adminName.trim();
  const ministry = state.adminMinistry.trim();

  if (!name || digits.length < 7) {
    setState({ error: "Please enter a valid name and phone number." });
    return;
  }

  try {
    await convex.mutation(api.members.add, {
      name,
      phone: digits,
      ministry: ministry || undefined,
    });
    setState({
      adminName: "",
      adminPhone: "",
      adminMinistry: "",
      error: "",
    });
  } catch (err) {
    setState({ error: err.message || "Failed to add member." });
  }
}

function startEditMember(digits) {
  const m = state.members.find((item) => normalizePhone(item.phone) === digits);
  if (!m) return;
  setState({
    editingPhone: digits,
    editName: m.name,
    editPhone: m.phone,
    editMinistry: m.ministry || "",
    error: "",
  });
}

async function saveEditMember(originalPhone) {
  const newDigits = normalizePhone(state.editPhone);
  const name = state.editName.trim();
  const ministry = state.editMinistry.trim();

  if (!name || newDigits.length < 7) {
    setState({ error: "Valid name and phone number required." });
    return;
  }

  try {
    await convex.mutation(api.members.update, {
      originalPhone,
      phone: newDigits,
      name,
      ministry: ministry || undefined,
    });
    setState({ editingPhone: null, error: "" });
  } catch (err) {
    setState({ error: err.message || "Failed to update member." });
  }
}

async function handleDeleteMember(phone) {
  if (!window.confirm("Are you sure you want to remove this member?")) return;
  try {
    await convex.mutation(api.members.remove, { phone });
  } catch (err) {
    setState({ error: err.message || "Failed to delete member." });
  }
}

function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"')
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportTodayCSV() {
  const rows = [["Name", "Phone", "Ministry", "Time"]].concat(
    state.checkins.map((c) => [c.name, c.phone, c.ministry || "", c.time])
  );
  downloadCSV(`ccc-adum-attendance-${getTodayKey()}.csv`, rows);
}

function exportMembersCSV() {
  const rows = [["Name", "Phone", "Ministry"]].concat(
    state.members.map((m) => [m.name, m.phone, m.ministry || ""])
  );
  downloadCSV("ccc-adum-members.csv", rows);
}

function goHome() {
  setState({
    screen: "entry",
    phoneInput: "",
    error: "",
    currentMember: null,
  });
}

// Preserve input focus across re-renders
function captureFocus() {
  const el = document.activeElement;
  const root = document.getElementById("root");
  if (!el || !root || !root.contains(el) || !el.id) return null;
  return { id: el.id, start: el.selectionStart, end: el.selectionEnd };
}

function restoreFocus(info) {
  if (!info) return;
  const el = document.getElementById(info.id);
  if (!el) return;
  el.focus();
  if (typeof info.start === "number" && el.setSelectionRange) {
    try {
      el.setSelectionRange(info.start, info.end);
    } catch (_) {}
  }
}

function render() {
  const focusInfo = captureFocus();
  paint();
  restoreFocus(focusInfo);
}

function paint() {
  const root = document.getElementById("root");
  if (!root) return;

  // Screen 1: Loading
  if (state.screen === "loading") {
    root.innerHTML = `
      <div class="card">
        ${churchMark()}
        ${churchHeading()}
        <div class="spinner-text">
          <div class="spinner"></div>
          <span>Connecting to Calvary Charismatic Center…</span>
        </div>
      </div>
    `;
    return;
  }

  // Screen 2: Phone Entry
  if (state.screen === "entry") {
    root.innerHTML = `
      <div class="card">
        ${churchMark()}
        ${churchHeading()}
        ${liveBadge()}
        <h1>Welcome. Let's check you in.</h1>
        <p class="sub">Enter the phone number on file with the church.</p>
        <label for="phone">Phone number</label>
        <input id="phone" type="tel" inputmode="tel" placeholder="e.g. 0244123456" value="${esc(state.phoneInput)}" autofocus>
        ${state.error ? `<div class="error-text">${esc(state.error)}</div>` : ""}
        <button class="btn btn-primary" id="continueBtn">Continue</button>
        <div class="foot-link">
          <button id="adminLink">Staff view</button>
        </div>
      </div>
    `;

    const phoneField = document.getElementById("phone");
    phoneField.addEventListener("input", (e) => setState({ phoneInput: e.target.value, error: "" }));
    phoneField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLookup();
    });
    document.getElementById("continueBtn").addEventListener("click", handleLookup);
    document.getElementById("adminLink").addEventListener("click", () => {
      setState({ screen: "pinEntry", pinInput: "", pinError: "" });
    });
    return;
  }

  // Screen 3: New Member Registration
  if (state.screen === "register") {
    root.innerHTML = `
      <div class="card">
        ${churchMark()}
        ${churchHeading()}
        <h1>We don't have that number yet</h1>
        <p class="sub">Add your details so we can check you in today and remember you next time.</p>
        <label for="regName">Full name</label>
        <input id="regName" type="text" placeholder="e.g. Jane Mensah" value="${esc(state.regName)}" autofocus>
        <label for="regMinistry">Ministry or group (optional)</label>
        <input id="regMinistry" type="text" placeholder="e.g. Choir, Youth, Ushering…" value="${esc(state.regMinistry)}">
        ${state.error ? `<div class="error-text">${esc(state.error)}</div>` : ""}
        <button class="btn btn-primary" id="registerBtn">Save and check in</button>
        <div class="foot-link">
          <button id="backBtn">Not your number? Start over</button>
        </div>
      </div>
    `;

    document.getElementById("regName").addEventListener("input", (e) => setState({ regName: e.target.value, error: "" }));
    document.getElementById("regMinistry").addEventListener("input", (e) => setState({ regMinistry: e.target.value }));
    document.getElementById("registerBtn").addEventListener("click", handleRegisterAndCheckIn);
    document.getElementById("backBtn").addEventListener("click", goHome);
    return;
  }

  // Screen 4: Member Profile & Check-In
  if (state.screen === "profile") {
    const m = state.currentMember;
    const digits = normalizePhone(m.phone);
    const checkedInRecord = state.checkins.find((c) => normalizePhone(c.phone) === digits);
    const firstName = (m.name || "Member").trim().split(" ")[0];

    root.innerHTML = `
      <div class="card">
        ${churchMark()}
        ${churchHeading()}
        ${liveBadge()}
        <div class="profile-box">
          <p class="profile-name">${esc(m.name)}</p>
          ${m.ministry ? `<p class="profile-meta">${esc(m.ministry)}</p>` : ""}
        </div>
        ${
          checkedInRecord
            ? `
              <div class="checked-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Hi ${esc(firstName)}, you are welcome to Transformation Centre. Stay blessed!</span>
              </div>
              <p class="profile-meta" style="text-align:center; margin-top:14px;">Checked in at ${esc(checkedInRecord.time)}</p>
              <button class="btn btn-primary" id="doneBtn" style="margin-top:18px;">Done</button>
            `
            : `
              <button class="btn btn-primary" id="checkInBtn">Check in</button>
            `
        }
        ${state.error ? `<div class="error-text" style="text-align:center; margin-top:14px;">${esc(state.error)}</div>` : ""}
        <div class="foot-link">
          <button id="backBtn">Not you? Start over</button>
        </div>
      </div>
    `;

    if (checkedInRecord) {
      document.getElementById("doneBtn").addEventListener("click", goHome);
    } else {
      document.getElementById("checkInBtn").addEventListener("click", handleCheckIn);
    }
    document.getElementById("backBtn").addEventListener("click", goHome);
    return;
  }

  // Screen 5: Staff PIN Entry
  if (state.screen === "pinEntry") {
    root.innerHTML = `
      <div class="card">
        ${churchMark()}
        ${churchHeading()}
        <h1>Staff View</h1>
        <p class="sub">Enter the staff PIN to access attendance reports and member management.</p>
        <label for="pinField">Staff PIN</label>
        <input id="pinField" type="password" inputmode="numeric" placeholder="••••" value="${esc(state.pinInput)}" autofocus>
        ${state.pinError ? `<div class="error-text">${esc(state.pinError)}</div>` : ""}
        <button class="btn btn-primary" id="pinSubmitBtn">Enter</button>
        <div class="foot-link">
          <button id="pinBackBtn">Back to check-in</button>
        </div>
      </div>
    `;

    const pinField = document.getElementById("pinField");
    pinField.addEventListener("input", (e) => setState({ pinInput: e.target.value, pinError: "" }));
    pinField.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlePinSubmit();
    });
    document.getElementById("pinSubmitBtn").addEventListener("click", handlePinSubmit);
    document.getElementById("pinBackBtn").addEventListener("click", goHome);
    return;
  }

  // Screen 6: Admin Dashboard
  if (state.screen === "admin") {
    const todayQuery = (state.todaySearch || "").trim().toLowerCase();
    const filteredToday = state.checkins.filter(
      (c) =>
        !todayQuery ||
        c.name.toLowerCase().includes(todayQuery) ||
        normalizePhone(c.phone).includes(todayQuery) ||
        (c.ministry && c.ministry.toLowerCase().includes(todayQuery))
    );

    const memberQuery = (state.memberSearch || "").trim().toLowerCase();
    const filteredMembers = state.members.filter(
      (m) =>
        !memberQuery ||
        m.name.toLowerCase().includes(memberQuery) ||
        normalizePhone(m.phone).includes(memberQuery) ||
        (m.ministry && m.ministry.toLowerCase().includes(memberQuery))
    );

    root.innerHTML = `
      <div class="card admin-card">
        <div class="admin-header">
          <div>
            <p class="church-name" style="text-align:left; margin-bottom:2px;">${esc(CHURCH_NAME)} · ${esc(CHURCH_LOCATION)}</p>
            <div class="service-line" style="justify-content:flex-start; margin-bottom:4px;">
              <span>${esc(todayLabel())}</span>
              <span class="badge-live"><span class="pulse-dot"></span> LIVE</span>
            </div>
            <h1 style="text-align:left; margin-bottom:0;">${state.adminTab === "members" ? "Member Directory" : "Today's Check-ins"}</h1>
          </div>
          <div class="admin-count-box">
            <div class="admin-count">${state.adminTab === "members" ? state.members.length : state.checkins.length}</div>
            <div class="admin-count-label">${state.adminTab === "members" ? "Total Members" : "Checked In"}</div>
          </div>
        </div>

        <div class="tab-row">
          <button class="tab-btn ${state.adminTab === "today" ? "active" : ""}" id="tabToday">Today's Check-ins</button>
          <button class="tab-btn ${state.adminTab === "members" ? "active" : ""}" id="tabMembers">Member Directory</button>
        </div>

        ${
          state.adminTab === "today"
            ? `
              <input id="todaySearch" type="text" placeholder="Search attendee by name, phone, or ministry" value="${esc(state.todaySearch)}" style="margin-bottom:10px;">
              <div class="admin-list">
                ${
                  filteredToday.length === 0
                    ? `<div class="admin-empty">${state.checkins.length === 0 ? "No check-ins recorded yet today." : "No matching attendees found."}</div>`
                    : filteredToday
                        .map(
                          (r) => `
                        <div class="admin-row">
                          <span class="name">
                            ${esc(r.name)}${r.ministry ? ` <span style="font-size:12px; color:var(--gold-deep); font-weight:normal;">· ${esc(r.ministry)}</span>` : ""}
                            <br><span class="time">${esc(r.phone)}</span>
                          </span>
                          <span class="time" style="font-weight:600; color:var(--sage);">${esc(r.time)}</span>
                        </div>
                      `
                        )
                        .join("")
                }
              </div>
              <button class="btn btn-primary" id="exportTodayBtn" style="margin-top:12px;">Export Today's List (CSV)</button>
            `
            : `
              <label for="aName">Full name</label>
              <input id="aName" type="text" placeholder="e.g. Kwabena Asante" value="${esc(state.adminName)}">
              <label for="aPhone">Phone number</label>
              <input id="aPhone" type="tel" placeholder="e.g. 0244123456" value="${esc(state.adminPhone)}">
              <label for="aMinistry">Ministry or group (optional)</label>
              <input id="aMinistry" type="text" placeholder="e.g. Ushers, Choir, Media" value="${esc(state.adminMinistry)}">
              ${state.error ? `<div class="error-text">${esc(state.error)}</div>` : ""}
              <button class="btn btn-primary" id="addMemberBtn">Add to member directory</button>

              <hr class="divider">

              <label for="memberSearch">Search directory</label>
              <input id="memberSearch" type="text" placeholder="Search by name, phone, or ministry" value="${esc(state.memberSearch)}">
              <div class="admin-list">
                ${
                  filteredMembers.length === 0
                    ? `<div class="admin-empty">No members found.</div>`
                    : filteredMembers
                        .map((m) => {
                          const digits = normalizePhone(m.phone);
                          const isEditing = state.editingPhone === digits;
                          if (isEditing) {
                            return `
                              <div class="admin-row" style="flex-direction:column; align-items:stretch; gap:8px; padding:12px 0;">
                                <input class="edit-name" data-phone="${esc(digits)}" type="text" value="${esc(state.editName)}" style="margin-bottom:0;">
                                <input class="edit-phone" data-phone="${esc(digits)}" type="tel" value="${esc(state.editPhone)}" style="margin-bottom:0;">
                                <input class="edit-ministry" data-phone="${esc(digits)}" type="text" value="${esc(state.editMinistry)}" placeholder="Ministry" style="margin-bottom:0;">
                                <div style="display:flex; gap:8px;">
                                  <button class="btn btn-primary save-edit-btn" data-phone="${esc(digits)}" style="font-size:13px; padding:9px;">Save</button>
                                  <button class="btn btn-ghost cancel-edit-btn" style="width:auto; flex:1;">Cancel</button>
                                </div>
                              </div>
                            `;
                          }
                          return `
                            <div class="admin-row">
                              <span class="name">
                                ${esc(m.name)}${m.ministry ? ` <span style="font-size:12px; color:var(--gold-deep); font-weight:normal;">· ${esc(m.ministry)}</span>` : ""}
                                <br><span class="time">${esc(m.phone)}</span>
                              </span>
                              <span style="display:flex; gap:10px; align-items:center;">
                                <button class="btn-ghost edit-member-btn" data-phone="${esc(digits)}">Edit</button>
                                <button class="btn-ghost delete-member-btn" data-phone="${esc(digits)}" style="color:var(--error);">Delete</button>
                              </span>
                            </div>
                          `;
                        })
                        .join("")
                }
              </div>
              <button class="btn btn-primary" id="exportMembersBtn" style="margin-top:12px;">Export All Members (CSV)</button>
            `
        }

        <hr class="divider">

        ${
          state.changingPin
            ? `
              <label for="currentPin">Current PIN</label>
              <input id="currentPin" type="password" inputmode="numeric" value="${esc(state.currentPinInput)}">
              <label for="newPin">New PIN (4 to 8 digits)</label>
              <input id="newPin" type="password" inputmode="numeric" value="${esc(state.newPinInput)}">
              ${state.error ? `<div class="error-text">${esc(state.error)}</div>` : ""}
              <button class="btn btn-primary" id="savePinBtn">Save new PIN</button>
              <div class="foot-link">
                <button id="cancelPinBtn">Cancel</button>
              </div>
            `
            : `
              <div class="foot-link">
                <button id="changePinBtn">Change staff PIN</button>
                &nbsp;·&nbsp;
                <button id="exitAdmin">Back to check-in view</button>
              </div>
            `
        }
      </div>
    `;

    document.getElementById("tabToday").addEventListener("click", () => setState({ adminTab: "today", error: "" }));
    document.getElementById("tabMembers").addEventListener("click", () => setState({ adminTab: "members", error: "", editingPhone: null }));

    if (state.adminTab === "today") {
      document.getElementById("todaySearch").addEventListener("input", (e) => setState({ todaySearch: e.target.value }));
      document.getElementById("exportTodayBtn").addEventListener("click", exportTodayCSV);
    }

    if (state.adminTab === "members") {
      document.getElementById("aName").addEventListener("input", (e) => setState({ adminName: e.target.value, error: "" }));
      document.getElementById("aPhone").addEventListener("input", (e) => setState({ adminPhone: e.target.value, error: "" }));
      document.getElementById("aMinistry").addEventListener("input", (e) => setState({ adminMinistry: e.target.value }));
      document.getElementById("addMemberBtn").addEventListener("click", handleAdminAddMember);
      document.getElementById("memberSearch").addEventListener("input", (e) => setState({ memberSearch: e.target.value }));
      document.getElementById("exportMembersBtn").addEventListener("click", exportMembersCSV);

      document.querySelectorAll(".edit-member-btn").forEach((btn) => {
        btn.addEventListener("click", () => startEditMember(btn.dataset.phone));
      });
      document.querySelectorAll(".delete-member-btn").forEach((btn) => {
        btn.addEventListener("click", () => handleDeleteMember(btn.dataset.phone));
      });
      document.querySelectorAll(".edit-name").forEach((el) => {
        el.addEventListener("input", (e) => setState({ editName: e.target.value }));
      });
      document.querySelectorAll(".edit-phone").forEach((el) => {
        el.addEventListener("input", (e) => setState({ editPhone: e.target.value }));
      });
      document.querySelectorAll(".edit-ministry").forEach((el) => {
        el.addEventListener("input", (e) => setState({ editMinistry: e.target.value }));
      });
      document.querySelectorAll(".save-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => saveEditMember(btn.dataset.phone));
      });
      document.querySelectorAll(".cancel-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => setState({ editingPhone: null }));
      });
    }

    if (state.changingPin) {
      document.getElementById("currentPin").addEventListener("input", (e) => setState({ currentPinInput: e.target.value, error: "" }));
      document.getElementById("newPin").addEventListener("input", (e) => setState({ newPinInput: e.target.value, error: "" }));
      document.getElementById("savePinBtn").addEventListener("click", handleChangePin);
      document.getElementById("cancelPinBtn").addEventListener("click", () => {
        setState({ changingPin: false, currentPinInput: "", newPinInput: "", error: "" });
      });
    } else {
      document.getElementById("changePinBtn").addEventListener("click", () => setState({ changingPin: true, error: "" }));
      document.getElementById("exitAdmin").addEventListener("click", goHome);
    }
  }
}

// Initialize
initConvexSubscriptions();
render();
