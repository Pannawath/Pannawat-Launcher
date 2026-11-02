# Minecraft Modrinth-Style Offline Launcher Architecture

## Purpose
A dedicated, standalone Minecraft Launcher delivering 1:1 functional and visual alignment with the Modrinth App (Theseus) design system, combined with offline authentication (similar to TLauncher / Prism Launcher offline mode) for player name flexibility, local LAN play, and offline server compatibility.

## Core Pillars

1. **User Identity & Offline Engine**:
   - Deterministic offline UUID computation conforming to RFC 4122 v3 (`OfflinePlayer:<username>`).
   - Dynamic username changing at any time directly through the sidebar or top bar.
   - Saved offline account history for seamless 1-click switching.
   - Avatar head resolution via standard Minecraft avatar APIs with local fallback.

2. **Modrinth Store Integration**:
   - Direct integration with Modrinth REST API (`https://api.modrinth.com/v2/`).
   - Search across Modpacks, Mods, Resource Packs, Shaders, and Data Packs.
   - Compatibility filtering by target Minecraft version and loader (Fabric, NeoForge, Forge, Quilt).
   - 1-click installation to current active instance.

3. **Instance Isolation & Runtime Management**:
   - Each instance maintains its own isolated directories (`mods/`, `saves/`, `resourcepacks/`, `shaderpacks/`).
   - Mojang version manifest integration with support for 900+ versions (releases and snapshots).
   - Automatic Java runtime verification and configurable RAM allocation (min/max).
   - Process lifecycle tracking with real-time piped logs and force kill guard.
   - Built-in file browser allowing directory inspection and management.

4. **UI Design System**:
   - Modrinth App dark theme (`#111216`, `#14161b`, `#00af5c`).
   - Dedicated navigation rail, breadcrumb header, glassmorphism toast notifications, and full keyboard escape dismissal.
