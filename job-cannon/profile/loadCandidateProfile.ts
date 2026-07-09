import fs from "fs";
import path from "path";
import { candidateProfile as defaultProfile, type CandidateProfile } from "../candidateProfile";
import { getWorkspace } from "../workspace";

export function loadCandidateProfile(): CandidateProfile {
  const ws = getWorkspace();
  const p = ws.candidateProfilePath;
  if (!fs.existsSync(p)) {
    const alt = path.join(path.dirname(ws.root), "candidateProfile.json");
    if (fs.existsSync(alt)) {
      return JSON.parse(fs.readFileSync(alt, "utf8")) as CandidateProfile;
    }
    return defaultProfile;
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as CandidateProfile;
}
