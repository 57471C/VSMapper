import "./app.css"; // ── Tell Vite's compiler to capture and bundle Tailwind here!

/* ── PERSISTENCE & STORAGE CONSTANTS ── */
const STORAGE_KEY = "vsmapper_projects";

/* ── SAMPLE DEFAULT DATA ARRAYS (VSM DEMO LAYOUT) ── */
const SAMPLE_VSM_PROCESS_ROWS = [
	{
		process: "Stamping",
		ct: 45,
		co: 30,
		uptime: 87,
		ops: 1,
		batch: 500,
		shifts: 2,
		available: 27600,
	},
	{
		process: "Welding",
		ct: 62,
		co: 10,
		uptime: 92,
		ops: 2,
		batch: 50,
		shifts: 2,
		available: 27600,
	},
	{
		process: "Assembly",
		ct: 38,
		co: 5,
		uptime: 99,
		ops: 3,
		batch: 50,
		shifts: 1,
		available: 27600,
	},
	{
		process: "Painting",
		ct: 120,
		co: 45,
		uptime: 78,
		ops: 2,
		batch: 200,
		shifts: 2,
		available: 27600,
	},
	{
		process: "Shipping",
		ct: 25,
		co: 0,
		uptime: 100,
		ops: 1,
		batch: 999,
		shifts: 1,
		available: 27600,
	},
];

const SAMPLE_VSM_INVENTORY_ROWS = [
	{
		location: "RM Store → Stamping",
		qty: 1200,
		unit: "pcs",
		days: 2.4,
		turns: 21,
		cost: 14400,
	},
	{
		location: "Stamping → Welding",
		qty: 850,
		unit: "pcs",
		days: 1.7,
		turns: 29,
		cost: 10200,
	},
	{
		location: "Welding → Assembly",
		qty: 2100,
		unit: "pcs",
		days: 4.2,
		turns: 12,
		cost: 25200,
	},
	{
		location: "Assembly → Painting",
		qty: 320,
		unit: "pcs",
		days: 0.6,
		turns: 83,
		cost: 38400,
	},
	{
		location: "Painting → FG Store",
		qty: 480,
		unit: "pcs",
		days: 0.9,
		turns: 56,
		cost: 5760,
	},
];

const SAMPLE_VSM_TIMELINE_ROWS = [
	{ process: "Stamping", vaTime: 45, nvaTime: 2.4 },
	{ process: "Welding", vaTime: 62, nvaTime: 1.7 },
	{ process: "Assembly", vaTime: 38, nvaTime: 4.2 },
	{ process: "Painting", vaTime: 120, nvaTime: 0.6 },
	{ process: "Shipping", vaTime: 25, nvaTime: 0.9 },
];

/* ── RUNTIME APPLICATION STATE ── */
const APP_STATE = {
	currentDoc: null,
	zoom: 100,
	bottomOpen: true,
	activeTab: "process",
	docTitle: "Current State Map — Widget Factory",
	processRows: [],
	inventoryRows: [],
	timelineRows: [],
};

/* ── DOM SELECTOR REFERENCE HOOKS ── */
const elStartScreen = document.getElementById("start-screen");
const elAppWorkspace = document.getElementById("app-workspace");
const elRecentsList = document.getElementById("recents-list");
const elRecentsEmpty = document.getElementById("recents-empty");
const elFileInput = document.getElementById("vsm-file-input");

const elBottomPanel = document.getElementById("bottom-panel");
const elPanelToggle = document.getElementById("panel-handle");
const elToggleIcon = document.getElementById("panel-toggle-icon");
const elTabButtonGroup = document.getElementById("tab-button-group");
const elTableView = document.getElementById("data-table-view");
const elZoomSelect = document.getElementById("zoom-select");
const elTimelineLadder = document.getElementById("timeline-ladder-bar");

const elFileMenuBtn = document.getElementById("file-menu-button");
const elFileDropdown = document.getElementById("file-menu-dropdown");

