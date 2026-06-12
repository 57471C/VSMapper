
import './app.css'; // ── Tell Vite's compiler to capture and bundle Tailwind here!

/* ── VALUE STREAM MAPPING DATA OBJECT ENGINE ── */
const APP_STATE = {
    zoom: 100,
    bottomOpen: true,
    activeTab: 'process',
    docTitle: "Current State Map — Widget Factory",

    // Real Mock data sets corresponding exactly to your Figma design arrays
    processRows: [
        { process: "Stamping", ct: 45, co: 30, uptime: 87, ops: 1, batch: 500, shifts: 2, available: 27600 },
        { process: "Welding", ct: 62, co: 10, uptime: 92, ops: 2, batch: 50, shifts: 2, available: 27600 },
        { process: "Assembly", ct: 38, co: 5, uptime: 99, ops: 3, batch: 50, shifts: 1, available: 27600 },
        { process: "Painting", ct: 120, co: 45, uptime: 78, ops: 2, batch: 200, shifts: 2, available: 27600 },
        { process: "Shipping", ct: 25, co: 0, uptime: 100, ops: 1, batch: 999, shifts: 1, available: 27600 },
    ],
    inventoryRows: [
        { location: "RM Store → Stamping", qty: 1200, unit: "pcs", days: 2.4, turns: 21, cost: 14400 },
        { location: "Stamping → Welding", qty: 850, unit: "pcs", days: 1.7, turns: 29, cost: 10200 },
        { location: "Welding → Assembly", qty: 2100, unit: "pcs", days: 4.2, turns: 12, cost: 25200 },
        { location: "Assembly → Painting", qty: 320, unit: "pcs", days: 0.6, turns: 83, cost: 38400 },
        { location: "Painting → FG Store", qty: 480, unit: "pcs", days: 0.9, turns: 56, cost: 5760 },
    ],
    timelineRows: [
        { process: "Stamping", vaTime: 45, nvaTime: 2.4 },
        { process: "Welding", vaTime: 62, nvaTime: 1.7 },
        { process: "Assembly", vaTime: 38, nvaTime: 4.2 },
        { process: "Painting", vaTime: 120, nvaTime: 0.6 },
        { process: "Shipping", vaTime: 25, nvaTime: 0.9 },
    ]
};

/* ── DOM SELECTOR REFERENCE HOOKS ── */
const elBottomPanel = document.getElementById('bottom-panel');
const elPanelToggle = document.getElementById('panel-handle');
const elToggleIcon = document.getElementById('panel-toggle-icon');
const elTabButtonGroup = document.getElementById('tab-button-group');
const elTableView = document.getElementById('data-table-view');
const elZoomSelect = document.getElementById('zoom-select');
const elTimelineLadder = document.getElementById('timeline-ladder-bar');

/* ── JOINTJS CANVAS CONFIGURATION MAP PRIMITIVES ── */

// 1. Process Box Shape Definition
const VsmProcessBox = joint.dia.Element.define("vsm.Process", {
    size: { width: 140, height: 60 },
    attrs: {
        body: { refWidth: "100%", refHeight: "100%", fill: "#ffffff", stroke: "#374151", strokeWidth: 2, rx: 3 },
        label: { textVerticalAnchor: "middle", textAnchor: "middle", refX: "50%", refY: "30%", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, fill: "#1C1E26" },
        dataBox: { refWidth: "100%", refHeight: "45%", refY: "55%", fill: "#F9FAFB", stroke: "#E5E7EB", strokeWidth: 1 },
        dataLabel: { textVerticalAnchor: "top", textAnchor: "start", refX: 6, refY: "57%", fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "#6B7280", lineHeight: 14 }
    }
}, {
    markup: [
        { tagName: "rect", selector: "body" },
        { tagName: "rect", selector: "dataBox" },
        { tagName: "text", selector: "label" },
        { tagName: "text", selector: "dataLabel" }
    ]
});

