/**
 * Curriculum Manager & On-Demand Loader
 * Curricula metadata is maintained in curricula/index.json.
 * Each curriculum file is specified by the "file" path in index.json
 * and loaded asynchronously as needed.
 */

// Master list of available curricula, loaded from curricula/index.json
const curriculaList = [];

// In-memory cache for loaded curricula details
const curricula = {};

let curriculaListPromise = null;

/**
 * Loads the list of curricula from curricula/index.json.
 * Returns a Promise resolving to curriculaList.
 */
async function loadCurriculaList() {
    if (curriculaList.length > 0) {
        return curriculaList;
    }

    if (curriculaListPromise) {
        return curriculaListPromise;
    }

    // Node.js environment support for tests & offline scripting
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

    // Browser environment: fetch curricula/index.json
    curriculaListPromise = (async () => {
        try {
            const response = await fetch("curricula/index.json");
            if (!response.ok) {
                throw new Error(`Failed to load curricula/index.json: HTTP ${response.status}`);
            }
            const list = await response.json();
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
 * Loads a curriculum by ID or file path using the "file" path configured in index.json.
 * Returns a Promise resolving to the curriculum data.
 */
async function loadCurriculum(id = "ee_btech") {
    if (!id) id = curriculaList[0]?.id || "ee_btech";
    if (curricula[id]) {
        return curricula[id];
    }

    // Ensure curriculaList metadata from index.json is loaded first
    if (curriculaList.length === 0) {
        await loadCurriculaList();
    }

    // Resolve curriculum entry from curriculaList to obtain the configured file path
    const entry = curriculaList.find(c => c.id === id || c.file === id);
    const targetId = entry ? entry.id : id;
    const filePath = entry ? entry.file : (id.endsWith(".json") ? id : `curricula/${id}.json`);

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

    // Browser environment: fetch the JSON file using the path configured in index.json
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: HTTP ${response.status}`);
        }
        const data = await response.json();
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
 * Retrieves the currently loaded curriculum from cache (or null if not yet loaded).
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

// In browser, trigger background load of index immediately when script is parsed
if (typeof window !== "undefined" && typeof fetch === "function") {
    loadCurriculaList().catch(err => {
        console.warn("Could not preload curricula list in background:", err);
    });
}

// Backward-compatibility default export for synchronous references
const curriculum = curricula["ee_btech"] || null;

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