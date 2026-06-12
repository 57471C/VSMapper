# VSMapper

**VSMapper** is a lightweight, framework-free Value Stream Mapping (VSM) tool built explicitly as the "Big Brother" companion to the **TimeStudy** application ecosystem. 

Designed for continuous improvement, lean, and industrial engineering practitioners, VSMapper bridges the macro-level visual stream layout with micro-level time study metrics.
It enables teams to map current state processes, compute total value-added metrics, and capture real-world processing times asynchronously.

---

## 🛠️ System Architecture & Workflow

Unlike generic, rigid flowchart applications, VSMapper treats layout structures as fully responsive data objects.

```text
[Macro VSM Canvas] ──> Click Process ──> Trigger TimeStudy (.tsp)
      ▲                                          │
      └────────── [Manual Async Sync] ───────────┘
```

1. **Map:** The Lean Practitioner lays out a rough current-state overview in VSMapper.
2. **Go/Do:** Field tracking, video frame analysis, and cycle trials are conducted natively inside the **TimeStudy** app.
3. **Sync:** VSMapper reads localized, relative `.tsp` (Time Study Project) data matrices on demand, instantly redrawing the process box metrics and recalculating the overarching **Value Stream Timeline Ladder** automatically.

---

## 📂 Project Directory Structure (Option 2 Setup)

To avoid broken absolute linkages across shared environments, VSMapper mandates an isolated relative project directory model. As long as this root container folder is shared or relocated together, project links remain completely intact:

```text
[Plant_X_Assembly_Project] /            # The Unified Master Project Container Folder
├── Plant_X_Map.vsm                     # VSMapper Master Data Layout File (Obscured JSON)
└── Time_Studies /                      # Automated Sub-directory for Study Files
    ├── 01_Stamping_Line.tsp            # Granular TimeStudy Data Matrix (Obscured JSON)
    ├── 01_Stamping_Line_Video.mp4      # Raw Video Source File (Linked, Not Embedded)
    ├── 02_Welding_Station.tsp
    └── 02_Welding_Station_Video.mp4
```

## 📶 Engineered for 100% Offline Resilience

Industrial environments and manufacturing plant floors are notorious for heavy metal shielding, strict data regulations, and spotty network connections. VSMapper is optimized for complete offline functionality by leveraging JointJS Core 4.x's engine design, eliminating external runtime stylesheet queries entirely.

Local Assets Checklist
To ensure full offline performance, verify that your directory assets match the structure below:
```html
js/lodash.min.js 
js/backbone-min.js 
js/joint.js (JointJS Core 4.x runtime engine) 
js/tailwind.js (Standalone browser-based parsing script) 
fonts/ (Inter and JetBrains Mono binary .woff2 files mapped via @font-face) 
```

## 🚀 Quick Start / Local Prototyping
Ensure all local asset files listed above are properly placed inside your working directories.

Open your terminal or file system window.

Double-click index.html to initialize the layout shell instantly.

Scale layouts dynamically using the top-level native menu bar or click process cells to witness active hover highlights.

📜 Licensing Policy
This project structure operates under the permissive MIT License, granting full structural authority to package, distribute, and commercially monetize final compiled application binaries through Tauri without upstream licensing constraints or runtime validation hooks.