// 2. Supplier / Customer Factory Node Definition
const VsmExternalEntity = joint.dia.Element.define("vsm.External", {
    size: { width: 88, height: 56 },
    attrs: {
        body: { refWidth: "100%", refHeight: "100%", fill: "#1C1E26", stroke: "#374151", strokeWidth: 2, rx: 3 },
        label: { textVerticalAnchor: "middle", textAnchor: "middle", refX: "50%", refY: "50%", fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600, fill: "#E8E9ED" }
    }
}, {
    markup: [{ tagName: "rect", selector: "body" }, { tagName: "text", selector: "label" }]
});

// 3. Inventory Warning Triangle Definition
const VsmInventoryTriangle = joint.dia.Element.define("vsm.Inventory", {
    size: { width: 56, height: 48 },
    attrs: {
        body: { refPoints: "28,2 55,46 1,46", fill: "#FEF3C7", stroke: "#D97706", strokeWidth: 1.8 },
        label: { textVerticalAnchor: "middle", textAnchor: "middle", refX: "50%", refY: "68%", fontSize: 9, fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fill: "#92400E" },
        qty: { textVerticalAnchor: "top", textAnchor: "middle", refX: "50%", refY: "105%", fontSize: 10, fontFamily: "JetBrains Mono, monospace", fontWeight: 600, fill: "#374151" },
        days: { textVerticalAnchor: "top", textAnchor: "middle", refX: "50%", refY: "120%", fontSize: 9, fontFamily: "JetBrains Mono, monospace", fill: "#D97706" }
    }
}, {
    markup: [{ tagName: "polygon", selector: "body" }, { tagName: "text", selector: "label" }, { tagName: "text", selector: "qty" }, { tagName: "text", selector: "days" }]
});

// 4. Kaizen Spikey Burst Node Definition
const VsmKaizenBurst = joint.dia.Element.define("vsm.Kaizen", {
    size: { width: 64, height: 64 },
    attrs: {
        body: { fill: "#FEF9C3", stroke: "#FBBF24", strokeWidth: 1.5 },
        label: { textVerticalAnchor: "middle", textAnchor: "middle", refX: "50%", refY: "42%", fontSize: 8, fontFamily: "Inter, sans-serif", fontWeight: 700, fill: "#92400E" },
        sublabel: { textVerticalAnchor: "middle", textAnchor: "middle", refX: "50%", refY: "60%", fontSize: 7, fontFamily: "Inter, sans-serif", fill: "#92400E" }
    }
}, {
    markup: [{ tagName: "polygon", selector: "body" }, { tagName: "text", selector: "label" }, { tagName: "text", selector: "sublabel" }]
});

// Helper geometry script to compile SVG points array maps dynamically
function getStarPointsString(cx, cy, outerR, innerR, points) {
    let pts = [];
    for (let i = 0; i < points * 2; i++) {
        let angle = (i * Math.PI) / points - Math.PI / 2;
        let r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
    }
    return pts.join(" ");
}

// 5. Traditional Material Push Link Routing Arrow
const VsmPushLink = joint.dia.Link.define("vsm.PushLink", {
    attrs: {
        line: { connection: true, stroke: "#6B7280", strokeWidth: 2, targetMarker: { type: "path", d: "M 8 -4 0 0 8 4 Z", fill: "#6B7280", stroke: "none" } },
        wrapper: { connection: true, strokeWidth: 12, strokeLinecap: "round" }
    }
}, {
    markup: [{ tagName: "path", selector: "wrapper", attributes: { fill: "none" } }, { tagName: "path", selector: "line", attributes: { fill: "none" } }]
});

/* ── RUNTIME CANVAS RENDERING INIT PIPELINE ── */
let graph, paper;

