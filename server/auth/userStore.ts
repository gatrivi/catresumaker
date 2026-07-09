import fs from "fs";
import path from "path";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "./password";
import { ensureUserWorkspace, getUserWorkspace } from "../../job-cannon/workspace";
import { candidateProfile as defaultCandidateProfile } from "../../job-cannon/candidateProfile";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

type UsersIndex = { users: UserRecord[] };

export class UserStore {
  constructor(private dataRoot: string) {
    fs.mkdirSync(this.dataRoot, { recursive: true });
    fs.mkdirSync(path.join(this.dataRoot, "users"), { recursive: true });
    if (!fs.existsSync(this.indexPath())) {
      this.saveIndex({ users: [] });
    }
  }

  private indexPath() {
    return path.join(this.dataRoot, "users-index.json");
  }

  private loadIndex(): UsersIndex {
    return JSON.parse(fs.readFileSync(this.indexPath(), "utf8")) as UsersIndex;
  }

  private saveIndex(index: UsersIndex) {
    fs.writeFileSync(this.indexPath(), JSON.stringify(index, null, 2) + "\n", "utf8");
  }

  findByEmail(email: string): UserRecord | undefined {
    const norm = email.trim().toLowerCase();
    return this.loadIndex().users.find((u) => u.email === norm);
  }

  findById(id: string): UserRecord | undefined {
    return this.loadIndex().users.find((u) => u.id === id);
  }

  async register(email: string, password: string, name: string): Promise<UserRecord> {
    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !password || password.length < 8) {
      throw new Error("Email required and password must be at least 8 characters.");
    }
    if (this.findByEmail(normEmail)) {
      throw new Error("An account with this email already exists.");
    }

    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normEmail,
      name: name.trim() || normEmail.split("@")[0],
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    const index = this.loadIndex();
    index.users.push(user);
    this.saveIndex(index);
    this.initUserData(user);
    return user;
  }

  async login(email: string, password: string): Promise<UserRecord> {
    const user = this.findByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new Error("Invalid email or password.");
    }
    return user;
  }

  userDir(userId: string) {
    return path.join(this.dataRoot, "users", userId);
  }

  private initUserData(user: UserRecord) {
    const dir = this.userDir(user.id);
    fs.mkdirSync(dir, { recursive: true });

    const ws = getUserWorkspace(user.id, this.dataRoot);
    ensureUserWorkspace(ws);

    const template = {
      fullName: user.name,
      email: user.email,
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      currentCompany: "Independent Developer",
      desiredSalary: "Flexible depending on scope and benefits",
      desiredSalaryIfForcedNumber: "",
      startTiming: "Available within 2 weeks",
      proofProjects: [
        {
          id: "project-1",
          name: "Your best project",
          github: "",
          description: "Replace with your real React/TypeScript proof project.",
        },
      ],
    };

    const profilePath = path.join(dir, "candidateProfile.json");
    if (!fs.existsSync(profilePath)) {
      fs.writeFileSync(profilePath, JSON.stringify(template, null, 2) + "\n", "utf8");
      fs.writeFileSync(ws.candidateProfilePath, JSON.stringify(template, null, 2) + "\n", "utf8");
    }

    if (!fs.existsSync(ws.formAnswersPath)) {
      fs.writeFileSync(
        ws.formAnswersPath,
        JSON.stringify(
          {
            fullName: user.name,
            email: user.email,
            phone: "",
            location: "",
            linkedin: "",
            github: "",
            portfolio: "",
            availability: "Within 2 weeks",
            salaryExpectation: "Flexible",
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
    }

    if (!fs.existsSync(path.join(dir, "resume.json"))) fs.writeFileSync(path.join(dir, "resume.json"), "null\n", "utf8");
    if (!fs.existsSync(path.join(dir, "logs.json"))) fs.writeFileSync(path.join(dir, "logs.json"), "[]\n", "utf8");
    if (!fs.existsSync(path.join(dir, "settings.json"))) {
      fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({ templateId: "ats-classic", lang: "es" }, null, 2) + "\n", "utf8");
    }
  }

  /** Copy legacy repo job-cannon into this user's workspace (one-time). */
  claimLegacyJobCannon(userId: string, legacyRoot: string): { copied: boolean; reason?: string } {
    const ws = getUserWorkspace(userId, this.dataRoot);
    ensureUserWorkspace(ws);
    const existing = fs.existsSync(ws.jobsDir) ? fs.readdirSync(ws.jobsDir) : [];
    if (existing.length > 0) {
      return { copied: false, reason: "User workspace already has jobs." };
    }

    const legacyJobs = path.join(legacyRoot, "jobs");
    if (!fs.existsSync(legacyJobs)) {
      return { copied: false, reason: "No legacy jobs folder." };
    }

    this.copyDir(legacyJobs, ws.jobsDir);
    const legacyQueue = path.join(legacyRoot, "ApplyQueue.json");
    if (fs.existsSync(legacyQueue)) fs.copyFileSync(legacyQueue, ws.queuePath);
    const legacyInbox = path.join(legacyRoot, "inbox");
    if (fs.existsSync(legacyInbox)) this.copyDir(legacyInbox, path.dirname(ws.inboxPath));
    const legacyProfileDir = path.join(legacyRoot, "profile");
    if (fs.existsSync(legacyProfileDir)) this.copyDir(legacyProfileDir, path.dirname(ws.formAnswersPath));

    const profileJson = JSON.stringify(defaultCandidateProfile, null, 2) + "\n";
    fs.writeFileSync(ws.candidateProfilePath, profileJson, "utf8");
    fs.writeFileSync(path.join(this.userDir(userId), "candidateProfile.json"), profileJson, "utf8");

    return { copied: true };
  }

  private copyDir(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) this.copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }
}
