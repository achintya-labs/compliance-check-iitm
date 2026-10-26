/**
 * Curriculum Manager & On-Demand Loader
 * Each curriculum is stored in its own JSON file under curricula/*.json
 * and loaded asynchronously as needed.
 */

const curriculaList = [
    {
        id: "ee_btech",
        name: "EE B.Tech (pre 2023)",
        fullName: "Electrical Engineering (B.Tech - pre 2023)",
        file: "curricula/ee_btech.json"
    },
    {
        id: "ee_btech_hons",
        name: "EE B.Tech Honours (pre 2023)",
        fullName: "Electrical Engineering (B.Tech Honours - pre 2023)",
        file: "curricula/ee_btech_hons.json"
    },
    {
        id: "ee_dual_degree",
        name: "EE Dual Degree (pre 2023)",
        fullName: "Electrical Engineering (Dual Degree - pre 2023)",
        file: "curricula/ee_dual_degree.json"
    },
    {
        id: "ee_dual_degree_hons",
        name: "EE Dual Degree Honours (pre 2023)",
        fullName: "Electrical Engineering (Dual Degree Honours - pre 2023)",
        file: "curricula/ee_dual_degree_hons.json"
    },
    {
        id: "ee_btech_2024",
        name: "EE B.Tech (post 2024)",
        fullName: "Electrical Engineering (B.Tech - post 2024)",
        file: "curricula/ee_btech_2024.json"
    },
    {
        id: "ee_btech_hons_2024",
        name: "EE B.Tech Honours (post 2024)",
        fullName: "Electrical Engineering (B.Tech Honours - post 2024)",
        file: "curricula/ee_btech_hons_2024.json"
    },
    {
        id: "ee_dual_degree_2024",
        name: "EE Dual Degree (post 2024)",
        fullName: "Electrical Engineering (Dual Degree - post 2024)",
        file: "curricula/ee_dual_degree_2024.json"
    },
    {
        id: "ee_dual_degree_hons_2024",
        name: "EE Dual Degree Honours (post 2024)",
        fullName: "Electrical Engineering (Dual Degree Honours - post 2024)",
        file: "curricula/ee_dual_degree_hons_2024.json"
    }
];

// In-memory cache for loaded curricula
const curricula = {};

/**
 * Loads a curriculum by ID from its JSON file.
 * Returns a Promise resolving to the curriculum data.
 */
async function loadCurriculum(id = "ee_btech") {
    if (!id) id = "ee_btech";
    if (curricula[id]) {
        return curricula[id];
    }

    // Node.js environment support for tests & offline scripting
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        try {
            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, "curricula", `${id}.json`);
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
                curricula[id] = data;
                return data;
            }
        } catch (e) {
            console.error(`Error loading curriculum file for ${id} in Node:`, e);
        }
    }

    // Browser environment: fetch the JSON file
    try {
        const response = await fetch(`curricula/${id}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load curricula/${id}.json: HTTP ${response.status}`);
        }
        const data = await response.json();
        curricula[id] = data;
        return data;
    } catch (err) {
        console.error(`Error fetching curriculum JSON for ${id}:`, err);
        throw err;
    }
}

/**
 * Retrieves the currently loaded curriculum from cache (or null if not yet loaded).
 */
function getLoadedCurriculum(id) {
    if (!id) id = "ee_btech";
    return curricula[id] || null;
}

// In Node.js, synchronously pre-populate curricula for convenience in unit tests
if (typeof process !== "undefined" && process.versions && process.versions.node) {
    try {
        const fs = require("fs");
        const path = require("path");
        const curriculaDir = path.join(__dirname, "curricula");
        if (fs.existsSync(curriculaDir)) {
            curriculaList.forEach(item => {
                const p = path.join(curriculaDir, `${item.id}.json`);
                if (fs.existsSync(p)) {
                    curricula[item.id] = JSON.parse(fs.readFileSync(p, "utf8"));
                }
            });
        }
    } catch (e) {}
}

// Backward-compatibility default export for synchronous references
const curriculum = curricula["ee_btech"] || null;

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        curriculaList,
        curricula,
        loadCurriculum,
        getLoadedCurriculum,
        curriculum
    };
}