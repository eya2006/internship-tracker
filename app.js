const STATUSES = [
  { id: "to_apply", label: "🔎 To Apply" },
  { id: "preparing", label: "📝 Preparing" },
  { id: "applied", label: "📤 Applied" },
  { id: "follow_up", label: "📩 Follow-up" },
  { id: "interview", label: "🎤 Interview" },
  { id: "waiting", label: "⏳ Waiting" },
  { id: "accepted", label: "✅ Accepted" },
  { id: "rejected", label: "❌ Rejected" },
  { id: "withdrawn", label: "🚫 Withdrawn" },
];

const STORAGE_KEY = "internship-tracker-v1";

const EXAMPLE = {
  id: "example",
  company: "Example",
  position: "AI Intern",
  country: "France",
  field: "AI/ML",
  link: "https://example.com/apply",
  dateApplied: "2026-09-26",
  deadline: "2026-10-15",
  status: "applied",
  contact: "HR email",
  followUp: "2026-10-05",
  interview: "—",
  result: "Pending",
  notes: "CV + portfolio sent",
};

let apps = load();
let filter = "all";
let editingId = null;

const $ = (id) => document.getElementById(id);

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [EXAMPLE];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

function statusLabel(id) {
  return STATUSES.find((s) => s.id === id)?.label ?? id;
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function deadlineClass(iso, status) {
  if (!iso || ["accepted", "rejected", "withdrawn"].includes(status)) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  const diff = (due - today) / 86400000;
  if (diff < 0) return "overdue";
  if (diff <= 7) return "due-soon";
  return "";
}

function fillStatusSelect() {
  $("status-select").innerHTML = STATUSES.map(
    (s) => `<option value="${s.id}">${s.label}</option>`
  ).join("");
}

function renderFilters() {
  const chips = [`<button class="chip${filter === "all" ? " active" : ""}" data-filter="all">All</button>`]
    .concat(
      STATUSES.map(
        (s) =>
          `<button class="chip${filter === s.id ? " active" : ""}" data-filter="${s.id}">${s.label}</button>`
      )
    )
    .join("");
  $("filters").innerHTML = chips;
}

function visible() {
  const q = $("search").value.trim().toLowerCase();
  return apps.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (!q) return true;
    return [a.company, a.position, a.country, a.field, a.contact, a.notes, a.result]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

function sortApps(list) {
  const key = $("sort").value;
  const copy = [...list];
  const byDate = (k) => (a, b) => (a[k] || "9999").localeCompare(b[k] || "9999");
  if (key === "deadline") copy.sort(byDate("deadline"));
  if (key === "applied") copy.sort(byDate("dateApplied"));
  if (key === "followup") copy.sort(byDate("followUp"));
  if (key === "company") copy.sort((a, b) => a.company.localeCompare(b.company));
  if (key === "status")
    copy.sort(
      (a, b) =>
        STATUSES.findIndex((s) => s.id === a.status) - STATUSES.findIndex((s) => s.id === b.status)
    );
  return copy;
}

function renderStats() {
  const counts = { all: apps.length };
  for (const s of STATUSES) counts[s.id] = apps.filter((a) => a.status === s.id).length;
  $("stats").innerHTML = [
    `<button class="stat${filter === "all" ? " active" : ""}" data-filter="all"><span class="n">${counts.all}</span><span class="l">Total</span></button>`,
    ...STATUSES.map(
      (s) =>
        `<button class="stat${filter === s.id ? " active" : ""}" data-filter="${s.id}"><span class="n">${counts[s.id]}</span><span class="l">${s.label}</span></button>`
    ),
  ].join("");
}

function renderTable() {
  const rows = sortApps(visible());
  $("empty").classList.toggle("hidden", rows.length > 0);
  $("rows").innerHTML = rows
    .map((a) => {
      const due = deadlineClass(a.deadline, a.status);
      const link = a.link
        ? `<a href="${escapeAttr(a.link)}" target="_blank" rel="noopener">Link</a>`
        : "—";
      return `<tr>
        <td>${escapeHtml(a.company)}</td>
        <td>${escapeHtml(a.position)}</td>
        <td>${escapeHtml(a.country || "—")}</td>
        <td>${escapeHtml(a.field || "—")}</td>
        <td class="link">${link}</td>
        <td>${formatDate(a.dateApplied)}</td>
        <td class="${due}">${formatDate(a.deadline)}</td>
        <td><span class="badge" style="color:var(--${a.status})">${statusLabel(a.status)}</span></td>
        <td>${escapeHtml(a.contact || "—")}</td>
        <td>${formatDate(a.followUp)}</td>
        <td>${escapeHtml(a.interview || "—")}</td>
        <td>${escapeHtml(a.result || "—")}</td>
        <td class="notes">${escapeHtml(a.notes || "—")}</td>
        <td>
          <button class="icon-btn" data-edit="${a.id}" type="button">Edit</button>
          <button class="icon-btn" data-del="${a.id}" type="button">Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

function render() {
  renderFilters();
  renderStats();
  renderTable();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

function openDialog(app) {
  editingId = app?.id ?? null;
  $("dialog-title").textContent = app ? "Edit application" : "Add application";
  const form = $("form");
  form.reset();
  form.company.value = app?.company ?? "";
  form.position.value = app?.position ?? "";
  form.country.value = app?.country ?? "";
  form.field.value = app?.field ?? "";
  form.link.value = app?.link ?? "";
  form.dateApplied.value = app?.dateApplied ?? "";
  form.deadline.value = app?.deadline ?? "";
  form.status.value = app?.status ?? "to_apply";
  form.contact.value = app?.contact ?? "";
  form.followUp.value = app?.followUp ?? "";
  form.interview.value = app?.interview ?? "";
  form.result.value = app?.result ?? "";
  form.notes.value = app?.notes ?? "";
  $("dialog").showModal();
}

function readForm() {
  const form = $("form");
  return {
    id: editingId ?? crypto.randomUUID(),
    company: form.company.value.trim(),
    position: form.position.value.trim(),
    country: form.country.value.trim(),
    field: form.field.value.trim(),
    link: form.link.value.trim(),
    dateApplied: form.dateApplied.value,
    deadline: form.deadline.value,
    status: form.status.value,
    contact: form.contact.value.trim(),
    followUp: form.followUp.value,
    interview: form.interview.value.trim(),
    result: form.result.value.trim(),
    notes: form.notes.value.trim(),
  };
}

$("add-btn").addEventListener("click", () => openDialog(null));
$("cancel").addEventListener("click", () => $("dialog").close());
$("search").addEventListener("input", renderTable);
$("sort").addEventListener("change", renderTable);

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const item = readForm();
  const i = apps.findIndex((a) => a.id === item.id);
  if (i >= 0) apps[i] = item;
  else apps.unshift(item);
  save();
  $("dialog").close();
  render();
});

document.body.addEventListener("click", (e) => {
  const filterBtn = e.target.closest("[data-filter]");
  if (filterBtn) {
    filter = filterBtn.dataset.filter;
    render();
    return;
  }
  const edit = e.target.closest("[data-edit]");
  if (edit) {
    openDialog(apps.find((a) => a.id === edit.dataset.edit));
    return;
  }
  const del = e.target.closest("[data-del]");
  if (del && confirm("Delete this application?")) {
    apps = apps.filter((a) => a.id !== del.dataset.del);
    save();
    render();
  }
});

fillStatusSelect();
render();
