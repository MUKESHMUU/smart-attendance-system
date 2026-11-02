# Smart Attendance Management System

A QR-code attendance system for classrooms. Teachers create classes, start a time-limited attendance session and show a QR code; students log in and scan it with their phone. Built with **React + Vite**, **Node.js + Express**, and **plain JSON files** for storage (no database).

## Objectives
- Replace paper registers with fast, auditable attendance.
- Keep the stack simple enough to understand and demo as a college project.
- Show safe handling of passwords, tokens, roles and concurrent file writes.

## Features
**Teacher:** login, dashboard (students, classes, today's present/absent, active sessions, per-class chart, students below 75%), add/edit/delete/search students, create/edit/delete classes and subjects, start a QR session with a chosen validity (1-120 min), live "N of M present" counter, close sessions, filter records by class/subject/date/status, correct a record, reports with percentages, **CSV download**.

**Student:** login, dashboard (details, today's status, attended/missed, percentage, history), camera QR scanner (plus "scan from a photo" fallback), profile.

## Technology
| Part | Tools |
|---|---|
| Frontend | React 18, Vite, react-router, `qrcode`, `html5-qrcode`, plain CSS |
| Backend | Node.js 18+, Express, `jsonwebtoken`, `bcryptjs`, `cors`, `dotenv`, `uuid` |
| Storage | JSON files via `fs/promises` |
| Cloud | Azure Static Web Apps (frontend), Azure App Service (backend) |

## Architecture
```
Browser (React, :5173)  --HTTPS/JSON + JWT-->  Express API (:5000)
                                                routes -> middleware (JWT, role)
                                                      -> controllers -> utils/jsonDb.js
                                                                           |
                                                                    backend/data/*.json (private)
```
```
backend/
  server.js  routes/  controllers/  middleware/  utils/  scripts/  data/
frontend/src/
  components/  pages/  services/api.js  context/AuthContext.jsx  assets/
```

## Local setup (Node.js 18 or newer)

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```
Open `.env` and set `JWT_SECRET` to a long random value. Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Create the first teacher (the password is hashed; it is never in source code):
```bash
npm run create-teacher
```
Start the API:
```bash
npm run dev      # or: npm start
```
Expected: `API running on port 5000` and the data folder path. Check http://localhost:5000/api/health shows `{"status":"ok",...}`.

### 2. Frontend (second terminal)
```bash
cd frontend
npm install
cp .env.example .env        # contains VITE_API_URL=http://localhost:5000/api
npm run dev
```
Open http://localhost:5173 and sign in as the teacher.

### 3. First run walkthrough
1. **Classes** > Create class (e.g. `CS-A`, subjects `Maths, Physics`).
2. **Students** > Add student (name, roll number, email, class, initial password).
3. **Start attendance** > pick class, subject, validity > Start. The QR appears.
4. On another device/browser, sign in as the student (roll number + password) > **Scan attendance**.
5. Teacher sees the present counter rise. **Close session** when done.
6. **Reports** > Download CSV.

> **Camera note:** browsers allow the camera only on `https://` pages or `localhost`. On the same computer, `localhost` works. To test with a real phone, use the deployed Azure site (HTTPS), or an HTTPS tunnel. Meanwhile, "Scan from a photo" works anywhere.

## JSON storage
All data lives in `backend/data/` (or `DATA_DIR`): `users.json`, `students.json`, `classes.json`, `attendance-sessions.json`, `attendance-records.json`. Files are created automatically on first start and survive restarts.

How `utils/jsonDb.js` keeps data safe:
- Every file has a **queue**: each read-modify-write runs one at a time, so simultaneous scans cannot overwrite each other or create duplicates.
- Writes go to a temp file and are then **renamed**, so a crash never leaves half-written JSON.
- Invalid JSON produces a clear error instead of silently wiping data.
- The `data/` folder is **never served** as static files; the API is the only way in.

**Attendance rules:** a session is *conducted* once it is closed or expired. A student is *present* if a `present` record exists for that session; otherwise *absent*. Percentage = attended / conducted x 100. Dates and times are stored in UTC.

## Testing
**Automated (backend):**
```bash
cd backend && npm test
```
Starts a temporary server with a temporary data folder and checks 33 behaviours: teacher/student login, add/edit/search students, duplicate roll/email rejection, class creation, session start, QR validation, invalid/expired/closed QR rejection, wrong-class rejection, **simultaneous duplicate scans (exactly one record)**, percentage maths (e.g. 1 of 2 = 50%), corrections, CSV export, role/401/403 protection, data folder not exposed, and **persistence after server restart**.

**Manual checklist (UI):**
| Test | Expected |
|---|---|
| Wrong password | "Incorrect email/username or password." |
| Student opens `/teacher` | Redirected to student dashboard |
| Scan same QR twice | Second scan: "Attendance already marked" |
| Scan after validity ends | "This QR code has expired." |
| Scan after Close session | "This attendance session is closed." |
| Student from another class scans | "You do not belong to this class." |
| Stop and restart backend | Students, classes and records still there |
| Reports > Download CSV | File opens in Excel with correct numbers |

## Security
- Passwords hashed with bcrypt (cost 10); the first teacher is made by a script.
- JWT auth on every protected route, plus role checks (students get 403 on teacher APIs; a student can read only their own attendance).
- QR codes hold only a random 192-bit token, valid for the chosen time. No credentials or personal data.
- The student's identity comes from their **JWT**, never from anything typed or scanned, so a student ID cannot be entered by hand to mark attendance.
- Input validation on all write endpoints; duplicate roll numbers/emails blocked; CSV cells protected from spreadsheet formula injection.
- CORS limited to `CLIENT_URL`; secrets only in environment variables; `.env` and `data/*.json` are git-ignored.

**Important limitation:** a valid scan proves the logged-in account *had a valid QR code*. It does **not** prove the student was physically present, or that the account owner was holding the phone (a friend could be sent a photo of the QR and log in as someone else). Short validity windows reduce but do not remove this risk.

## Azure deployment

### Costs, read first
Check current prices at https://azure.microsoft.com/pricing/calculator/ before creating anything. Typical figures (approximate, vary by region):
| Resource | Plan | Approx. cost |
|---|---|---|
| Static Web Apps (frontend) | Free | $0 |
| App Service (backend) | **Free F1** | $0, but limited CPU minutes/day, sleeps when idle, no Always On (fine for a quick demo) |
| App Service (backend) | **Basic B1** | roughly $13-15 per month, always available, recommended for a real demo |
No database cost exists because there is no database. Delete the resource group when you finish to stop charges.

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "Smart Attendance"
```
Create an empty GitHub repo and push. Check that `.env` and `data/*.json` are **not** listed (the `.gitignore` handles this).

### 2. Backend on App Service
1. Azure Portal > **Create a resource > Web App**. Publish: *Code*, Runtime: *Node 20 LTS*, OS: **Linux**, choose Free F1 or B1.
2. After creation, open it > **Settings > Environment variables** and add:
   | Name | Value |
   |---|---|
   | `JWT_SECRET` | a new long random value (not the local one) |
   | `CLIENT_URL` | your frontend URL, set after step 3 (e.g. `https://xxxx.azurestaticapps.net`) |
   | `DATA_DIR` | `/home/data` |
3. **Why `/home/data`:** on Linux App Service the `/home` directory is persistent storage that survives restarts and redeployments. Code folders may be replaced on deploy, so never keep data beside the code.
4. **Settings > Configuration > General:** Startup command `npm start`. **Settings > Configuration > General** (or *TLS/SSL*): turn **HTTPS Only** on.
5. **Monitoring > Health check:** path `/api/health`.
6. **Scale:** keep it to **one instance** (see limitations).
7. **Deploy:** GitHub repo > Settings > Secrets and variables > Actions. Add secret `AZURE_WEBAPP_PUBLISH_PROFILE` (download the publish profile from the App Service Overview page) and variable `AZURE_WEBAPP_NAME`. Push to `main` and `.github/workflows/backend-azure.yml` deploys `backend/`.
8. **Create the teacher account:** App Service > Development Tools > **SSH** (or Console):
   ```bash
   cd /home/site/wwwroot
   node scripts/createTeacher.js "Your Name" you@example.com yourusername "StrongPassword1"
   ```
9. Visit `https://<app-name>.azurewebsites.net/api/health`. Expect `{"status":"ok"}`.

### 3. Frontend on Static Web Apps
1. Portal > **Create > Static Web App**, plan **Free**, source **GitHub**, pick your repo and `main`.
2. Build presets: *React*; **App location** `frontend`; **Output location** `dist`; leave API location empty.
3. Azure adds a workflow file to your repo. Open it and add the backend URL to the build step so Vite bakes it in:
   ```yaml
   env:
     VITE_API_URL: https://<app-name>.azurewebsites.net/api
   ```
   (put this under the `Azure/static-web-apps-deploy` step's `env:`), then commit.
4. Copy the site URL (`https://xxxx.azurestaticapps.net`) and set it as `CLIENT_URL` on the App Service (step 2.2), then restart the backend.
5. `frontend/public/staticwebapp.config.json` makes page refreshes work on routes like `/teacher/students`.

### 4. Verify persistence
1. Sign in on the Azure site, add a class and a student.
2. Portal > App Service > **Restart**. Wait a minute, sign in again. Your data must still be there.
3. Push any small backend change (redeploy) and check again.

### 5. Back up the JSON files
- **Manual:** open `https://<app-name>.scm.azurewebsites.net/api/zip/data/` (sign in with Azure account) to download a zip of `/home/data`.
- **Or** SSH in and run `tar czf /home/backup-$(date +%F).tgz /home/data`, then download it.
- Do this before every demo and after major changes. Treat backups as private: they contain password hashes and student details.

### Troubleshooting
| Problem | Fix |
|---|---|
| Login says "Cannot reach the server" | Wrong `VITE_API_URL`, or backend asleep (Free plan): open `/api/health` first |
| Browser console shows a CORS error | `CLIENT_URL` must match the frontend URL exactly (no trailing slash) |
| Backend won't start, mentions JWT_SECRET | Add `JWT_SECRET` (16+ characters) in App Service settings |
| Data disappears after redeploy | `DATA_DIR` is not `/home/data` |
| Camera does not open | Needs HTTPS or localhost, and camera permission allowed |

## Limitations and future enhancements
- **JSON files suit a small demo.** The write lock lives inside one Node process, so run **one backend instance only**. Scaling out, or two servers sharing one folder, could lose writes. Every request also reads whole files, so it slows with thousands of records.
- QR attendance does not prove physical presence (see Security).
- Logout is client-side (JWTs are stateless); tokens expire after `JWT_EXPIRES_IN` (default 8h).
- Dates use UTC, so a class near local midnight may be filed under a different date.
- Ideas: a real database (Azure SQL / Cosmos DB) when you outgrow files, rotating QR codes every few seconds, geofencing or device checks, password reset and student self-service password change, rate-limiting logins, email notifications, bulk student import from CSV.
