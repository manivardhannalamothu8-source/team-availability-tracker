
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { JSONFilePreset } from "lowdb/node";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const initialTeam = [
  [1, "Design", "Busy", "Europe/London"],
  [2, "Product", "Away", "Asia/Kolkata"],
  [3, "Engineering", "Available", "Europe/London"],
  [4, "QA", "Away", "Europe/London"],
  [5, "QA", "Busy", "Europe/London"],
  [6, "Product", "Away", "America/New_York"],
  [7, "Engineering", "Away", "America/New_York"],
  [8, "QA", "Busy", "America/New_York"],
  [9, "QA", "Busy", "Asia/Kolkata"],
  [10, "Design", "Available", "Asia/Kolkata"],
  [11, "Design", "Available", "America/New_York"],
  [12, "Product", "Available", "America/New_York"],
  [13, "Engineering", "Busy", "Europe/London"],
  [14, "Design", "Available", "America/New_York"],
  [15, "QA", "Busy", "Asia/Kolkata"],
  [16, "Design", "Away", "Europe/London"],
  [17, "QA", "Away", "America/New_York"],
  [18, "Engineering", "Busy", "Asia/Kolkata"],
  [19, "Engineering", "Busy", "Europe/London"],
  [20, "QA", "Away", "Asia/Kolkata"],
  [21, "QA", "Available", "America/New_York"],
  [22, "QA", "Busy", "Europe/London"],
  [23, "Product", "Available", "Europe/London"],
  [24, "Engineering", "Busy", "America/New_York"],
  [25, "Engineering", "Away", "Europe/London"],
  [26, "QA", "Away", "Europe/London"],
  [27, "Product", "Busy", "America/New_York"],
  [28, "Design", "Busy", "Asia/Kolkata"],
  [29, "Product", "Busy", "America/New_York"],
  [30, "QA", "Away", "Europe/London"],
  [31, "Design", "Busy", "America/New_York"],
  [32, "Design", "Away", "Asia/Kolkata"],
  [33, "Design", "Available", "Asia/Kolkata"],
  [34, "QA", "Busy", "Asia/Kolkata"],
  [35, "Design", "Available", "America/New_York"],
  [36, "QA", "Away", "America/New_York"],
  [37, "Design", "Away", "America/New_York"],
  [38, "Engineering", "Available", "America/New_York"],
  [39, "Product", "Away", "Asia/Kolkata"],
  [40, "QA", "Away", "Europe/London"]
];

const statuses = ["Available", "Busy", "Away"];

const db = await JSONFilePreset("data.json", {
  team: initialTeam.map(([id, role, status, timezone]) => ({
    id,
    name: `Team Member ${id}`,
    role,
    status,
    timezone,
    updatedAt: new Date().toISOString()
  }))
});

// Seed only when the database has no team members.
if (!db.data.team.length) {
  db.data.team = initialTeam.map(([id, role, status, timezone]) => ({
    id,
    name: `Team Member ${id}`,
    role,
    status,
    timezone,
    updatedAt: new Date().toISOString()
  }));
  await db.write();
}

app.get("/api/team", (req, res) => {
  res.json(db.data.team);
});

app.get("/api/team/:id", (req, res) => {
  const member = db.data.team.find(
    m => m.id === Number(req.params.id)
  );

  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  res.json(member);
});

app.patch("/api/team/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!statuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const member = db.data.team.find(
    m => m.id === Number(req.params.id)
  );

  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  member.status = status;
  member.updatedAt = new Date().toISOString();

  await db.write();

  io.emit("teamStatusUpdated", member);
  res.json(member);
});

io.on("connection", socket => {
  console.log("Browser connected:", socket.id);
});

server.listen(PORT, () => {
  console.log(`Team Tracker running at http://localhost:${PORT}`);
  console.log(`Team members: ${db.data.team.length}`);
});