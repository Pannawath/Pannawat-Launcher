# Minecraft Modrinth Launcher (Offline & Mod Manager) - Handover & Architecture

## Overview
This project is a dedicated Minecraft Launcher built with Tauri 2 (Rust) and React + Tailwind CSS. It replicates the Modrinth App (Theseus) design and capabilities while supporting offline player authentication (similar to TLauncher / Prism Launcher offline mode) with instant username switching and multi-account storage.

## Key Features Implemented

1. **Pure Modrinth App UI/UX**:
   - Left vertical navigation rail with Modrinth branding, Library (My Instances), Discover (Modrinth Store), Add Instance (+), Settings, and Offline Profile Widget.
   - Glassmorphism dark theme matching official Modrinth colors (`#111216`, `#14161b`, `#00af5c`).
   - Top draggable header bar with navigation history (`<` `>`), live status indicator, player pill, and native window controls (`-`, `[ ]`, `X`).

2. **Offline Authentication & Name Switching**:
   - RFC 4122 UUID v3 deterministic generation (`OfflinePlayer:<username>`) in `crates/auth/src/lib.rs`.
   - `src/components/OfflineAccountModal.jsx`: Interactive modal for switching or renaming player username in real-time.
   - Live player head render (`https://mc-heads.net/avatar/{username}/80`) with fallback.
   - Saved offline accounts list for 1-click account switching (TLauncher style).
   - Launches game with `--username <username> --uuid <uuid> --accessToken 0 --userType legacy`.

3. **Modrinth Content Store & 1-Click Install**:
   - Full Modrinth API integration (`https://api.modrinth.com/v2/`).
   - Search & filter by Modpacks, Mods, Resource Packs, Shaders, Data Packs.
   - Filter by Minecraft versions and mod loaders (Fabric, NeoForge, Forge, Quilt).
   - 1-click install mods directly into the active instance.
   - Project detail modal with markdown description, gallery screenshots, and version selector.

4. **Instance Engine & Multi-Version Support**:
   - Full Mojang version manifest fetch (900+ releases and snapshots).
   - Create custom instances with Fabric loader or Vanilla, custom RAM, and custom names.
   - In-app files explorer for `.minecraft` instance directory with delete and folder open.
   - Real-time console logs viewer with level filtering (ALL, INFO, WARN, ERROR), search, and copy.
   - Download progress events with percentage, speed, and status messages.

## Tech Stack
- Frontend: React 18, Vite 6, Tailwind CSS, Zustand, Lucide React, Framer Motion
- Backend: Tauri 2, Tokio, Reqwest, Serde, UUID v3/v4, MD5
- Workspace Crates:
  - `crates/auth`: Offline session & deterministic UUID generation
  - `crates/game-runtime`: Manifest parser, fabric resolver, mojang assets downloader
  - `crates/jvm-builder`: Cross-platform JVM command line builder & spawner
  - `crates/mod-manager`: Modrinth API search and jar downloader
  - `crates/downloader`: Parallel file downloading & sha1 integrity verification

## Commands
- Build frontend: `npm run build`
- Check Rust: `cargo check`
- Run desktop app: `npm run tauri dev`
- Remote Git: `https://github.com/Pannawath/Pannawat-Launcher.git`

## AI Continuation Prompt
To continue development with another AI agent, paste the following prompt:
```
You are working on the Minecraft Modrinth Launcher located at `C:\Users\mapay\Game launcher`.
The project is a Tauri 2 + React + Rust Minecraft launcher designed with 100% Modrinth App (Theseus) UI/UX and offline authentication (like TLauncher).
Key files:
- `src/App.jsx`: Main launcher root
- `src/pages/MinecraftModrinthHub.jsx`: Main Modrinth view (Library, Discover, Instances, Logs, Files, Settings)
- `src/components/OfflineAccountModal.jsx`: Offline username switcher & avatar preview
- `src/store/profileStore.js`: Zustand store for offline username, saved accounts, and profiles
- `src-tauri/src/commands/launch.rs`: Minecraft launch command orchestrator
- `crates/auth/src/lib.rs`: Offline UUID v3 generator
Follow all project rules: NO EMOJI, concise, high performance, and keep GitHub synced (`git commit` and `git push origin main`).
```