/* ── UTILITY HELPERS ── */
function generateUUID() {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}
	return `vsm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function escapeHtml(str) {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatRelativeTime(isoString) {
	if (!isoString) return "";
	const date = new Date(isoString);
	if (Number.isNaN(date.getTime())) return "";

	const now = new Date();
	const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffSec < 45) return "Just now";
	if (diffSec < 3600) {
		const mins = Math.max(1, Math.floor(diffSec / 60));
		return `${mins}m ago`;
	}
	if (diffSec < 86400) {
		const hours = Math.floor(diffSec / 3600);
		return `${hours}h ago`;
	}
	if (diffSec < 172800) return "Yesterday";

	const days = Math.floor(diffSec / 86400);
	if (days < 30) return `${days}d ago`;

	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── BROWSER LOCALSTORAGE PERSISTENCE ENGINE ── */
function getStorage() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (
				parsed &&
				Array.isArray(parsed.recents) &&
				typeof parsed.docs === "object" &&
				parsed.docs !== null
			) {
				return parsed;
			}
		}
	} catch (e) {
		console.error("Failed to read projects from localStorage:", e);
	}
	return { recents: [], docs: {} };
}

function saveStorage(store) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (e) {
		console.error("Failed to save projects to localStorage:", e);
	}
}

function recordDocToStorage(doc) {
	if (!doc?.id) return;
	const store = getStorage();
	store.docs[doc.id] = doc;

	// Filter out previous recent reference and unshift updated summary to top
	store.recents = store.recents.filter((r) => r.id !== doc.id);
	store.recents.unshift({
		id: doc.id,
		title: doc.title,
		kind: doc.kind,
		updatedAt: doc.updatedAt,
	});

	// Cap recents at 12
	if (store.recents.length > 12) {
		store.recents = store.recents.slice(0, 12);
	}

	saveStorage(store);
}

function getDocFromStorage(id) {
	const store = getStorage();
	return store.docs[id] || null;
}

/* ── JOINTJS CANVAS CONFIGURATION & SHAPE PRIMITIVES ── */

// 1. Process Box Shape Definition
const VsmProcessBox = joint.dia.Element.define(
	"vsm.Process",
	{
		size: { width: 140, height: 60 },
		attrs: {
			body: {
				refWidth: "100%",
				refHeight: "100%",
				fill: "#ffffff",
				stroke: "#374151",
				strokeWidth: 2,
				rx: 3,
			},
			label: {
				textVerticalAnchor: "middle",
				textAnchor: "middle",
				refX: "50%",
				refY: "30%",
				fontSize: 12,
				fontFamily: "Inter, sans-serif",
				fontWeight: 600,
				fill: "#1C1E26",
			},
			dataBox: {
				refWidth: "100%",
				refHeight: "45%",
				refY: "55%",
				fill: "#F9FAFB",
				stroke: "#E5E7EB",
				strokeWidth: 1,
			},
			dataLabel: {
				textVerticalAnchor: "top",
				textAnchor: "start",
				refX: 6,
				refY: "57%",
				fontSize: 9,
				fontFamily: "JetBrains Mono, monospace",
				fill: "#6B7280",
				lineHeight: 14,
			},
		},
	},
	{
		markup: [
			{ tagName: "rect", selector: "body" },
			{ tagName: "rect", selector: "dataBox" },
			{ tagName: "text", selector: "label" },
			{ tagName: "text", selector: "dataLabel" },
		],
	},
);

// 2. Supplier / Customer Factory Node Definition
const VsmExternalEntity = joint.dia.Element.define(
	"vsm.External",
	{
		size: { width: 88, height: 56 },
		attrs: {
			body: {
				refWidth: "100%",
				refHeight: "100%",
				fill: "#1C1E26",
				stroke: "#374151",
				strokeWidth: 2,
				rx: 3,
			},
			label: {
				textVerticalAnchor: "middle",
				textAnchor: "middle",
				refX: "50%",
				refY: "50%",
				fontSize: 12,
				fontFamily: "Inter, sans-serif",
				fontWeight: 600,
				fill: "#E8E9ED",
			},
		},
	},
	{
		markup: [
			{ tagName: "rect", selector: "body" },
			{ tagName: "text", selector: "label" },
		],
	},
);

// 3. Inventory Warning Triangle Definition
const VsmInventoryTriangle = joint.dia.Element.define(
	"vsm.Inventory",
	{
		size: { width: 56, height: 48 },
		attrs: {
			body: {
				refPoints: "28,2 55,46 1,46",
				fill: "#FEF3C7",
				stroke: "#D97706",
				strokeWidth: 1.8,
			},
			label: {
				textVerticalAnchor: "middle",
				textAnchor: "middle",
				refX: "50%",
				refY: "68%",
				fontSize: 9,
				fontFamily: "JetBrains Mono, monospace",
				fontWeight: 700,
				fill: "#92400E",
			},
			qty: {
				textVerticalAnchor: "top",
				textAnchor: "middle",
				refX: "50%",
				refY: "105%",
				fontSize: 10,
				fontFamily: "JetBrains Mono, monospace",
				fontWeight: 600,
				fill: "#374151",
			},
			days: {
				textVerticalAnchor: "top",
				textAnchor: "middle",
				refX: "50%",
				refY: "120%",
				fontSize: 9,
				fontFamily: "JetBrains Mono, monospace",
				fill: "#D97706",
			},
		},
	},
	{
		markup: [
			{ tagName: "polygon", selector: "body" },
			{ tagName: "text", selector: "label" },
			{ tagName: "text", selector: "qty" },
			{ tagName: "text", selector: "days" },
		],
	},
);

// 4. Kaizen Spikey Burst Node Definition
const VsmKaizenBurst = joint.dia.Element.define(
	"vsm.Kaizen",
	{
		size: { width: 64, height: 64 },
		attrs: {
			body: { fill: "#FEF9C3", stroke: "#FBBF24", strokeWidth: 1.5 },
			label: {
				textVerticalAnchor: "middle",
				textAnchor: "middle",
				refX: "50%",
				refY: "42%",
				fontSize: 8,
				fontFamily: "Inter, sans-serif",
				fontWeight: 700,
				fill: "#92400E",
			},
			sublabel: {
				textVerticalAnchor: "middle",
				textAnchor: "middle",
				refX: "50%",
				refY: "60%",
				fontSize: 7,
				fontFamily: "Inter, sans-serif",
				fill: "#92400E",
			},
		},
	},
	{
		markup: [
			{ tagName: "polygon", selector: "body" },
			{ tagName: "text", selector: "label" },
			{ tagName: "text", selector: "sublabel" },
		],
	},
);

// Helper geometry script to compile SVG points array maps dynamically
function getStarPointsString(cx, cy, outerR, innerR, points) {
	const pts = [];
	for (let i = 0; i < points * 2; i++) {
		const angle = (i * Math.PI) / points - Math.PI / 2;
		const r = i % 2 === 0 ? outerR : innerR;
		pts.push(
			`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`,
		);
	}
	return pts.join(" ");
}

// 5. Traditional Material Push Link Routing Arrow
const VsmPushLink = joint.dia.Link.define(
	"vsm.PushLink",
	{
		attrs: {
			line: {
				connection: true,
				stroke: "#6B7280",
				strokeWidth: 2,
				targetMarker: {
					type: "path",
					d: "M 8 -4 0 0 8 4 Z",
					fill: "#6B7280",
					stroke: "none",
				},
			},
			wrapper: { connection: true, strokeWidth: 12, strokeLinecap: "round" },
		},
	},
	{
		markup: [
			{ tagName: "path", selector: "wrapper", attributes: { fill: "none" } },
			{ tagName: "path", selector: "line", attributes: { fill: "none" } },
		],
	},
);

// Register shapes namespace under joint.shapes for serialization/deserialization
if (typeof joint !== "undefined" && joint.shapes) {
	joint.shapes.vsm = {
		Process: VsmProcessBox,
		External: VsmExternalEntity,
		Inventory: VsmInventoryTriangle,
		Kaizen: VsmKaizenBurst,
		PushLink: VsmPushLink,
	};
}

/* ── RUNTIME CANVAS RENDERING & INITIALIZATION PIPELINE ── */
let graph = null;
let paper = null;

function renderSampleVsmGraph() {
	if (!graph) return;

	// Inject structural nodes matching array positions
	const supplier = new VsmExternalEntity({
		position: { x: 30, y: 55 },
		attrs: { label: { text: "Supplier" } },
	});
	const customer = new VsmExternalEntity({
		position: { x: 1090, y: 55 },
		attrs: { label: { text: "Customer" } },
	});
	graph.addCells([supplier, customer]);

	// Loop map processing blocks data arrays straight out of application memory
	APP_STATE.processRows.slice(0, 4).forEach((p, index) => {
		const box = new VsmProcessBox({
			id: p.process.toLowerCase(),
			position: { x: 180 + index * 240, y: 110 },
			attrs: {
				label: { text: p.process },
				dataLabel: {
					text: `C/T  ${p.ct}s\nC/O  ${p.co}m\nUp   ${p.uptime}%\nOps  ${p.ops}`,
				},
			},
		});
		graph.addCell(box);
	});

	// Add the inventory warnings layout blocks
	APP_STATE.inventoryRows.slice(0, 4).forEach((inv, index) => {
		const tri = new VsmInventoryTriangle({
			position: { x: 336 + index * 240, y: 143 },
			attrs: {
				label: { text: "I" },
				qty: { text: `${inv.qty.toLocaleString()} pcs` },
				days: { text: `${inv.days} days` },
			},
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
			sublabel: { text: "Reduce C/O" },
		},
	});
	graph.addCell(kaizen);
}

function initializeCanvas(doc) {
	const paperContainer = document.getElementById("vsm-paper-container");
	if (!paperContainer) return;
	paperContainer.innerHTML = "";

	graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

	paper = new joint.dia.Paper({
		el: paperContainer,
		model: graph,
		width: "100%",
		height: "100%",
		gridSize: 10,
		drawGrid: { name: "dot", args: { color: "#C8CACC", thickness: 1 } },
		background: { color: "#F4F5F7" },
		interactive: { labelMove: false },
		snapLinks: true,
		linkPinning: false,
		cellViewNamespace: joint.shapes,
		defaultLink: () => new VsmPushLink(),
	});

	// Link canvas mouse feedback filters dynamically
	paper.on("cell:mouseenter", (cellView) => {
		cellView.el.style.filter = "drop-shadow(0 0 6px rgba(245,158,11,0.5))";
	});
	paper.on("cell:mouseleave", (cellView) => {
		cellView.el.style.filter = "";
	});

	// Hydrate canvas:
	// If graph JSON exists, load it into graph.
	// If graph is null:
	// - kind === "vsm" -> render sample layout
	// - kind === "process" -> empty paper
	if (
		doc.graph &&
		typeof doc.graph === "object" &&
		Array.isArray(doc.graph.cells) &&
		doc.graph.cells.length > 0
	) {
		try {
			graph.fromJSON(doc.graph);
		} catch (err) {
			// Note: JointJS graph deserialization can encounter namespace conflicts with custom shapes.
			// If fromJSON fails, we gracefully fall back to the default sample for VSM or empty paper for process.
			console.warn("JointJS graph.fromJSON warning (falling back):", err);
			if (doc.kind === "vsm") {
				renderSampleVsmGraph();
			}
		}
	} else if (doc.kind === "vsm") {
		renderSampleVsmGraph();
	}
	// kind === "process" with graph === null remains an empty canvas
}

/* ── DOCUMENT & WORKSPACE LIFECYCLE ── */

function createDocument(kind = "vsm") {
	const isVsm = kind === "vsm";
	return {
		version: 1,
		kind: isVsm ? "vsm" : "process",
		id: generateUUID(),
		title: isVsm
			? "Current State Map — Widget Factory"
			: "Untitled Process Map",
		updatedAt: new Date().toISOString(),
		processRows: isVsm
			? JSON.parse(JSON.stringify(SAMPLE_VSM_PROCESS_ROWS))
			: [],
		inventoryRows: isVsm
			? JSON.parse(JSON.stringify(SAMPLE_VSM_INVENTORY_ROWS))
			: [],
		timelineRows: isVsm
			? JSON.parse(JSON.stringify(SAMPLE_VSM_TIMELINE_ROWS))
			: [],
		graph: null,
	};
}

function syncCurrentDocState() {
	if (!APP_STATE.currentDoc) return;
	APP_STATE.currentDoc.title = APP_STATE.docTitle;
	APP_STATE.currentDoc.updatedAt = new Date().toISOString();
	APP_STATE.currentDoc.processRows = APP_STATE.processRows;
	APP_STATE.currentDoc.inventoryRows = APP_STATE.inventoryRows;
	APP_STATE.currentDoc.timelineRows = APP_STATE.timelineRows;

	// JointJS graph serialization:
	// Note: JointJS graph.toJSON() serialization is attempted. If it encounters issues with
	// custom types or circular structures, we keep graph as null and persist rows/title.
	if (graph) {
		try {
			APP_STATE.currentDoc.graph = graph.toJSON();
		} catch (err) {
			console.warn("JointJS graph.toJSON() serialization warning:", err);
			APP_STATE.currentDoc.graph = null;
		}
	}

	recordDocToStorage(APP_STATE.currentDoc);
}

function saveDocumentAndDownload() {
	syncCurrentDocState();
	if (!APP_STATE.currentDoc) return;

	const docData = JSON.stringify(APP_STATE.currentDoc, null, 2);
	const blob = new Blob([docData], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	const safeTitle = (APP_STATE.currentDoc.title || "untitled-map")
		.replace(/[/\\?%*:|"<>]/g, "-")
		.trim();
	a.href = url;
	a.download = `${safeTitle || "map"}.vsm`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function openDocument(doc) {
	if (!doc) return;

	// Normalize document attributes
	if (!doc.id) doc.id = generateUUID();
	if (!doc.version) doc.version = 1;
	if (!doc.kind) doc.kind = "vsm";
	if (!doc.title)
		doc.title =
			doc.kind === "process"
				? "Untitled Process Map"
				: "Current State Map — Widget Factory";
	if (!Array.isArray(doc.processRows)) doc.processRows = [];
	if (!Array.isArray(doc.inventoryRows)) doc.inventoryRows = [];
	if (!Array.isArray(doc.timelineRows)) doc.timelineRows = [];
	if (doc.graph === undefined) doc.graph = null;
	doc.updatedAt = new Date().toISOString();

	APP_STATE.currentDoc = doc;
	APP_STATE.docTitle = doc.title;
	APP_STATE.processRows = doc.processRows;
	APP_STATE.inventoryRows = doc.inventoryRows;
	APP_STATE.timelineRows = doc.timelineRows;
	APP_STATE.zoom = 100;
	if (elZoomSelect) elZoomSelect.value = "100";

	const elTitleText = document.getElementById("title-text");
	if (elTitleText) elTitleText.innerText = doc.title;

	// Transition view from Start Screen to App Workspace
	elStartScreen.classList.add("hidden");
	elAppWorkspace.classList.remove("hidden");

	// Initialize Canvas and Render Tables
	initializeCanvas(doc);
	renderTable();
	renderTimelineLadder();
	updateMetrics();

	// Persist to storage & update recent list
	recordDocToStorage(doc);
}

function closeProjectToHome() {
	syncCurrentDocState();
	APP_STATE.currentDoc = null;

	// Clear canvas container
	const paperContainer = document.getElementById("vsm-paper-container");
	if (paperContainer) paperContainer.innerHTML = "";
	graph = null;
	paper = null;

	// Close any open menus
	if (elFileDropdown) elFileDropdown.classList.add("hidden");

	// Transition back to Start Screen
	elAppWorkspace.classList.add("hidden");
	elStartScreen.classList.remove("hidden");

	// Refresh recents list on start screen
	renderRecentsList();
}

function handleFileInput(e) {
	const file = e.target.files?.[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = (event) => {
		try {
			const text = event.target.result;
			const parsed = JSON.parse(text);

			const doc = {
				version: parsed.version || 1,
				kind: parsed.kind === "process" ? "process" : "vsm",
				id: parsed.id || generateUUID(),
				title:
					parsed.title || file.name.replace(/\.vsm$/i, "") || "Imported Map",
				updatedAt: new Date().toISOString(),
				processRows: Array.isArray(parsed.processRows)
					? parsed.processRows
					: parsed.kind === "process"
						? []
						: JSON.parse(JSON.stringify(SAMPLE_VSM_PROCESS_ROWS)),
				inventoryRows: Array.isArray(parsed.inventoryRows)
					? parsed.inventoryRows
					: parsed.kind === "process"
						? []
						: JSON.parse(JSON.stringify(SAMPLE_VSM_INVENTORY_ROWS)),
				timelineRows: Array.isArray(parsed.timelineRows)
					? parsed.timelineRows
					: parsed.kind === "process"
						? []
						: JSON.parse(JSON.stringify(SAMPLE_VSM_TIMELINE_ROWS)),
				graph:
					parsed.graph && typeof parsed.graph === "object"
						? parsed.graph
						: null,
			};

			openDocument(doc);
		} catch (err) {
			console.error("Failed to parse .vsm file:", err);
			alert(
				"Failed to parse .vsm file. Please ensure it is a valid VSMapper JSON document.",
			);
		}
		e.target.value = "";
	};
	reader.readAsText(file);
}

/* ── UI REACTIVITY & METRICS ENGINE ── */

function updateMetrics() {
	const elLeadTime = document.getElementById("summary-lead-time");
	const elVaTime = document.getElementById("summary-va-time");
	const elCounters = document.getElementById("badge-counters");
	const elEfficiency = document.getElementById("badge-va-efficiency");
	const elHeaderMetrics = document.getElementById("header-efficiency-metrics");

	const pCount = APP_STATE.processRows.length;
	const iCount = APP_STATE.inventoryRows.length;

	let totalVaTime = 0;
	if (APP_STATE.timelineRows.length > 0) {
		totalVaTime = APP_STATE.timelineRows.reduce(
			(sum, r) => sum + (Number(r.vaTime) || 0),
			0,
		);
	} else if (APP_STATE.processRows.length > 0) {
		totalVaTime = APP_STATE.processRows.reduce(
			(sum, r) => sum + (Number(r.ct) || 0),
			0,
		);
	}

	let totalDays = 0;
	if (APP_STATE.inventoryRows.length > 0) {
		totalDays = APP_STATE.inventoryRows.reduce(
			(sum, r) => sum + (Number(r.days) || 0),
			0,
		);
	} else if (APP_STATE.timelineRows.length > 0) {
		totalDays = APP_STATE.timelineRows.reduce(
			(sum, r) => sum + (Number(r.nvaTime) || 0),
			0,
		);
	}

	const totalSeconds = totalDays * 86400 + totalVaTime;
	let effPercent = 0;
	if (totalSeconds > 0 && totalVaTime > 0) {
		effPercent = (totalVaTime / totalSeconds) * 100;
	}

	const leadTimeStr = `${totalDays.toFixed(1)} days`;
	const vaTimeStr = `${totalVaTime}s`;
	const effPercentStr = `${effPercent.toFixed(3)}%`;

	if (elLeadTime) elLeadTime.innerText = leadTimeStr;
	if (elVaTime) elVaTime.innerText = vaTimeStr;
	if (elCounters)
		elCounters.innerText = `${pCount} process${pCount === 1 ? "" : "es"} · ${iCount} inventor${iCount === 1 ? "y" : "ies"}`;
	if (elEfficiency) elEfficiency.innerText = `VA Efficiency: ${effPercentStr}`;
	if (elHeaderMetrics) {
		elHeaderMetrics.innerText = `Lead Time: ${leadTimeStr} · VA: ${vaTimeStr} · ${effPercent.toFixed(2)}% efficiency`;
	}
}

function renderRecentsList() {
	const store = getStorage();
	if (!elRecentsList || !elRecentsEmpty) return;

	if (!store.recents || store.recents.length === 0) {
		elRecentsList.innerHTML = "";
		elRecentsEmpty.classList.remove("hidden");
		return;
	}

	elRecentsEmpty.classList.add("hidden");
	elRecentsList.innerHTML = store.recents
		.map((item) => {
			const isProcess = item.kind === "process";
			const badgeClass = isProcess
				? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
				: "bg-amber-500/10 text-amber-400 border border-amber-500/20";
			const badgeLabel = isProcess ? "Process Map" : "VSM";
			const relTime = formatRelativeTime(item.updatedAt);

			return `
            <div data-doc-id="${item.id}"
                class="recent-card group flex items-center justify-between p-3.5 rounded-lg bg-[#181B22] border border-[rgba(255,255,255,0.06)] hover:border-[#F59E0B]/50 hover:bg-[#1E222B] transition-all cursor-pointer">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded flex items-center justify-center shrink-0 ${isProcess ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400"} group-hover:scale-105 transition-transform">
                        ${
													isProcess
														? `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>`
														: `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 20h20"></path>
                            <path d="M5 20V8l5 4V8l5 4V4h4v16"></path>
                        </svg>`
												}
                    </div>
                    <div class="min-w-0">
                        <div class="text-[13px] font-500 text-[#E8E9ED] truncate group-hover:text-white">${escapeHtml(item.title || "Untitled Map")}</div>
                        <div class="text-[11px] text-[#9CA3AF]">${relTime}</div>
                    </div>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded font-500 tracking-wide uppercase ${badgeClass} shrink-0 ml-3">${badgeLabel}</span>
            </div>
        `;
		})
		.join("");

	elRecentsList.querySelectorAll("[data-doc-id]").forEach((el) => {
		el.addEventListener("click", () => {
			const id = el.getAttribute("data-doc-id");
			const doc = getDocFromStorage(id);
			if (doc) {
				openDocument(doc);
			} else {
				console.warn(`Document ${id} not found in store.`);
			}
		});
	});
}

function renderTable() {
	let html = "";

	if (APP_STATE.activeTab === "process") {
		if (APP_STATE.processRows.length === 0) {
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
                <tr><td colspan="8" class="p-4 text-[#6B7280] italic text-center">No process steps added. Add elements to the canvas or import data.</td></tr>
              </tbody>`;
		} else {
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
                ${APP_STATE.processRows
									.map(
										(r) => `
                  <tr class="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                    <td class="p-2 font-600 bg-[#FAFAFA] text-[#1C1E26] border-r-2 border-[#E5E7EB] sticky left-0">${escapeHtml(r.process)}</td>
                    <td class="p-2 text-right mono font-600 text-[#1C1E26]">${r.ct}</td>
                    <td class="p-2 text-right mono ${r.co > 20 ? "text-[#D97706] bg-[#FFFBEB]" : ""}">${r.co}</td>
                    <td class="p-2 text-right mono">${r.uptime}%</td>
                    <td class="p-2 text-right mono">${r.ops}</td>
                    <td class="p-2 text-right mono">${r.batch}</td>
                    <td class="p-2 text-right mono">${r.shifts}</td>
                    <td class="p-2 text-right mono">${Number(r.available || 0).toLocaleString()}</td>
                  </tr>
                `,
									)
									.join("")}
              </tbody>`;
		}
	} else if (APP_STATE.activeTab === "inventory") {
		if (APP_STATE.inventoryRows.length === 0) {
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
                <tr><td colspan="5" class="p-4 text-[#6B7280] italic text-center">No inventory buffers recorded.</td></tr>
              </tbody>`;
		} else {
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
                ${APP_STATE.inventoryRows
									.map(
										(r) => `
                  <tr class="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td class="p-2 font-600 bg-[#FAFAFA] border-r-2 border-[#E5E7EB]">${escapeHtml(r.location)}</td>
                    <td class="p-2 text-right mono">${Number(r.qty || 0).toLocaleString()}</td>
                    <td class="p-2 text-right mono ${r.days > 2 ? "text-[#D97706] bg-[#FFFBEB]" : ""}">${r.days}</td>
                    <td class="p-2 text-right mono">${r.turns}</td>
                    <td class="p-2 text-right mono">$${Number(r.cost || 0).toLocaleString()}</td>
                  </tr>
                `,
									)
									.join("")}
              </tbody>`;
		}
	} else {
		html = `<tbody><tr><td class="p-4 text-[#6B7280] italic">Timeline calculations loaded in structural memory arrays. Ready for study connection loop phase.</td></tr></tbody>`;
	}

	if (elTableView) elTableView.innerHTML = html;
}

function renderTimelineLadder() {
	if (!elTimelineLadder) return;
	if (APP_STATE.timelineRows.length === 0) {
		elTimelineLadder.innerHTML = "";
		return;
	}
	elTimelineLadder.innerHTML = APP_STATE.timelineRows
		.slice(0, 4)
		.map(
			(s) => `
    <div class="flex-1 flex flex-col items-center relative">
      <div class="text-[9px] mono text-[#9CA3AF] mb-0.5">${s.nvaTime}d</div>
      <div class="bg-[#DCFCE7] border border-[#86EFAC] rounded px-2 py-0.5 text-[9px] mono text-[#16A34A] font-600">${s.vaTime}s</div>
    </div>
  `,
		)
		.join("");
}

/* ── EVENT INTERACTION LISTENERS PIPELINE ── */

// Start Screen Actions
document.getElementById("btn-new-vsm")?.addEventListener("click", () => {
	openDocument(createDocument("vsm"));
});

document.getElementById("btn-new-process")?.addEventListener("click", () => {
	openDocument(createDocument("process"));
});

document.getElementById("btn-open-file")?.addEventListener("click", () => {
	elFileInput?.click();
});

// Brand Logo -> Return Home
document.getElementById("brand-home-btn")?.addEventListener("click", () => {
	closeProjectToHome();
});

// File Menu Actions
if (elFileMenuBtn && elFileDropdown) {
	elFileMenuBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		elFileDropdown.classList.toggle("hidden");
	});

	document.addEventListener("click", (e) => {
		if (!elFileDropdown.contains(e.target) && e.target !== elFileMenuBtn) {
			elFileDropdown.classList.add("hidden");
		}
	});
}

document.getElementById("menu-home")?.addEventListener("click", () => {
	if (elFileDropdown) elFileDropdown.classList.add("hidden");
	closeProjectToHome();
});

document.getElementById("menu-new-vsm")?.addEventListener("click", () => {
	if (elFileDropdown) elFileDropdown.classList.add("hidden");
	openDocument(createDocument("vsm"));
});

document.getElementById("menu-new-process")?.addEventListener("click", () => {
	if (elFileDropdown) elFileDropdown.classList.add("hidden");
	openDocument(createDocument("process"));
});

document.getElementById("menu-open")?.addEventListener("click", () => {
	if (elFileDropdown) elFileDropdown.classList.add("hidden");
	elFileInput?.click();
});

document.getElementById("menu-save")?.addEventListener("click", () => {
	if (elFileDropdown) elFileDropdown.classList.add("hidden");
	saveDocumentAndDownload();
});

// Hidden File Input Trigger Handler
elFileInput?.addEventListener("change", handleFileInput);

// Bottom Drawer Toggle Mechanics
elPanelToggle?.addEventListener("click", () => {
	APP_STATE.bottomOpen = !APP_STATE.bottomOpen;
	elBottomPanel.style.height = APP_STATE.bottomOpen ? "240px" : "36px";
	elToggleIcon.style.transform = APP_STATE.bottomOpen
		? "rotate(0deg)"
		: "rotate(180deg)";
});

// Tab Navigation Selection Loop
elTabButtonGroup?.addEventListener("click", (e) => {
	const btn = e.target.closest("button");
	if (!btn) return;
	e.stopPropagation(); // Stop drawer closure action trigger

	document.querySelectorAll("[data-tab]").forEach((el) => {
		el.classList.remove("font-600", "text-[#1C1E26]", "border-[#F59E0B]");
		el.classList.add("text-[#6B7280]", "border-transparent");
	});

	btn.classList.remove("text-[#6B7280]", "border-transparent");
	btn.classList.add("font-600", "text-[#1C1E26]", "border-[#F59E0B]");

	APP_STATE.activeTab = btn.dataset.tab;
	renderTable();
});

// Dynamic Native Scaling (Zoom Controller)
elZoomSelect?.addEventListener("change", (e) => {
	APP_STATE.zoom = Number(e.target.value);
	if (paper) paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
});

document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
	if (APP_STATE.zoom < 150) {
		APP_STATE.zoom += 25;
		if (elZoomSelect) elZoomSelect.value = APP_STATE.zoom;
		if (paper) paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
	}
});

document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
	if (APP_STATE.zoom > 50) {
		APP_STATE.zoom -= 25;
		if (elZoomSelect) elZoomSelect.value = APP_STATE.zoom;
		if (paper) paper.scale(APP_STATE.zoom / 100, APP_STATE.zoom / 100);
	}
});

// Document Title Rename Handling Trigger
document.getElementById("title-container")?.addEventListener("click", () => {
	const container = document.getElementById("title-container");
	if (!container) return;
	const elTitleText = document.getElementById("title-text");
	const currentText = elTitleText ? elTitleText.innerText : APP_STATE.docTitle;
	container.innerHTML = `<input type="text" id="title-input" class="bg-[rgba(255,255,255,0.08)] text-[#E8E9ED] text-center rounded px-2 outline-none border border-[#F59E0B] min-w-[280px]" value="${escapeHtml(currentText)}" />`;

	const input = document.getElementById("title-input");
	if (!input) return;
	input.focus();
	input.select();

	const commitTitle = () => {
		const newTitle = input.value.trim() || APP_STATE.docTitle;
		APP_STATE.docTitle = newTitle;
		container.innerHTML = `<span id="title-text">${escapeHtml(newTitle)}</span>`;
		if (APP_STATE.currentDoc) {
			APP_STATE.currentDoc.title = newTitle;
			APP_STATE.currentDoc.updatedAt = new Date().toISOString();
			recordDocToStorage(APP_STATE.currentDoc);
		}
	};

	input.addEventListener("blur", commitTitle);
	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			commitTitle();
		} else if (e.key === "Escape") {
			container.innerHTML = `<span id="title-text">${escapeHtml(APP_STATE.docTitle)}</span>`;
		}
	});
});

/* ── APP LIFECYCLE SPIN-UP (COLD START) ── */
window.addEventListener("DOMContentLoaded", () => {
	// Cold start displays Start Screen overlay by default (no fake canvas initialized)
	renderRecentsList();
});
