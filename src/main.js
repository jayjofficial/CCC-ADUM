import '../src/style.css';
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "https://quaint-kookabura-706.convex.cloud";
const convex = new ConvexClient(CONVEX_URL);

const CHURCH_NAME = "Calvary Charismatic Center";
const CHURCH_LOCATION = "Adum";

// Global State
let state = {
  // Navigation: 'entry', 'register_step1', 'register_step2', 'confirmed', 'staff_pin', 'staff_checkins', 'staff_add_member'
  screen: "entry",
  toast: "",
  error: "",

  // Phone Entry
  phoneInput: "",

  // Registration State (Steps 1 & 2)
  regPhone: "",
  regName: "",
  regAge: "Under 19",
  ageDropdownOpen: false,
  regCodeNo: "",
  regScdGroup: "",
  regOccupation: "",
  regMinistry: "",
  regMemberStatus: "Member",
  memberStatusDropdownOpen: false,

  // Confirmation State
  confirmedPerson: null,
  confirmedCheckinTime: "",

  // Staff View State
  pinInput: "",
  pinError: "",
  adminPin: "1234",
  drawerOpen: false,
  searchQuery: "",
  showSearch: false,

  // Staff Previous Lists State
  previousListDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
  previousListMode: "date", // "date" or "all_members"
  previousListRecords: [],
  previousSearchQuery: "",
  showPreviousSearch: false,

  // Staff Members View State
  membersSearchQuery: "",
  showMembersSearch: false,

  // Staff Add Member Form State
  staffNewName: "",
  staffNewAddress: "",
  staffNewOccupation: "",
  staffNewMinistry: "",
  staffNewPhone: "",
  staffNewAge: "Under 19",
  staffAgeDropdownOpen: false,
  staffNewStatus: "Would like to be a member",
  staffStatusDropdownOpen: false,

  // Live Convex Subscriptions
  members: [],
  checkins: [],
  isConvexConnected: false,
};

function syncCurrentFormInputsToState() {
  const regName = document.getElementById("regName");
  if (regName) state.regName = regName.value;

  const regCodeNo = document.getElementById("regCodeNo");
  if (regCodeNo) state.regCodeNo = regCodeNo.value;

  const regScdGroup = document.getElementById("regScdGroup");
  if (regScdGroup) state.regScdGroup = regScdGroup.value;

  const regOccupation = document.getElementById("regOccupation");
  if (regOccupation) state.regOccupation = regOccupation.value;

  const regMinistry = document.getElementById("regMinistry");
  if (regMinistry) state.regMinistry = regMinistry.value;

  const staffName = document.getElementById("staffName");
  if (staffName) state.staffNewName = staffName.value;

  const staffPhone = document.getElementById("staffPhone");
  if (staffPhone) state.staffNewPhone = staffPhone.value;

  const staffAddress = document.getElementById("staffAddress");
  if (staffAddress) state.staffNewAddress = staffAddress.value;

  const staffOccupation = document.getElementById("staffOccupation");
  if (staffOccupation) state.staffNewOccupation = staffOccupation.value;

  const staffMinistry = document.getElementById("staffMinistry");
  if (staffMinistry) state.staffNewMinistry = staffMinistry.value;

  const phoneInput = document.getElementById("phoneInput");
  if (phoneInput) state.phoneInput = phoneInput.value;

  const pinInput = document.getElementById("pinInput");
  if (pinInput) state.pinInput = pinInput.value;
}

function setState(patch) {
  syncCurrentFormInputsToState();
  state = Object.assign({}, state, patch);
  render();
}

let toastDismissTimer = null;
let toastRemoveTimer = null;

function showToast(msg) {
  if (!msg) return;
  state.toast = msg;

  let toastEl = document.getElementById("globalToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "globalToast";
    toastEl.className = "toast-notice";
    document.body.appendChild(toastEl);
  }

  // Clear previous timers if a toast was already active
  if (toastDismissTimer) clearTimeout(toastDismissTimer);
  if (toastRemoveTimer) clearTimeout(toastRemoveTimer);

  toastEl.textContent = msg;
  toastEl.classList.remove("hide");
  // Force reflow for silky smooth CSS transition
  void toastEl.offsetWidth;
  toastEl.classList.add("visible");

  toastDismissTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
    toastEl.classList.add("hide");
    toastRemoveTimer = setTimeout(() => {
      if (toastEl && toastEl.parentNode && toastEl.classList.contains("hide")) {
        toastEl.remove();
      }
      state.toast = "";
    }, 320);
  }, 3200);
}

// Helpers
function normalizePhone(p) {
  return (p || "").replace(/\D/g, "");
}

