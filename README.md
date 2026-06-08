# 🐈 CatResumeMaker — Continuous ATS Resume Optimizer

**CatResumeMaker** is an offline-first and AI-augmented continuous resume builder designed to solve the "frozen CV" problem. Built for modern software developers and technical professionals, it lets you log your daily tasks, achievements, and metrics in real-time, then uses Gemini to synthetically merge those lines into an ATS-optimized, high-scoring structured curriculum vitae.

---

## 🐕 Recruiter Quick Start Guide

### 🌟 Core Value Proposition
Traditional resumes are static, lagging documents. Software developers build incredible microservices in March but forget the concrete latency percentages and metrics by December. **CatResumeMaker** keeps a live, stateful continuous database where a developer can jot down raw natural language notes on any day of the week, and watch them materialize into beautifully arranged, STAR-method bullets instantly.

### 💼 Technical Architecture
- **Frontend**: Single Page React 19 application, fully styled in Tailwind CSS v4, with responsive real-time PDF preview sheets matching standard physical A4 margins.
- **Backend**: Express.js server acting as a secure gateway proxy to manage prompts, schema validation, and system connectivity.
- **AI Engine**: Powered by Google Gemini APIs, using structured JSON schemas to ensure zero-loss parsings.
- **Bilingual Core**: Integrated support for Castilian Spanish ("Castellano") and English, auto-detecting browser languages and offering interactive flashing selectors.

---

## 🛠️ Step-by-Step Interactive Demo Walkthrough

Try the following steps to see CatResumeMaker's live pipeline in action:

1. **System Health Check**: Verify the status badge in the navbar matches **"Gemini Engine Ready"** with live ping speeds.
2. **Matrix Construction**: Go to the **"Re-Build Base"** (Reconstruir Base) tab, click **"Load Sample Profile Ingestion"**, and hit **"Build My Resume"**. Watch Gemini's structured pipeline pass through several phases to reconstruct bullet achievements in STAR formats.
3. **Continuous Updating**: Under the **"Day-To-Day Sync"** (Sincronización Diaria) tab, type a natural update like: *"Today I integrated Stripe's customer webhook, resolving a double-charge race condition that affected 4% of checkouts."*
4. **AI Merging**: Click **"Quick AI Sync"** to let Gemini analyze your update, figure out *which* role it belongs to, draft the STAR metrics, and offer an interactive side-by-side accept panel.
5. **Print & Export**: Hit **"Print / Export PDF"**, set your browser's print margins to *None* or *Default*, and hold a physical, ATS-ready resume in your hands instantly!

---

## 🏗️ Future Scope: Relational & Firebase Architecture (Next Step Roadmap)

As requested, here is the complete technical blueprint to extend **CatResumeMaker** with user authentication, databases, and encryption.

```
       +------------------ Client-Side (React) ------------------+
       |                                                         |
       |  +------------------+         +------------------+      |
       |  |   Google Auth    |         |   AES-GCM Web    |      |
       |  |  Popup / Redirect|         |   Crypto API     |      |
       |  +--------+---------+         +--------+---------+      |
       |           |                            |                |
       +-----------|----------------------------|----------------+
                   |                            |
                   v                            v
       +------------------ Firebase Cloud Engine ---------------+
       |                                                         |
       |  +------------------+         +------------------+      |
       |  |  Firebase Auth   +-------->+    Firestore     |      |
       |  |  (Google / FB)   |         | (Encrypted Vault)|      |
       |  +------------------+         +------------------+      |
       |                                                         |
       +---------------------------------------------------------+
```

### 1. Verification & Security Rules (`firestore.rules`)
To protect user records while allowing Firestore synchronization, the security model restricts document read/write permission to authenticated owners exclusively. This is governed by the following strict ruleset:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection matching the strict authenticated UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /resumes/{resumeId} {
        allow read, write, create, delete: if request.auth != null && request.auth.uid == userId;
      }
      match /logs/{logId} {
        allow read, write, create, delete: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 2. Client-Side Encryption Strategy
To guarantee recruiter-ready privacy where even DB administrators cannot leak profiles, we propose a client-side encryption framework using the built-in standard browser **Web Crypto API (AES-GCM)**:

1. **Key Derivation**: When a user signs in, a persistent cryptographic master key is derived from their authentication credentials (pbkdf2 hash) or generated and stored inside their device's IndexedDB.
2. **Encryption Process**: Before payload delivery to Firestore, the raw JSON CV object is encrypted client-side:
   ```javascript
   const encoder = new TextEncoder();
   const rawData = encoder.encode(JSON.stringify(resumeJSON));
   const iv = window.crypto.getRandomValues(new Uint8Array(12));
   
   const encryptedBuffer = await window.crypto.subtle.encrypt(
     { name: "AES-GCM", iv: iv },
     cryptoKey,
     rawData
   );
   ```
3. **Storage**: Standard base64-encoded packages of the ciphered string (along with the unique `iv` nonce) are pushed to the Firestore `/resumes` collection. Decryption reverses the flow locally inside the browser.

---

## 🎨 Visual Aesthetics & Identity
- **Mood Space**: Minimal, interstellar slate dark contrast, accented with cybernetic blue and warm indigo highlights.
- **Simulated Page**: A true-to-life 1:1.414 aspect-ratio bounding box simulating physical paper dimensions.
- **Dog Watermark Logo**: Features a visual representation of our beautiful launcher dog in the upper corner!
