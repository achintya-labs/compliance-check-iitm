/**
 * Curriculum Manager & On-Demand Loader Module
 *
 * Manages degree curricula definitions, asynchronous catalog discovery, and
 * on-demand loading of individual curriculum data files.
 *
 * Architecture:
 * - curricula/index.json: Authoritative registry of all curricula, defining
 *   the unique identifier ('id'), display shortname ('name'), and file path ('file').
 * - curricula/*.json: Full curriculum definitions containing degree fullName,
 *   totalCredits, mandatory core courses, elective requirements, and optional notes.
 * - This module resolves and attaches registry metadata ('id', 'name') to curriculum
 *   instances at load time, ensuring a strict single source of truth.
 */

// In-memory array of registered curricula metadata loaded from curricula/index.json
const curriculaList = [];

// In-memory dictionary caching fully loaded curriculum objects by their unique ID
const curricula = {};

// In-flight promise tracker to deduplicate concurrent calls to loadCurriculaList()
let curriculaListPromise = null;

/**
 * Loads the curriculum catalog registry from curricula/index.json.
 * 
 * In Node.js environments, loads synchronously from disk if not already loaded.
 * In browser environments, fetches curricula/index.json over HTTP.
 * 
 * @returns {Promise<Array<Object>>} Resolves to the array of curriculum registry entries.
 */
async function loadCurriculaList() {
    // Return immediately if catalog has already been fetched and cached
    if (curriculaList.length > 0) {
        return curriculaList;
    }

    // Reuse existing in-flight request if an async fetch is already in progress
    if (curriculaListPromise) {
        return curriculaListPromise;
    }

    // Node.js environment support for automated unit tests & offline scripting
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        try {
            const fs = require("fs");
            const path = require("path");
            const indexPath = path.join(__dirname, "curricula", "index.json");
            if (fs.existsSync(indexPath)) {
                const list = JSON.parse(fs.readFileSync(indexPath, "utf8"));
                curriculaList.length = 0;
                list.forEach(c => curriculaList.push(c));
                return curriculaList;
            }
        } catch (e) {
            console.error("Error loading curricula index in Node:", e);
        }
    }

    // Browser environment: fetch curricula/index.json over HTTP
    curriculaListPromise = (async () => {
        try {
            const response = await fetch("curricula/index.json");
            if (!response.ok) {
                throw new Error(`Failed to load curricula/index.json: HTTP ${response.status}`);
            }
            const list = await response.json();
            // Mutate curriculaList in place to preserve reference identity across modules
            curriculaList.length = 0;
            list.forEach(c => curriculaList.push(c));
            return curriculaList;
        } catch (err) {
            console.error("Failed to load curricula/index.json:", err);
            throw err;
        } finally {
            curriculaListPromise = null;
        }
    })();

    return curriculaListPromise;
}

/**
 * Loads full curriculum data by ID or relative file path using the "file" path configured in index.json.
 *
 * @param {string} [id="ee_btech"] - Curriculum identifier (e.g. 'ee_btech', 'ee_btech_2024')
 *                                   or direct JSON file path.
 * @returns {Promise<Object>} Resolves to the parsed curriculum object with attached 'id' and 'name'.
 */
async function loadCurriculum(id = "ee_btech") {
    // Default to first registered curriculum or fallback identifier if unspecified
    if (!id) id = curriculaList[0]?.id || "ee_btech";

    // Return cached curriculum object if already loaded into memory
    if (curricula[id]) {
        return curricula[id];
    }

    // Ensure curriculaList metadata from index.json is available
    if (curriculaList.length === 0) {
        await loadCurriculaList();
    }

    // Resolve curriculum entry from curriculaList to obtain the authoritative file path
    const entry = curriculaList.find(c => c.id === id || c.file === id);
    const targetId = entry ? entry.id : id;
    const filePath = entry ? entry.file : (id.endsWith(".json") ? id : `curricula/${id}.json`);

    // Secondary cache check using the canonical targetId
    if (curricula[targetId]) {
        return curricula[targetId];
    }

    // Node.js environment support for tests & offline scripting
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        try {
            const fs = require("fs");
            const path = require("path");
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
            if (fs.existsSync(fullPath)) {
                const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
                // Map authoritative metadata from index.json onto the curriculum instance
                data.id = targetId;
                if (entry?.name && !data.name) {
                    data.name = entry.name;
                }
                curricula[targetId] = data;
                return data;
            }
        } catch (e) {
            console.error(`Error loading curriculum file ${filePath} in Node:`, e);
        }
    }

    // Browser environment: fetch the JSON file over HTTP using path from index.json
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: HTTP ${response.status}`);
        }
        const data = await response.json();
        // Map authoritative metadata from index.json onto the curriculum instance
        data.id = targetId;
        if (entry?.name && !data.name) {
            data.name = entry.name;
        }
        curricula[targetId] = data;
        return data;
    } catch (err) {
        console.error(`Error fetching curriculum JSON from ${filePath}:`, err);
        throw err;
    }
}

/**
 * Synchronously retrieves a loaded curriculum from the in-memory cache.
 *
 * @param {string} [id="ee_btech"] - Curriculum identifier to retrieve.
 * @returns {Object|null} The cached curriculum object or null if not yet loaded.
 */
function getLoadedCurriculum(id) {
    if (!id) id = curriculaList[0]?.id || "ee_btech";
    return curricula[id] || null;
}

// In Node.js, synchronously pre-populate curriculaList and all curricula for unit tests & offline scripting
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
        const fs = require("fs");
        const path = require("path");
        const indexPath = path.join(__dirname, "curricula", "index.json");
        if (fs.existsSync(indexPath)) {
            const list = JSON.parse(fs.readFileSync(indexPath, "utf8"));
            curriculaList.length = 0;
            list.forEach(item => curriculaList.push(item));
        }
        // Load every curriculum using its configured file path
        curriculaList.forEach(item => {
            if (!item.file) return;
            const p = path.isAbsolute(item.file) ? item.file : path.join(__dirname, item.file);
            if (fs.existsSync(p)) {
                const data = JSON.parse(fs.readFileSync(p, "utf8"));
                data.id = item.id;
                if (item.name && !data.name) {
                    data.name = item.name;
                }
                curricula[item.id] = data;
            }
        });
    } catch (e) {
        console.error("Error pre-populating curricula in Node:", e);
    }
}

// In browser, trigger background pre-fetching of index immediately when script evaluates
if (typeof window !== "undefined" && typeof fetch === "function") {
    loadCurriculaList().catch(err => {
        console.warn("Could not preload curricula list in background:", err);
    });
}

// Backward-compatibility default export for legacy synchronous references
const curriculum = curricula["ee_btech"] || null;

// CommonJS module export for testing and tooling
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        curriculaList,
        curricula,
        loadCurriculum,
        loadCurriculaList,
        getLoadedCurriculum,
        curriculum
    };
}