function initializeCanvas() {
    graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    paper = new joint.dia.Paper({
        el: document.getElementById("vsm-paper-container"),
        model: graph,
        width: "100%",
        height: "100%",
        gridSize: 10,
        drawGrid: { name: "dot", args: { color: "#C8CACC", thickness: 1 } },
        background: { color: "#F4F5F7" },
        interactive: { labelMove: false },
        snapLinks: true,
        linkPinning: false,
        defaultLink: () => new VsmPushLink()
    });

    // Inject structural nodes matching array positions
    const supplier = new VsmExternalEntity({ position: { x: 30, y: 55 }, attrs: { label: { text: "Supplier" } } });
    const customer = new VsmExternalEntity({ position: { x: 1090, y: 55 }, attrs: { label: { text: "Customer" } } });
    graph.addCells([supplier, customer]);

    // Loop map processing blocks data arrays straight out of application memory
    APP_STATE.processRows.slice(0, 4).forEach((p, index) => {
        const box = new VsmProcessBox({
            id: p.process.toLowerCase(),
            position: { x: 180 + (index * 240), y: 110 },
            attrs: {
                label: { text: p.process },
                dataLabel: { text: `C/T  ${p.ct}s\nC/O  ${p.co}m\nUp   ${p.uptime}%\nOps  ${p.ops}` }
            }
        });
        graph.addCell(box);
    });

    // Add the inventory warnings layout blocks
    APP_STATE.inventoryRows.slice(0, 4).forEach((inv, index) => {
        const tri = new VsmInventoryTriangle({
            position: { x: 336 + (index * 240), y: 143 },
            attrs: {
                label: { text: "I" },
                qty: { text: `${inv.qty.toLocaleString()} pcs` },
                days: { text: `${inv.days} days` }
            }
        });
        graph.addCell(tri);
    });

    // Stamp a Kaizen burst object over painting
    const burstPts = getStarPointsString(32, 32, 30, 20, 12);
    const kaizen = new VsmKaizenBurst({
        position: { x: 1005, y: 88 },
        attrs: {
            body: { refPoints: burstPts },
            label: { text: "KAIZEN" },
            sublabel: { text: "Reduce C/O" }
        }
    });
    graph.addCell(kaizen);

    // Link canvas mouse feedback filters dynamically
    paper.on("cell:mouseenter", (cellView) => {
        cellView.el.style.filter = "drop-shadow(0 0 6px rgba(245,158,11,0.5))";
    });
    paper.on("cell:mouseleave", (cellView) => {
        cellView.el.style.filter = "";
    });
}

/* ── UI REACTIVITY & CORE RENDERING ENGINE ── */