function formatPhoneDisplay(val) {
  const digits = normalizePhone(val);
  if (!digits) return "";
  if (digits.startsWith("233")) {
    const rest = digits.slice(3);
    return `(+233) ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7, 10)}`.trim();
  }
  if (digits.startsWith("0")) {
    return digits;
  }
  return digits;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getTodayFormatted() {
  const d = new Date();
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = d.toLocaleDateString("en-US", { month: "long" });
  const dayOrdinal = getOrdinal(d.getDate());
  return `${dayName}, ${dayOrdinal} ${monthName}`;
}

function getTimeNowFormatted() {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function esc(s) {
  const d = document.createElement("div");
  d.innerText = s == null ? "" : s;
  return d.innerHTML;
}


function renderChurchHeader() {
  return `
    <div class="church-logo-header">
      <img src="/ccc-logo.png" alt="CCC Logo" class="church-logo-img">
      <div class="church-brand-name">${esc(CHURCH_NAME)}</div>
      <div class="church-brand-sub">${esc(CHURCH_LOCATION)}</div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 1: Phone Entry (Page 1)
// -------------------------------------------------------------
function renderEntryScreen() {
  return `
    <div class="app-content">
      <div class="gradient-card-wrapper">
        <div class="gradient-card">
          ${renderChurchHeader()}

          <div class="service-date-text">${esc(getTodayFormatted())}</div>

          <h1 class="view-heading-bold">
            Welcome to Church.<br>
            Let’s check you in.
          </h1>

          <p class="view-subtext-muted">
            Enter your phone number to get started.
          </p>

          <form id="phoneEntryForm" class="form-container">
            <div class="form-group">
              <label class="form-label" for="phoneInput">Phone Number:</label>
              <input 
                type="tel" 
                id="phoneInput" 
                class="input-pill-red" 
                placeholder="(+233) 0000 000 000"
                value="${esc(state.phoneInput)}"
                autocomplete="tel"
                required
              />
            </div>

            ${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ""}

            <button type="submit" class="btn-red-outline">
              Continue
            </button>
          </form>

          <button type="button" id="toStaffViewBtn" class="link-muted-subtle">
            Staff view
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 2: Registration Step 1 (Pages 2 & 3)
// -------------------------------------------------------------
function renderRegisterStep1Screen() {
  const ageOptions = ["Under 19", "20-26", "27-40", "41-55", "56up"];

  return `
    <div class="app-content">
      <div class="gradient-card-wrapper">
        <div class="gradient-card">
          ${renderChurchHeader()}

          <h1 class="view-heading-bold" style="margin-top: 4px;">
            We don’t have your details<br>yet
          </h1>

          <p class="view-subtext-muted">
            Add your details so we can check you in today and remember you next time.
          </p>

          <form id="regStep1Form" class="form-container">
            <div class="form-group">
              <label class="form-label" for="regName">Full Name:</label>
              <input 
                type="text" 
                id="regName" 
                class="input-pill-red" 
                placeholder="Janette Sarfo" 
                value="${esc(state.regName)}" 
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Age:</label>
              <div 
                id="ageDropdownTrigger" 
                class="custom-select-trigger ${state.ageDropdownOpen ? "open" : ""}"
              >
                <span>${esc(state.regAge || "Under 19")}</span>
                <svg viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>

              ${
                state.ageDropdownOpen
                  ? `
                <div class="custom-select-options">
                  ${ageOptions
                    .map(
                      (opt) => `
                    <div class="select-option-item ${state.regAge === opt ? "selected" : ""}" data-age="${esc(opt)}">
                      ${esc(opt)}
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="regCodeNo">Code No.:</label>
              <input 
                type="text" 
                id="regCodeNo" 
                class="input-pill-red" 
                placeholder="AZ 198" 
                value="${esc(state.regCodeNo)}" 
              />
            </div>

            ${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ""}

            <button type="submit" class="btn-red-outline">
              Continue
            </button>
          </form>

          <button type="button" id="startOverBtn" class="link-muted-subtle">
            Wrong number? Start over
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 3: Registration Step 2 (Pages 4 & 5)
// -------------------------------------------------------------
function renderRegisterStep2Screen() {
  const memberOptions = ["Member", "Regular Visitor"];

  return `
    <div class="app-content">
      <div class="gradient-card-wrapper">
        <div class="gradient-card">
          ${renderChurchHeader()}

          <h1 class="view-heading-bold" style="margin-top: 4px;">
            We don’t have your details<br>yet
          </h1>

          <p class="view-subtext-muted">
            Add your details so we can check you in today and remember you next time.
          </p>

          <form id="regStep2Form" class="form-container">
            <div class="form-group">
              <label class="form-label" for="regScdGroup">SCD Group :</label>
              <input 
                type="text" 
                id="regScdGroup" 
                class="input-pill-red" 
                placeholder="Monday" 
                value="${esc(state.regScdGroup)}" 
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="regOccupation">Occupation:</label>
              <input 
                type="text" 
                id="regOccupation" 
                class="input-pill-red" 
                placeholder="Lawyer" 
                value="${esc(state.regOccupation)}" 
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="regMinistry">Ministry (Optional):</label>
              <input 
                type="text" 
                id="regMinistry" 
                class="input-pill-red" 
                placeholder="e.g. Ushering, Choir, Media" 
                value="${esc(state.regMinistry)}" 
              />
            </div>

            <div class="form-group">
              <label class="form-label">Member:</label>
              <div 
                id="memberStatusDropdownTrigger" 
                class="custom-select-trigger ${state.memberStatusDropdownOpen ? "open" : ""}"
              >
                <span>${esc(state.regMemberStatus || "Member")}</span>
                <svg viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>

              ${
                state.memberStatusDropdownOpen
                  ? `
                <div class="custom-select-options">
                  ${memberOptions
                    .map(
                      (opt) => `
                    <div class="select-option-item ${state.regMemberStatus === opt ? "selected" : ""}" data-status="${esc(opt)}">
                      ${esc(opt)}
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
            </div>

            ${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ""}

            <button type="submit" class="btn-red-outline">
              Continue
            </button>
          </form>

          <button type="button" id="startOverBtn2" class="link-muted-subtle">
            Wrong number? Start over
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 4: Confirmation Screen (Page 6)
// -------------------------------------------------------------
function renderConfirmedScreen() {
  const person = state.confirmedPerson || { name: "Janette Sarfo", ministry: "Ushering" };
  const firstName = (person.name || "Friend").trim().split(" ")[0];
  const ministryOrStatus = person.ministry || person.memberStatus || "Member";
  const checkinTime = state.confirmedCheckinTime || getTimeNowFormatted();

  return `
    <div class="app-content">
      <div class="gradient-card-wrapper">
        <div class="gradient-card">
          ${renderChurchHeader()}

          <div class="service-date-text">${esc(getTodayFormatted())}</div>

          <div class="confirmation-name">${esc(person.name)}</div>
          <div class="confirmation-ministry">${esc(ministryOrStatus)}</div>

          <div class="confirmation-card-box">
            <div class="confirmation-greeting-text">
              Hello ${esc(firstName)}, you are welcome to Transformation Centre. Stay blessed.
            </div>
          </div>

          <div class="confirmation-time-text">
            Checked in at ${esc(checkinTime)}
          </div>

          <button type="button" id="confirmDoneBtn" class="link-muted-subtle">
            Not you? Start over
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 5: Staff PIN Entry (Page 7)
// -------------------------------------------------------------
function renderStaffPinScreen() {
  return `
    <div class="app-content">
      <div class="gradient-card-wrapper">
        <div class="gradient-card">
          ${renderChurchHeader()}

          <h1 class="view-heading-bold" style="margin-top: 8px;">
            Staff View
          </h1>

          <p class="view-subtext-muted">
            Enter the staff pin to manage members and check-ins.
          </p>

          <form id="staffPinForm" class="form-container">
            <div class="form-group">
              <label class="form-label" for="pinInput">PIN:</label>
              <input 
                type="password" 
                id="pinInput" 
                class="input-pill-red pin-input-field" 
                placeholder="••••••" 
                maxlength="8" 
                value="${esc(state.pinInput)}" 
                required 
                autofocus
              />
            </div>

            ${state.pinError ? `<div class="error-notice">${esc(state.pinError)}</div>` : ""}

            <button type="submit" class="btn-red-outline">
              Continue
            </button>
          </form>

          <button type="button" id="backToCheckinBtn" class="link-muted-subtle">
            Back to check-in
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCheckinsTableRowsHtml(checkins, query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = (checkins || []).filter((c) => {
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.occupation && c.occupation.toLowerCase().includes(q)) ||
      (c.codeNo && c.codeNo.toLowerCase().includes(q)) ||
      (c.scdGroup && c.scdGroup.toLowerCase().includes(q)) ||
      (c.memberStatus && c.memberStatus.toLowerCase().includes(q)) ||
      (c.ministry && c.ministry.toLowerCase().includes(q))
    );
  });

  const displayRowsCount = Math.max(10, filtered.length);
  const emptyRowsCount = displayRowsCount - filtered.length;

  const dataRows = filtered
    .map(
      (row) => `
    <tr>
      <td><strong>${esc(row.name)}</strong></td>
      <td>${esc(row.age || "—")}</td>
      <td>${esc(formatPhoneDisplay(row.phone))}</td>
      <td>${esc(row.scdGroup || "—")}</td>
      <td>${esc(row.occupation || "—")}</td>
      <td>${esc(row.codeNo || "—")}</td>
      <td>${esc(row.memberStatus || "Member")}</td>
      <td>${esc(row.ministry || "—")}</td>
    </tr>
  `
    )
    .join("");

  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
    <tr class="empty-row">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `
    )
    .join("");

  return dataRows + emptyRows;
}

function renderMembersTableRowsHtml(members, query) {
  const q = (query || "").toLowerCase().trim();
  const filtered = (members || []).filter((m) => {
    if (!q) return true;
    return (
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q)) ||
      (m.occupation && m.occupation.toLowerCase().includes(q)) ||
      (m.codeNo && m.codeNo.toLowerCase().includes(q)) ||
      (m.scdGroup && m.scdGroup.toLowerCase().includes(q)) ||
      (m.memberStatus && m.memberStatus.toLowerCase().includes(q)) ||
      (m.ministry && m.ministry.toLowerCase().includes(q)) ||
      (m.address && m.address.toLowerCase().includes(q))
    );
  });

  const displayRowsCount = Math.max(10, filtered.length);
  const emptyRowsCount = displayRowsCount - filtered.length;

  const dataRows = filtered
    .map(
      (row) => `
    <tr>
      <td><strong>${esc(row.name)}</strong></td>
      <td>${esc(row.age || "—")}</td>
      <td>${esc(formatPhoneDisplay(row.phone))}</td>
      <td>${esc(row.scdGroup || "—")}</td>
      <td>${esc(row.occupation || "—")}</td>
      <td>${esc(row.codeNo || "—")}</td>
      <td>${esc(row.memberStatus || "Member")}</td>
      <td>${esc(row.ministry || "—")}</td>
      <td style="text-align: center;">
        <button 
          type="button" 
          class="btn-remove-member" 
          data-remove-phone="${esc(row.phone)}" 
          data-remove-name="${esc(row.name)}" 
          title="Remove ${esc(row.name)}"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
          </svg>
          <span style="margin-left: 3px; font-size: 11px; font-weight: 600;">Remove</span>
        </button>
      </td>
    </tr>
  `
    )
    .join("");

  const emptyRows = Array.from({ length: emptyRowsCount })
    .map(
      () => `
    <tr class="empty-row">
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `
    )
    .join("");

  return dataRows + emptyRows;
}

// -------------------------------------------------------------
// SCREEN 6: Staff Check-ins Table (Pages 8, 9, 10)
// -------------------------------------------------------------
function renderStaffCheckinsScreen() {
  const checkins = state.checkins || [];
  const q = state.searchQuery || "";

  return `
    <div class="staff-view-container">
      <!-- Staff Top Navigation Bar -->
      <div class="staff-top-nav">
        <div class="staff-nav-left">
          <img src="/ccc-logo.png" alt="Logo" class="staff-logo-icon">
          <div class="staff-nav-brand">
            Calvary Charismatic<br>Center, Adum
          </div>
        </div>
        <button id="hamburgerBtn" class="staff-hamburger-btn" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="checkins-content-area">
        <div class="checkins-header-row">
          <div class="checkins-title-col">
            <h2 class="checkins-title-text">Today’s check-ins</h2>
            <div class="checkins-date-badge">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
              </svg>
              <span>${esc(getTodayFormatted())}</span>
            </div>
          </div>

          <button id="toggleSearchBtn" class="search-toggle-btn" title="Search check-ins">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        ${
          state.showSearch
            ? `
          <input 
            type="text" 
            id="tableSearchInput" 
            class="search-input-box" 
            placeholder="Search by name, phone, occupation, group..." 
            value="${esc(state.searchQuery)}"
            autofocus
          />
        `
            : ""
        }

        <!-- Horizontally Scrollable 8-column Table (Pages 8 & 9) -->
        <div class="table-scroll-wrapper">
          <table class="checkins-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Phone No.</th>
                <th>SCD Group</th>
                <th>Occupation</th>
                <th>Code No.</th>
                <th>Member Status</th>
                <th>Ministry</th>
              </tr>
            </thead>
            <tbody id="checkinsTableBody">
              ${renderCheckinsTableRowsHtml(checkins, q)}
            </tbody>
          </table>
        </div>

        <!-- Export CSV Button (Bottom right) -->
        <div class="table-footer-row">
          <button id="exportCsvBtn" class="btn-purple-solid">
            Export list (CSV)
          </button>
        </div>
      </div>

      <!-- Slide-out Drawer (Page 10) -->
      ${renderStaffDrawer()}
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 6B: Staff Previous Lists (History & Directory)
// -------------------------------------------------------------
function renderStaffPreviousScreen() {
  const isDate = state.previousListMode === "date";
  const records = isDate ? state.previousListRecords : state.members;
  const q = state.previousSearchQuery || "";

  return `
    <div class="staff-view-container">
      <!-- Staff Top Navigation Bar -->
      <div class="staff-top-nav">
        <div class="staff-nav-left">
          <img src="/ccc-logo.png" alt="Logo" class="staff-logo-icon">
          <div class="staff-nav-brand">
            Calvary Charismatic<br>Center, Adum
          </div>
        </div>
        <button id="hamburgerBtn" class="staff-hamburger-btn" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="checkins-content-area">
        <div class="checkins-header-row">
          <div class="checkins-title-col">
            <h2 class="checkins-title-text">Previous lists</h2>
            <div class="checkins-date-badge">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
              </svg>
              <span>${isDate ? `Service date: ${esc(state.previousListDate)}` : `All members (${state.members.length})`}</span>
            </div>
          </div>

          <button id="togglePreviousSearchBtn" class="search-toggle-btn" title="Search members">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        <!-- Filter Controls: Date Picker + Mode Switcher -->
        <div class="previous-controls-bar">
          <div class="segmented-toggle">
            <button type="button" id="prevModeDateBtn" class="toggle-pill-btn ${isDate ? "active" : ""}">
              By Date
            </button>
            <button type="button" id="prevModeMembersBtn" class="toggle-pill-btn ${!isDate ? "active" : ""}">
              All Members
            </button>
          </div>

          ${
            isDate
              ? `
            <div class="date-picker-label-group">
              <span style="font-size: 12.5px; color: #4B5563;">Date:</span>
              <input 
                type="date" 
                id="previousDateInput" 
                class="date-picker-input" 
                value="${esc(state.previousListDate)}" 
              />
            </div>
          `
              : ""
          }
        </div>

        ${
          state.showPreviousSearch
            ? `
          <input 
            type="text" 
            id="previousSearchInput" 
            class="search-input-box" 
            placeholder="Search by name, phone, occupation, group..." 
            value="${esc(state.previousSearchQuery)}"
            autofocus
          />
        `
            : ""
        }

        <!-- Horizontally Scrollable 8-column Table -->
        <div class="table-scroll-wrapper">
          <table class="checkins-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Phone No.</th>
                <th>SCD Group</th>
                <th>Occupation</th>
                <th>Code No.</th>
                <th>Member Status</th>
                <th>Ministry</th>
              </tr>
            </thead>
            <tbody id="previousTableBody">
              ${renderCheckinsTableRowsHtml(records, q)}
            </tbody>
          </table>
        </div>

        <!-- Export CSV Button (Bottom right) -->
        <div class="table-footer-row">
          <button id="exportPreviousCsvBtn" class="btn-purple-solid">
            Export list (CSV)
          </button>
        </div>
      </div>

      <!-- Slide-out Drawer (Page 10) -->
      ${renderStaffDrawer()}
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 6C: Staff Members Directory & Management
// -------------------------------------------------------------
function renderStaffMembersScreen() {
  const members = state.members || [];
  const q = state.membersSearchQuery || "";

  return `
    <div class="staff-view-container">
      <!-- Staff Top Navigation Bar -->
      <div class="staff-top-nav">
        <div class="staff-nav-left">
          <img src="/ccc-logo.png" alt="Logo" class="staff-logo-icon">
          <div class="staff-nav-brand">
            Calvary Charismatic<br>Center, Adum
          </div>
        </div>
        <button id="hamburgerBtn" class="staff-hamburger-btn" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="checkins-content-area">
        <div class="checkins-header-row">
          <div class="checkins-title-col">
            <h2 class="checkins-title-text">Members</h2>
            <div class="checkins-date-badge">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
              <span>${members.length} registered members</span>
            </div>
          </div>

          <button id="toggleMembersSearchBtn" class="search-toggle-btn" title="Search members">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>

        ${
          state.showMembersSearch
            ? `
          <input 
            type="text" 
            id="membersSearchInput" 
            class="search-input-box" 
            placeholder="Search by name, phone, occupation, group, status..." 
            value="${esc(state.membersSearchQuery)}"
            autofocus
          />
        `
            : ""
        }

        <!-- Horizontally & Vertically Scrollable 9-column Table -->
        <div class="table-scroll-wrapper">
          <table class="checkins-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Phone No.</th>
                <th>SCD Group</th>
                <th>Occupation</th>
                <th>Code No.</th>
                <th>Member Status</th>
                <th>Ministry</th>
                <th style="text-align: center; width: 88px;">Action</th>
              </tr>
            </thead>
            <tbody id="membersTableBody">
              ${renderMembersTableRowsHtml(members, q)}
            </tbody>
          </table>
        </div>

        <!-- Export CSV Button (Bottom right) -->
        <div class="table-footer-row">
          <button id="exportMembersCsvBtn" class="btn-purple-solid">
            Export list (CSV)
          </button>
        </div>
      </div>

      <!-- Slide-out Drawer (Page 10) -->
      ${renderStaffDrawer()}
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 7: Staff Drawer Menu (Page 10)
// -------------------------------------------------------------
function renderStaffDrawer() {
  if (!state.drawerOpen) return "";

  return `
    <div class="staff-drawer-overlay" id="drawerOverlay">
      <div class="staff-drawer-menu">
        <div class="drawer-header-purple">
          Hello Staff
        </div>
        <div class="drawer-menu-list">
          <button 
            type="button" 
            id="drawerCheckinsBtn" 
            class="drawer-menu-item ${state.screen === "staff_checkins" ? "active" : ""}"
          >
            Check-ins
          </button>
          <button 
            type="button" 
            id="drawerPreviousListsBtn" 
            class="drawer-menu-item ${state.screen === "staff_previous" ? "active" : ""}"
          >
            Previous lists
          </button>
          <button 
            type="button" 
            id="drawerMembersBtn" 
            class="drawer-menu-item ${state.screen === "staff_members" ? "active" : ""}"
          >
            Members
          </button>
          <button 
            type="button" 
            id="drawerAddMemberBtn" 
            class="drawer-menu-item ${state.screen === "staff_add_member" ? "active" : ""}"
          >
            Add new member
          </button>
          <button 
            type="button" 
            id="drawerLogoutBtn" 
            class="drawer-menu-item logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SCREEN 8: Staff Add New Member (Pages 11 & 12)
// -------------------------------------------------------------
function renderStaffAddMemberScreen() {
  const ageOptions = ["Under 19", "20-26", "27-40", "41-55", "56up"];
  const statusOptions = [
    "Would like to be a member",
    "Just visiting",
  ];

  return `
    <div class="staff-view-container">
      <!-- Staff Top Navigation Bar -->
      <div class="staff-top-nav">
        <div class="staff-nav-left">
          <img src="/ccc-logo.png" alt="Logo" class="staff-logo-icon">
          <div class="staff-nav-brand">
            Calvary Charismatic<br>Center, Adum
          </div>
        </div>
        <button id="hamburgerBtn" class="staff-hamburger-btn" aria-label="Open menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- Add New Member Form Card (Page 11 & 12) -->
      <div class="app-content add-member-card-wrapper">
        <div class="gradient-card-wrapper" style="max-width: 480px;">
          <div class="gradient-card" style="padding: 20px 22px 18px;">
            <h2 class="view-heading-bold" style="margin-bottom: 12px;">
              Add new member
            </h2>

            <form id="staffAddMemberForm" class="add-member-form">
              <div class="form-group full-width">
                <label class="form-label" for="staffName">Full Name:</label>
                <input 
                  type="text" 
                  id="staffName" 
                  class="input-pill-red" 
                  placeholder="James Doe" 
                  value="${esc(state.staffNewName)}" 
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="staffPhone">Phone Number:</label>
                <input 
                  type="tel" 
                  id="staffPhone" 
                  class="input-pill-red" 
                  placeholder="(+233) 0000 000 000" 
                  value="${esc(state.staffNewPhone)}" 
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="staffAddress">Address:</label>
                <input 
                  type="text" 
                  id="staffAddress" 
                  class="input-pill-red" 
                  placeholder="Suame, Kumasi" 
                  value="${esc(state.staffNewAddress)}" 
                />
              </div>

              <div class="form-group">
                <label class="form-label">Age:</label>
                <div 
                  id="staffAgeDropdownTrigger" 
                  class="custom-select-trigger ${state.staffAgeDropdownOpen ? "open" : ""}"
                >
                  <span>${esc(state.staffNewAge || "Under 19")}</span>
                  <svg viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>

                ${
                  state.staffAgeDropdownOpen
                    ? `
                  <div class="custom-select-options">
                    ${ageOptions
                      .map(
                        (opt) => `
                      <div class="select-option-item ${state.staffNewAge === opt ? "selected" : ""}" data-staff-age="${esc(opt)}">
                        ${esc(opt)}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="staffOccupation">Occupation:</label>
                <input 
                  type="text" 
                  id="staffOccupation" 
                  class="input-pill-red" 
                  placeholder="Lawyer" 
                  value="${esc(state.staffNewOccupation)}" 
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="staffMinistry">Ministry (Optional):</label>
                <input 
                  type="text" 
                  id="staffMinistry" 
                  class="input-pill-red" 
                  placeholder="e.g. Ushering, Choir" 
                  value="${esc(state.staffNewMinistry)}" 
                />
              </div>

              <div class="form-group">
                <label class="form-label">Member Status</label>
                <div 
                  id="staffStatusDropdownTrigger" 
                  class="custom-select-trigger ${state.staffStatusDropdownOpen ? "open" : ""}"
                >
                  <span>${esc(state.staffNewStatus || "Would like to be a member")}</span>
                  <svg viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </div>

                ${
                  state.staffStatusDropdownOpen
                    ? `
                  <div class="custom-select-options">
                    ${statusOptions
                      .map(
                        (opt) => `
                      <div class="select-option-item ${state.staffNewStatus === opt ? "selected" : ""}" data-staff-status="${esc(opt)}">
                        ${esc(opt)}
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
              </div>

              ${state.error ? `<div class="error-notice">${esc(state.error)}</div>` : ""}

              <button type="submit" class="btn-red-outline" style="margin-top: 6px;">
                Add member
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Slide-out Drawer (Page 10) -->
      ${renderStaffDrawer()}
    </div>
  `;
}

// -------------------------------------------------------------
// MAIN RENDER LOOP
// -------------------------------------------------------------
function render() {
  const root = document.getElementById("root");
  if (!root) return;

  // Preserve focused element and cursor selection across re-renders
  const activeEl = document.activeElement;
  const activeId = activeEl && activeEl.id ? activeEl.id : null;
  let selStart = null;
  let selEnd = null;
  if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
    try {
      selStart = activeEl.selectionStart;
      selEnd = activeEl.selectionEnd;
    } catch (e) {}
  }

  let contentHtml = "";

  switch (state.screen) {
    case "entry":
      contentHtml = renderEntryScreen();
      break;
    case "register_step1":
      contentHtml = renderRegisterStep1Screen();
      break;
    case "register_step2":
      contentHtml = renderRegisterStep2Screen();
      break;
    case "confirmed":
      contentHtml = renderConfirmedScreen();
      break;
    case "staff_pin":
      contentHtml = renderStaffPinScreen();
      break;
    case "staff_checkins":
      contentHtml = renderStaffCheckinsScreen();
      break;
    case "staff_previous":
      contentHtml = renderStaffPreviousScreen();
      break;
    case "staff_members":
      contentHtml = renderStaffMembersScreen();
      break;
    case "staff_add_member":
      contentHtml = renderStaffAddMemberScreen();
      break;
    default:
      contentHtml = renderEntryScreen();
  }

  const isStaff = state.screen.startsWith("staff_");
  root.innerHTML = `
    <div class="app-shell ${isStaff ? "staff-mode" : "kiosk-mode"}">
      ${contentHtml}
    </div>
  `;

  attachEventHandlers();

  // Restore focus and cursor selection if applicable
  if (activeId) {
    const restoredEl = document.getElementById(activeId);
    if (restoredEl && (restoredEl.tagName === "INPUT" || restoredEl.tagName === "TEXTAREA")) {
      restoredEl.focus();
      if (selStart !== null && selEnd !== null) {
        try {
          restoredEl.setSelectionRange(selStart, selEnd);
        } catch (e) {}
      }
    }
  }
}

// -------------------------------------------------------------
// EVENT HANDLERS & LOGIC
// -------------------------------------------------------------
function attachEventHandlers() {
  // Real-time Input Listeners (ensures state is always in sync with what the user types)
  const phoneInputEl = document.getElementById("phoneInput");
  if (phoneInputEl) {
    phoneInputEl.oninput = (e) => {
      state.phoneInput = e.target.value;
    };
  }

  const regNameEl = document.getElementById("regName");
  if (regNameEl) {
    regNameEl.oninput = (e) => {
      state.regName = e.target.value;
    };
  }

  const regCodeNoEl = document.getElementById("regCodeNo");
  if (regCodeNoEl) {
    regCodeNoEl.oninput = (e) => {
      state.regCodeNo = e.target.value;
    };
  }

  const regScdGroupEl = document.getElementById("regScdGroup");
  if (regScdGroupEl) {
    regScdGroupEl.oninput = (e) => {
      state.regScdGroup = e.target.value;
    };
  }

  const regOccupationEl = document.getElementById("regOccupation");
  if (regOccupationEl) {
    regOccupationEl.oninput = (e) => {
      state.regOccupation = e.target.value;
    };
  }

  const regMinistryEl = document.getElementById("regMinistry");
  if (regMinistryEl) {
    regMinistryEl.oninput = (e) => {
      state.regMinistry = e.target.value;
    };
  }

  const pinInputEl = document.getElementById("pinInput");
  if (pinInputEl) {
    pinInputEl.oninput = (e) => {
      state.pinInput = e.target.value;
    };
  }

  const staffNameEl = document.getElementById("staffName");
  if (staffNameEl) {
    staffNameEl.oninput = (e) => {
      state.staffNewName = e.target.value;
    };
  }

  const staffPhoneEl = document.getElementById("staffPhone");
  if (staffPhoneEl) {
    staffPhoneEl.oninput = (e) => {
      state.staffNewPhone = e.target.value;
    };
  }

  const staffAddressEl = document.getElementById("staffAddress");
  if (staffAddressEl) {
    staffAddressEl.oninput = (e) => {
      state.staffNewAddress = e.target.value;
    };
  }

  const staffOccupationEl = document.getElementById("staffOccupation");
  if (staffOccupationEl) {
    staffOccupationEl.oninput = (e) => {
      state.staffNewOccupation = e.target.value;
    };
  }

  const staffMinistryEl = document.getElementById("staffMinistry");
  if (staffMinistryEl) {
    staffMinistryEl.oninput = (e) => {
      state.staffNewMinistry = e.target.value;
    };
  }

  // 1. Phone Entry Submit (Page 1)
  const phoneForm = document.getElementById("phoneEntryForm");
  if (phoneForm) {
    phoneForm.onsubmit = async (e) => {
      e.preventDefault();
      const raw = document.getElementById("phoneInput")?.value || "";
      const cleanPhone = normalizePhone(raw);

      if (!cleanPhone || cleanPhone.length < 7) {
        setState({ error: "Please enter a valid phone number (at least 7 digits)." });
        return;
      }

      setState({ error: "", phoneInput: raw });

      // Look up member in Convex
      try {
        let member = await convex.query(api.members.getByPhone, { phone: cleanPhone });

        if (member) {
          // Existing member: record check-in directly!
          const res = await convex.mutation(api.checkins.checkIn, {
            phone: cleanPhone,
          });

          setState({
            screen: "confirmed",
            confirmedPerson: member,
            confirmedCheckinTime: res.record?.time || getTimeNowFormatted(),
            error: "",
          });
          showToast(res.alreadyCheckedIn ? "Welcome back! Already checked in." : "Check-in successful!");
        } else {
          // Not found -> Go to Registration Step 1 (Pages 2 & 3)
          setState({
            screen: "register_step1",
            regPhone: cleanPhone,
            regName: "",
            regAge: "Under 19",
            regCodeNo: "",
            error: "",
          });
        }
      } catch (err) {
        console.error("Lookup error:", err);
        setState({ error: err.message || "Network error. Please try again." });
      }
    };
  }

  // To Staff View Link
  const toStaffBtn = document.getElementById("toStaffViewBtn");
  if (toStaffBtn) {
    toStaffBtn.onclick = () => {
      setState({ screen: "staff_pin", pinInput: "", pinError: "", error: "" });
    };
  }

  // 2. Registration Step 1 Submit (Pages 2 & 3)
  const regStep1Form = document.getElementById("regStep1Form");
  if (regStep1Form) {
    regStep1Form.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById("regName")?.value.trim() || "";
      const codeNo = document.getElementById("regCodeNo")?.value.trim() || "";

      if (!name) {
        setState({ error: "Please enter your Full Name." });
        return;
      }

      setState({
        regName: name,
        regCodeNo: codeNo,
        ageDropdownOpen: false,
        error: "",
        screen: "register_step2",
      });
    };

    // Toggle Age Dropdown (Page 3)
    const ageTrigger = document.getElementById("ageDropdownTrigger");
    if (ageTrigger) {
      ageTrigger.onclick = (e) => {
        e.stopPropagation();
        setState({ ageDropdownOpen: !state.ageDropdownOpen });
      };
    }

    // Select Age Option
    document.querySelectorAll("[data-age]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const selectedAge = el.getAttribute("data-age");
        setState({ regAge: selectedAge, ageDropdownOpen: false });
      };
    });
  }

  // Start Over Links
  const startOverBtn = document.getElementById("startOverBtn");
  if (startOverBtn) {
    startOverBtn.onclick = () => {
      setState({ screen: "entry", error: "" });
    };
  }
  const startOverBtn2 = document.getElementById("startOverBtn2");
  if (startOverBtn2) {
    startOverBtn2.onclick = () => {
      setState({ screen: "entry", error: "" });
    };
  }

  // 3. Registration Step 2 Submit (Pages 4 & 5)
  const regStep2Form = document.getElementById("regStep2Form");
  if (regStep2Form) {
    regStep2Form.onsubmit = async (e) => {
      e.preventDefault();
      const scdGroup = document.getElementById("regScdGroup")?.value.trim() || "";
      const occupation = document.getElementById("regOccupation")?.value.trim() || "";
      const ministry = document.getElementById("regMinistry")?.value.trim() || "";

      setState({
        regScdGroup: scdGroup,
        regOccupation: occupation,
        regMinistry: ministry,
        memberStatusDropdownOpen: false,
        error: "",
      });

      try {
        const res = await convex.mutation(api.checkins.registerAndCheckIn, {
          phone: state.regPhone,
          name: state.regName,
          age: state.regAge,
          codeNo: state.regCodeNo,
          scdGroup: scdGroup,
          occupation: occupation,
          memberStatus: state.regMemberStatus,
          ministry: ministry || (state.regMemberStatus === "Member" ? "Member" : "Regular Visitor"),
        });

        setState({
          screen: "confirmed",
          confirmedPerson: {
            name: state.regName,
            ministry: ministry || state.regMemberStatus,
          },
          confirmedCheckinTime: res.checkin?.time || getTimeNowFormatted(),
          error: "",
        });
        showToast("Registration and check-in recorded!");
      } catch (err) {
        console.error("Registration error:", err);
        setState({ error: err.message || "Failed to register. Please try again." });
      }
    };

    // Toggle Member Status Dropdown (Page 5)
    const memberStatusTrigger = document.getElementById("memberStatusDropdownTrigger");
    if (memberStatusTrigger) {
      memberStatusTrigger.onclick = (e) => {
        e.stopPropagation();
        setState({ memberStatusDropdownOpen: !state.memberStatusDropdownOpen });
      };
    }

    document.querySelectorAll("[data-status]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const selectedStatus = el.getAttribute("data-status");
        setState({ regMemberStatus: selectedStatus, memberStatusDropdownOpen: false });
      };
    });
  }

  // 4. Confirmation Done / Start Over (Page 6)
  const confirmDoneBtn = document.getElementById("confirmDoneBtn");
  if (confirmDoneBtn) {
    confirmDoneBtn.onclick = () => {
      setState({
        screen: "entry",
        phoneInput: "",
        confirmedPerson: null,
        error: "",
      });
    };
  }

  // 5. Staff PIN Form (Page 7)
  const staffPinForm = document.getElementById("staffPinForm");
  if (staffPinForm) {
    staffPinForm.onsubmit = (e) => {
      e.preventDefault();
      const enteredPin = document.getElementById("pinInput")?.value || "";

      if (enteredPin === state.adminPin) {
        setState({
          screen: "staff_checkins",
          pinInput: "",
          pinError: "",
          drawerOpen: false,
        });
      } else {
        setState({ pinError: "Incorrect PIN. Please try again." });
      }
    };
  }

  const backToCheckinBtn = document.getElementById("backToCheckinBtn");
  if (backToCheckinBtn) {
    backToCheckinBtn.onclick = () => {
      setState({ screen: "entry", pinInput: "", pinError: "", error: "" });
    };
  }

  // 6. Staff Hamburger Menu & Drawer (Pages 8, 9, 10)
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  if (hamburgerBtn) {
    hamburgerBtn.onclick = () => {
      setState({ drawerOpen: !state.drawerOpen });
    };
  }

  const drawerOverlay = document.getElementById("drawerOverlay");
  if (drawerOverlay) {
    drawerOverlay.onclick = (e) => {
      if (e.target === drawerOverlay) {
        setState({ drawerOpen: false });
      }
    };
  }

  const drawerCheckinsBtn = document.getElementById("drawerCheckinsBtn");
  if (drawerCheckinsBtn) {
    drawerCheckinsBtn.onclick = () => {
      setState({ screen: "staff_checkins", drawerOpen: false });
    };
  }

  const drawerPreviousListsBtn = document.getElementById("drawerPreviousListsBtn");
  if (drawerPreviousListsBtn) {
    drawerPreviousListsBtn.onclick = () => {
      setState({ screen: "staff_previous", drawerOpen: false });
      if (state.previousListMode === "date") {
        loadPreviousRecordsForDate(state.previousListDate);
      }
    };
  }

  const drawerMembersBtn = document.getElementById("drawerMembersBtn");
  if (drawerMembersBtn) {
    drawerMembersBtn.onclick = () => {
      setState({ screen: "staff_members", drawerOpen: false });
    };
  }

  const drawerAddMemberBtn = document.getElementById("drawerAddMemberBtn");
  if (drawerAddMemberBtn) {
    drawerAddMemberBtn.onclick = () => {
      setState({ screen: "staff_add_member", drawerOpen: false });
    };
  }

  const drawerLogoutBtn = document.getElementById("drawerLogoutBtn");
  if (drawerLogoutBtn) {
    drawerLogoutBtn.onclick = () => {
      setState({ screen: "entry", drawerOpen: false, pinInput: "", pinError: "" });
    };
  }

  // Search Toggle in Staff Table (Page 8 & 9)
  const toggleSearchBtn = document.getElementById("toggleSearchBtn");
  if (toggleSearchBtn) {
    toggleSearchBtn.onclick = () => {
      setState({ showSearch: !state.showSearch, searchQuery: "" });
    };
  }

  // Direct In-Place Search Input: Filters table directly WITHOUT destroying the input or losing focus/keystrokes
  const tableSearchInput = document.getElementById("tableSearchInput");
  if (tableSearchInput) {
    tableSearchInput.oninput = (e) => {
      const q = e.target.value;
      state.searchQuery = q;
      const tbody = document.getElementById("checkinsTableBody");
      if (tbody) {
        tbody.innerHTML = renderCheckinsTableRowsHtml(state.checkins, q);
      }
    };
  }

  // Export CSV (Page 8 & 9)
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  if (exportCsvBtn) {
    exportCsvBtn.onclick = () => {
      exportCheckinsCsv();
    };
  }

  // Previous Lists Controls
  const prevModeDateBtn = document.getElementById("prevModeDateBtn");
  if (prevModeDateBtn) {
    prevModeDateBtn.onclick = () => {
      setState({ previousListMode: "date" });
      loadPreviousRecordsForDate(state.previousListDate);
    };
  }

  const prevModeMembersBtn = document.getElementById("prevModeMembersBtn");
  if (prevModeMembersBtn) {
    prevModeMembersBtn.onclick = () => {
      setState({ previousListMode: "all_members" });
    };
  }

  const previousDateInput = document.getElementById("previousDateInput");
  if (previousDateInput) {
    previousDateInput.onchange = (e) => {
      const newDate = e.target.value;
      state.previousListDate = newDate;
      loadPreviousRecordsForDate(newDate);
    };
  }

  const togglePreviousSearchBtn = document.getElementById("togglePreviousSearchBtn");
  if (togglePreviousSearchBtn) {
    togglePreviousSearchBtn.onclick = () => {
      setState({ showPreviousSearch: !state.showPreviousSearch, previousSearchQuery: "" });
    };
  }

  const previousSearchInput = document.getElementById("previousSearchInput");
  if (previousSearchInput) {
    previousSearchInput.oninput = (e) => {
      const q = e.target.value;
      state.previousSearchQuery = q;
      const tbody = document.getElementById("previousTableBody");
      if (tbody) {
        const isDate = state.previousListMode === "date";
        const records = isDate ? state.previousListRecords : state.members;
        tbody.innerHTML = renderCheckinsTableRowsHtml(records, q);
      }
    };
  }

  const exportPreviousCsvBtn = document.getElementById("exportPreviousCsvBtn");
  if (exportPreviousCsvBtn) {
    exportPreviousCsvBtn.onclick = () => {
      exportPreviousCsv();
    };
  }

  // Members View Controls
  const toggleMembersSearchBtn = document.getElementById("toggleMembersSearchBtn");
  if (toggleMembersSearchBtn) {
    toggleMembersSearchBtn.onclick = () => {
      setState({ showMembersSearch: !state.showMembersSearch, membersSearchQuery: "" });
    };
  }

  const membersSearchInput = document.getElementById("membersSearchInput");
  if (membersSearchInput) {
    membersSearchInput.oninput = (e) => {
      const q = e.target.value;
      state.membersSearchQuery = q;
      const tbody = document.getElementById("membersTableBody");
      if (tbody) {
        tbody.innerHTML = renderMembersTableRowsHtml(state.members, q);
        attachRemoveMemberHandlers();
      }
    };
  }

  const exportMembersCsvBtn = document.getElementById("exportMembersCsvBtn");
  if (exportMembersCsvBtn) {
    exportMembersCsvBtn.onclick = () => {
      exportMembersCsv();
    };
  }

  // 7. Staff Add New Member Form (Pages 11 & 12)
  const staffAddMemberForm = document.getElementById("staffAddMemberForm");
  if (staffAddMemberForm) {
    staffAddMemberForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById("staffName")?.value.trim() || "";
      const address = document.getElementById("staffAddress")?.value.trim() || "";
      const occupation = document.getElementById("staffOccupation")?.value.trim() || "";
      const ministry = document.getElementById("staffMinistry")?.value.trim() || "";
      const rawPhone = document.getElementById("staffPhone")?.value || "";
      const cleanPhone = normalizePhone(rawPhone);

      if (!name) {
        setState({ error: "Please enter member name." });
        return;
      }
      if (!cleanPhone || cleanPhone.length < 7) {
        setState({ error: "Valid phone number with at least 7 digits is required." });
        return;
      }

      setState({ error: "" });

      try {
        await convex.mutation(api.members.add, {
          name,
          phone: cleanPhone,
          address,
          occupation,
          age: state.staffNewAge,
          memberStatus: state.staffNewStatus,
          ministry: ministry || (state.staffNewStatus === "Would like to be a member" ? "Prospective Member" : "Visitor"),
        });

        // Also record today's checkin for the newly added member
        await convex.mutation(api.checkins.checkIn, {
          phone: cleanPhone,
        });

        showToast(`Added ${name} and checked in!`);
        setState({
          screen: "staff_members",
          staffNewName: "",
          staffNewAddress: "",
          staffNewOccupation: "",
          staffNewMinistry: "",
          staffNewPhone: "",
          staffAgeDropdownOpen: false,
          staffStatusDropdownOpen: false,
          error: "",
        });
      } catch (err) {
        console.error("Staff add member error:", err);
        setState({ error: err.message || "Failed to add member." });
      }
    };

    // Staff Age Dropdown
    const staffAgeTrigger = document.getElementById("staffAgeDropdownTrigger");
    if (staffAgeTrigger) {
      staffAgeTrigger.onclick = (e) => {
        e.stopPropagation();
        setState({
          staffAgeDropdownOpen: !state.staffAgeDropdownOpen,
          staffStatusDropdownOpen: false,
        });
      };
    }

    document.querySelectorAll("[data-staff-age]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const selected = el.getAttribute("data-staff-age");
        setState({ staffNewAge: selected, staffAgeDropdownOpen: false });
      };
    });

    // Staff Status Dropdown
    const staffStatusTrigger = document.getElementById("staffStatusDropdownTrigger");
    if (staffStatusTrigger) {
      staffStatusTrigger.onclick = (e) => {
        e.stopPropagation();
        setState({
          staffStatusDropdownOpen: !state.staffStatusDropdownOpen,
          staffAgeDropdownOpen: false,
        });
      };
    }

    document.querySelectorAll("[data-staff-status]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const selected = el.getAttribute("data-staff-status");
        setState({ staffNewStatus: selected, staffStatusDropdownOpen: false });
      };
    });
  }

  // Attach member remove action listeners
  attachRemoveMemberHandlers();

  // Close dropdowns on outside click
  window.onclick = (e) => {
    if (
      state.ageDropdownOpen ||
      state.memberStatusDropdownOpen ||
      state.staffAgeDropdownOpen ||
      state.staffStatusDropdownOpen
    ) {
      setState({
        ageDropdownOpen: false,
        memberStatusDropdownOpen: false,
        staffAgeDropdownOpen: false,
        staffStatusDropdownOpen: false,
      });
    }
  };
}

// -------------------------------------------------------------
// CSV EXPORT
// -------------------------------------------------------------
function exportCheckinsCsv() {
  const checkins = state.checkins || [];
  if (!checkins.length) {
    showToast("No check-ins to export for today.");
    return;
  }

  const headers = [
    "Name",
    "Age",
    "Phone No.",
    "SCD Group",
    "Occupation",
    "Code No.",
    "Member Status",
    "Ministry",
    "Time",
    "Date",
  ];

  const rows = checkins.map((c) => [
    `"${(c.name || "").replace(/"/g, '""')}"`,
    `"${(c.age || "").replace(/"/g, '""')}"`,
    `"${c.phone || ""}"`,
    `"${(c.scdGroup || "").replace(/"/g, '""')}"`,
    `"${(c.occupation || "").replace(/"/g, '""')}"`,
    `"${(c.codeNo || "").replace(/"/g, '""')}"`,
    `"${(c.memberStatus || "").replace(/"/g, '""')}"`,
    `"${(c.ministry || "").replace(/"/g, '""')}"`,
    `"${c.time || ""}"`,
    `"${c.date || ""}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CCC_Adum_Checkins_${getTodayKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Check-in list exported to CSV!");
}

async function loadPreviousRecordsForDate(dateStr) {
  try {
    const records = await convex.query(api.checkins.getForDate, { date: dateStr });
    state.previousListRecords = records || [];
    const tbody = document.getElementById("previousTableBody");
    if (tbody) {
      const q = state.previousSearchQuery || "";
      tbody.innerHTML = renderCheckinsTableRowsHtml(state.previousListRecords, q);
    }
  } catch (err) {
    console.error("Failed to load records for date:", err);
  }
}

function exportPreviousCsv() {
  const isDate = state.previousListMode === "date";
  let records = isDate ? state.previousListRecords : state.members;
  const q = (state.previousSearchQuery || "").toLowerCase().trim();
  if (q) {
    records = records.filter((r) => {
      const text = `${r.name || ""} ${r.phone || ""} ${r.occupation || ""} ${r.scdGroup || ""} ${r.ministry || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  if (!records || !records.length) {
    showToast("No records to export.");
    return;
  }

  const headers = [
    "Name",
    "Age",
    "Phone No.",
    "SCD Group",
    "Occupation",
    "Code No.",
    "Member Status",
    "Ministry",
    "Time",
    "Date",
  ];

  const rows = records.map((c) => [
    `"${(c.name || "").replace(/"/g, '""')}"`,
    `"${(c.age || "").replace(/"/g, '""')}"`,
    `"${c.phone || ""}"`,
    `"${(c.scdGroup || "").replace(/"/g, '""')}"`,
    `"${(c.occupation || "").replace(/"/g, '""')}"`,
    `"${(c.codeNo || "").replace(/"/g, '""')}"`,
    `"${(c.memberStatus || "").replace(/"/g, '""')}"`,
    `"${(c.ministry || "").replace(/"/g, '""')}"`,
    `"${c.time || ""}"`,
    `"${c.date || (isDate ? state.previousListDate : "")}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filenameTag = isDate ? state.previousListDate : "All_Members";
  a.download = `CCC_Adum_${filenameTag}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Previous list exported to CSV!");
}

function attachRemoveMemberHandlers() {
  const table = document.getElementById("membersTableBody");
  if (!table) return;

  table.onclick = async (e) => {
    const btn = e.target.closest(".btn-remove-member");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const phone = btn.getAttribute("data-remove-phone");
    const name = btn.getAttribute("data-remove-name") || "this member";
    if (!phone) return;

    // Direct optimistic UI removal - instantaneous feedback
    const prevMembers = [...state.members];
    state.members = state.members.filter((m) => m.phone !== phone);

    table.innerHTML = renderMembersTableRowsHtml(state.members, state.membersSearchQuery);
    showToast(`Removed ${name} from members.`);

    try {
      await convex.mutation(api.members.remove, { phone });
    } catch (err) {
      console.error("Failed to remove member:", err);
      try {
        const clean = phone.replace(/\D/g, "");
        if (clean && clean !== phone) {
          await convex.mutation(api.members.remove, { phone: clean });
          return;
        }
      } catch (e2) {}
      // Revert optimistic update only if mutation completely failed
      state.members = prevMembers;
      table.innerHTML = renderMembersTableRowsHtml(state.members, state.membersSearchQuery);
      showToast(`Failed to remove ${name}.`);
    }
  };
}

function exportMembersCsv() {
  let list = state.members || [];
  const q = (state.membersSearchQuery || "").toLowerCase().trim();
  if (q) {
    list = list.filter((m) => {
      const text = `${m.name || ""} ${m.phone || ""} ${m.occupation || ""} ${m.scdGroup || ""} ${m.ministry || ""} ${m.codeNo || ""} ${m.memberStatus || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  if (!list.length) {
    showToast("No members to export.");
    return;
  }

  const headers = [
    "Name",
    "Age",
    "Phone No.",
    "SCD Group",
    "Occupation",
    "Code No.",
    "Member Status",
    "Ministry",
  ];

  const rows = list.map((m) => [
    `"${(m.name || "").replace(/"/g, '""')}"`,
    `"${(m.age || "").replace(/"/g, '""')}"`,
    `"${m.phone || ""}"`,
    `"${(m.scdGroup || "").replace(/"/g, '""')}"`,
    `"${(m.occupation || "").replace(/"/g, '""')}"`,
    `"${(m.codeNo || "").replace(/"/g, '""')}"`,
    `"${(m.memberStatus || "").replace(/"/g, '""')}"`,
    `"${(m.ministry || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CCC_Adum_Members_${getTodayKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Members list exported to CSV!");
}

// -------------------------------------------------------------
// CONVEX LIVE SUBSCRIPTIONS
// -------------------------------------------------------------
function initConvex() {
  const today = getTodayKey();

  // 1. Live Checkins for Today
  convex.onUpdate(api.checkins.getForDate, { date: today }, (records) => {
    state.checkins = records || [];
    state.isConvexConnected = true;
    render();
  });

  // 2. Live Members List
  convex.onUpdate(api.members.list, {}, (membersList) => {
    state.members = membersList || [];
    render();
  });

  // 3. Admin PIN
  convex.onUpdate(api.settings.getPin, {}, (pin) => {
    if (pin) {
      state.adminPin = pin;
    }
  });
}

// Start
initConvex();
render();
