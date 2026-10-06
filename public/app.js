
const socket = io();
const teamGrid = document.getElementById("team");
const search = document.getElementById("search");
const filter = document.getElementById("filter");
const message = document.getElementById("message");

let members = [];
let pending = new Set();

async function loadTeam() {
  try {
    const response = await fetch("/api/team");
    if (!response.ok) throw new Error("Could not load team");

    members = await response.json();
    render();
    updateStats();
    message.textContent = "Team data loaded successfully.";
  } catch {
    message.textContent = "Unable to load team. Check that the server is running.";
  }
}

function updateStats() {
  for (const status of ["Available", "Busy", "Away"]) {
    document.getElementById(status.toLowerCase()).textContent =
      members.filter(m => m.status === status).length;
  }
  document.getElementById("total").textContent = members.length;
}

function render() {
  const term = search.value.trim().toLowerCase();
  const statusFilter = filter.value;

  const visible = members.filter(m =>
    (m.name.toLowerCase().includes(term) ||
     m.role.toLowerCase().includes(term)) &&
    (statusFilter === "All" || m.status === statusFilter)
  );

  teamGrid.replaceChildren();

  for (const member of visible) {
    const card = document.createElement("article");
    card.className = "member";

    const name = document.createElement("h3");
    name.textContent = member.name;

    const role = document.createElement("p");
    role.className = "role";
    role.textContent = member.role;

    const badge = document.createElement("span");
    badge.className = `badge ${member.status}`;
    badge.textContent = `● ${member.status}`;

    const timezone = document.createElement("p");
    timezone.className = "timezone";
    timezone.textContent = `🌍 ${member.timezone}`;

    const buttons = document.createElement("div");
    buttons.className = "buttons";

    for (const status of ["Available", "Busy", "Away"]) {
      const button = document.createElement("button");
      button.textContent = status;
      button.disabled = pending.has(member.id) ||
        member.status === status;

      button.addEventListener("click", () =>
        changeStatus(member.id, status)
      );

      buttons.append(button);
    }

    card.append(name, role, badge, timezone, buttons);
    teamGrid.append(card);
  }

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.textContent = "No team members match your search.";
    teamGrid.append(empty);
  }
}

async function changeStatus(id, status) {
  if (pending.has(id)) return;

  pending.add(id);
  render();

  try {
    const response = await fetch(`/api/team/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Update failed");

    updateMember(result);
    message.textContent = `${result.name} is now ${result.status}.`;
  } catch (error) {
    message.textContent = error.message;
  } finally {
    pending.delete(id);
    render();
  }
}

function updateMember(updated) {
  const index = members.findIndex(m => m.id === updated.id);
  if (index !== -1) members[index] = updated;
  render();
  updateStats();
}

socket.on("teamStatusUpdated", updateMember);
socket.on("connect", () => {
  message.textContent = "Live connection established.";
});
socket.on("disconnect", () => {
  message.textContent = "Connection lost. Reconnecting...";
});

search.addEventListener("input", render);
filter.addEventListener("change", render);

loadTeam();