function renderTable() {
    let html = '';

    if (APP_STATE.activeTab === 'process') {
        html = `
      <thead>
        <tr class="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#9CA3AF] font-600 text-[11px] text-left">
          <th class="p-2 sticky left-0 bg-[#F9FAFB] border-r-2 border-[#E5E7EB]">Process</th>
          <th class="p-2 text-right">Cycle Time (s)</th>
          <th class="p-2 text-right">Changeover (min)</th>
          <th class="p-2 text-right">Uptime %</th>
          <th class="p-2 text-right">Operators</th>
          <th class="p-2 text-right">Batch Size</th>
          <th class="p-2 text-right">Shifts/Day</th>
          <th class="p-2 text-right">Available Time (s)</th>
        </tr>
      </thead>
      <tbody>
        ${APP_STATE.processRows.map(r => `
          <tr class="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
            <td class="p-2 font-600 bg-[#FAFAFA] text-[#1C1E26] border-r-2 border-[#E5E7EB] sticky left-0">${r.process}</td>
            <td class="p-2 text-right mono font-600 text-[#1C1E26]">${r.ct}</td>
            <td class="p-2 text-right mono ${r.co > 20 ? 'text-[#D97706] bg-[#FFFBEB]' : ''}">${r.co}</td>
            <td class="p-2 text-right mono">${r.uptime}%</td>
            <td class="p-2 text-right mono">${r.ops}</td>
            <td class="p-2 text-right mono">${r.batch}</td>
            <td class="p-2 text-right mono">${r.shifts}</td>
            <td class="p-2 text-right mono">${r.available.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>`;
    } else if (APP_STATE.activeTab === 'inventory') {
        html = `
      <thead>
        <tr class="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#9CA3AF] font-600 text-[11px] text-left">
          <th class="p-2 border-r-2 border-[#E5E7EB]">Location</th>
          <th class="p-2 text-right">Qty (pcs)</th>
          <th class="p-2 text-right">Days On Hand</th>
          <th class="p-2 text-right">Turns/Year</th>
          <th class="p-2 text-right">Est. Cost</th>
        </tr>
      </thead>
      <tbody>
        ${APP_STATE.inventoryRows.map(r => `
          <tr class="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
            <td class="p-2 font-600 bg-[#FAFAFA] border-r-2 border-[#E5E7EB]">${r.location}</td>
            <td class="p-2 text-right mono">${r.qty.toLocaleString()}</td>
            <td class="p-2 text-right mono ${r.days > 2 ? 'text-[#D97706] bg-[#FFFBEB]' : ''}">${r.days}</td>
            <td class="p-2 text-right mono">${r.turns}</td>
            <td class="p-2 text-right mono">$${r.cost.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>`;
    } else {
        html = `<tbody><tr><td class="p-4 text-[#6B7280] italic">Timeline calculations loaded in structural memory arrays. Ready for study connection loop phase.</td></tr></tbody>`;
    }

    elTableView.innerHTML = html;
}

function renderTimelineLadder() {
    elTimelineLadder.innerHTML = APP_STATE.timelineRows.slice(0, 4).map(s => `
    <div class="flex-1 flex flex-col items-center relative">
      <div class="text-[9px] mono text-[#9CA3AF] mb-0.5">${s.nvaTime}d</div>
      <div class="bg-[#DCFCE7] border border-[#86EFAC] rounded px-2 py-0.5 text-[9px] mono text-[#16A34A] font-600">${s.vaTime}s</div>
    </div>
  `).join('');
}

/* ── EVENT INTERACTION LISTENERS PIPELINE ── */

// Bottom Drawer Toggle Mechanics
elPanelToggle.addEventListener('click', () => {
    APP_STATE.bottomOpen = !APP_STATE.bottomOpen;
    elBottomPanel.style.height = APP_STATE.bottomOpen ? '240px' : '36px';
    elToggleIcon.style.transform = APP_STATE.bottomOpen ? 'rotate(0deg)' : 'rotate(180deg)';
});

// Tab Navigation Selection Loop
elTabButtonGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.stopPropagation(); // Stop drawer closure action trigger

    document.querySelectorAll('[data-tab]').forEach(el => {
        el.classList.remove('font-600', 'text-[#1C1E26]', 'border-[#F59E0B]');
        el.classList.add('text-[#6B7280]', 'border-transparent');
    });

    btn.classList.remove('text-[#6B7280]', 'border-transparent');
    btn.classList.add('font-600', 'text-[#1C1E26]', 'border-[#F59E0B]');

    APP_STATE.activeTab = btn.dataset.tab;
    renderTable();
});

// Dynamic Native Scaling (Zoom Controller)
elZoomSelect.addEventListener('change', (e) => {
    APP_STATE.zoom = Number(e.target.value);
    if (paper) paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
});

document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (APP_STATE.zoom < 150) {
        APP_STATE.zoom += 25;
        elZoomSelect.value = APP_STATE.zoom;
        paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
    }
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (APP_STATE.zoom > 50) {
        APP_STATE.zoom -= 25;
        elZoomSelect.value = APP_STATE.zoom;
        paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
    }
});

// Document Title Rename Handling Trigger
document.getElementById('title-container').addEventListener('click', () => {
    const container = document.getElementById('title-container');
    const currentText = document.getElementById('title-text').innerText;
    container.innerHTML = `<input type="text" id="title-input" class="bg-[rgba(255,255,255,0.08)] text-[#E8E9ED] text-center rounded px-2 outline-none border border-[#F59E0B] min-w-[280px]" value="${currentText}" />`;

    const input = document.getElementById('title-input');
    input.focus();
    input.select();

    const commitTitle = () => {
        APP_STATE.docTitle = input.value.trim() || APP_STATE.docTitle;
        container.innerHTML = `<span id="title-text">${APP_STATE.docTitle}</span>`;
    };

    input.addEventListener('blur', commitTitle);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitTitle(); });
});

/* ── APP LIFECYCLE SPIN-UP EXECUTION ── */
window.addEventListener('DOMContentLoaded', () => {
    initializeCanvas();
    renderTable();
    renderTimelineLadder();
});