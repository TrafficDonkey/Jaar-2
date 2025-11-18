FloraFlow — Full-Stack Auction Demo (ASP.NET Core + React)

This repo contains a backend (ASP.NET Core 8 + EF Core + JWT) and a frontend (React + Vite).
It’s structured for clean layering (Controllers → Services → EF Core) and a small React app with protected routes.

FloraFlow/
├── VeilingApi/                      # Backend (ASP.NET Core)
│   ├── Controllers/                 # REST endpoints (incl. AuthController)
│   ├── Services/                    # Business logic + interfaces
│   ├── Models/                      # Entity & DTO classes
│   ├── Data/AppDbContext.cs         # EF Core context + fluent config
│   ├── appsettings.json             # Connection strings & JWT key
│   ├── Program.cs                   # DI, Auth, Swagger, CORS
│   └── VeilingApi.csproj
│
└── veiling-frontend/                # Frontend (React + Vite)
    ├── src/
    │   ├── pages/                   # HomePage, Login, Register, Settings (+ per-page CSS)
    │   ├── api.js                   # Fetch wrapper (adds Bearer token)
    │   ├── App.jsx, Layout.jsx      # Routing + global layout (top bar)
    │   ├── ProtectedRoute.jsx       # Auth gate for private routes
    │   ├── main.jsx, index.css      # App entry & global styles
    │   └── *.css
    ├── index.html
    ├── package.json
    └── vite.config.js

------------------------------------------------------------------------------------------

🧰 Prerequisites

.NET 8 SDK

Node.js 18+ (includes npm)

SQL Server (LocalDB or Developer edition)

Recommended: Visual Studio Code with C#, C# Dev Kit, and ESLint extensions

******************************************************************************************

⚙️ Backend — First-time Setup
1. Configure your database & JWT key

Edit VeilingApi/appsettings.json:
{
  "ConnectionStrings": {
    "Default": "Server=(localdb)\\MSSQLLocalDB;Database=VeilingDb;Trusted_Connection=True;MultipleActiveResultSets=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "Key": "replace-with-a-strong-32+char-secret",
    "Issuer": "VeilingApi",
    "Audience": "VeilingApiClient"
  },
  "Logging": {
    "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" }
  },
  "AllowedHosts": "*"
}

JWT key must be ≥ 32 chars for HS256.

------------------------------------------------------------------------------------------

2. Install EF Core tools (if needed)

dotnet tool update --global dotnet-ef

------------------------------------------------------------------------------------------

3. Create / update the database

From inside VeilingApi/:

# If you don't have migrations yet
dotnet ef migrations add Initial

# Create or update the database
dotnet ef database update

------------------------------------------------------------------------------------------

4. Run the backend

dotnet run

Backend starts at something like http://localhost:5146

Swagger UI: http://localhost:5146/swagger

******************************************************************************************

🌐 Frontend — First-time Setup

1. Create a .env file in veiling-frontend/:

VITE_API_BASE=http://localhost:5146/api

------------------------------------------------------------------------------------------

2. Install and run

From inside veiling-frontend/:

npm install
npm run dev


Vite will open http://localhost:5173

The frontend automatically sends the Bearer token from localStorage.token via api.js.

******************************************************************************************

🔐 Authentication Flow (Quick Summary)

Register → POST /api/auth/register

Login → POST /api/auth/login → returns { token, role, gebruikerId }

Frontend stores the token in localStorage.token

Protected pages use ProtectedRoute.jsx (redirects to /login if no token)

------------------------------------------------------------------------------------------

API requests go through api.js, which adds:

Authorization: Bearer <token>

******************************************************************************************

▶️ How to Run (VS Code Integrated Terminals)

Open the workspace root and use two terminals:

Terminal 1 — Backend

cd VeilingApi
dotnet ef database update   # only necessary first time / when migrations changed
dotnet run

------------------------------------------------------------------------------------------

Terminal 2 — Frontend

cd veiling-frontend
npm install                 # first time only
npm run dev


Visit the app at http://localhost:5173
 — it connects to the API at VITE_API_BASE.

 ******************************************************************************************

 🧪 Seeding / Testing Data (optional)

Use VeilingApi/test.sql to insert demo rows manually

Or use Swagger to create:

Gebruikers

Aanvoerders

Aanmeldingen

Veilingen

VeilingProducts

Biedingen

Toewijzingen

******************************************************************************************

🚀 Pushing Everything to GitHub (Terminal)

Below are safe, copy-paste-ready Git flows for common cases.

------------------------------------------------------------------------------------------

Case A — New repo (no remote yet)

From the workspace root:

git init
git add .
git commit -m "Initial commit: backend + frontend"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main

------------------------------------------------------------------------------------------

Case B — Existing remote, push a new branch

git checkout -b feature/frontend-integration
git add .
git commit -m "Add React frontend + protected routes"
git push -u origin feature/frontend-integration

------------------------------------------------------------------------------------------

Case C — You already have a remote & branch, just want to update it

git remote -v        # verify remote
git branch           # verify branch
git add .
git commit -m "Update: services, controllers, pages, styles"
git push             # or git push -u origin <branch-name>

------------------------------------------------------------------------------------------

Case D — Remote has new commits (push rejected)

git fetch origin
git pull --rebase
# fix conflicts if needed
git add <file>
git rebase --continue
git push

------------------------------------------------------------------------------------------

Useful tips

Untracked files: git add . includes all new files.

LF → CRLF warnings: harmless on Windows.
Fix permanently:
git config core.autocrlf true

Preview before push:
git status and git diff --staged

******************************************************************************************

🧩 Common Pitfalls & Fixes

JWT 500 error (“Key size must be ≥ 256 bits”)
→ Ensure your Jwt:Key in appsettings.json is at least 32 chars.

Login works in Swagger, not in UI
→ Ensure VITE_API_BASE matches your backend URL and that tokens are saved in localStorage.

Blank page on startup
→ Check browser console for missing imports or incorrect filenames.

CORS issues
→ Verify Program.cs allows origin http://localhost:5173.

******************************************************************************************

📜 Scripts Cheat Sheet
Backend (from VeilingApi/)

dotnet run
dotnet ef migrations add <Name>
dotnet ef database update

------------------------------------------------------------------------------------------

Frontend (from veiling-frontend/)

npm install
npm run dev
npm run build
npm run preview

******************************************************************************************

🧪 Quick Health Check

✅ Backend reachable: http://localhost:5146/swagger
✅ Frontend loads: http://localhost:5173
✅ Register & Login return JWT token
✅ Private routes redirect to /login if unauthenticated

******************************************************************************************

📣 Contributing

Create a branch: git checkout -b feature/<name>

Commit small, clear changes

Push & open a Pull Request: git push -u origin feature/<name>