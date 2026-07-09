import fs from "fs";
import path from "path";

export class UserDataStore {
  constructor(private dataRoot: string) {}

  userDir(userId: string) {
    return path.join(this.dataRoot, "users", userId);
  }

  readJson<T>(userId: string, file: string, fallback: T): T {
    const p = path.join(this.userDir(userId), file);
    if (!fs.existsSync(p)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(p, "utf8")) as T;
    } catch {
      return fallback;
    }
  }

  writeJson(userId: string, file: string, data: unknown) {
    const dir = this.userDir(userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  writeText(userId: string, file: string, text: string) {
    const dir = this.userDir(userId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), text, "utf8");
  }

  readText(userId: string, file: string): string | null {
    const p = path.join(this.userDir(userId), file);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  }
}
