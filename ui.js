/**
 * User Interface & Interaction Controller
 *
 * Coordinates client-side state, form interactions, localStorage/cookie persistence,
 * theme management, dynamic course & substitution entry tables, and compliance rendering.
 */

// Global state holding student course records and approved substitutions
let currentCourses = [];
let currentSubstitutions = [];

// Initialize application once document markup is fully parsed
document.addEventListener("DOMContentLoaded", async function() {
    setupDarkMode();
    await initializeCurriculumSelector();
    setupEditorControls();
    await loadInitialState();
});

/* =========================================================
   THEME TOGGLE (Consistent with tt.mathiitm.com)
   ========================================================= */

/**
 * Initializes the light/dark theme toggle control.
 * Restores user's saved preference from localStorage or falls back to system color scheme.
 * Attaches change listeners to update body classes and synchronize with system changes.
 */
function setupDarkMode() {
    const toggle = document.getElementById("darkModeToggle");
    if (!toggle) return;

    const savedTheme = localStorage.getItem("theme");

    // Apply explicit saved preference if available
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
        toggle.checked = true;
    } else if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
        toggle.checked = false;
    } else {
        // Fall back to system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        toggle.checked = prefersDark;
        if (prefersDark) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.add("light-mode");
        }
    }

    // Toggle switch listener
    toggle.addEventListener("change", () => {
        document.body.classList.remove("dark-mode", "light-mode");

        if (toggle.checked) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.add("light-mode");
            localStorage.setItem("theme", "light");
        }
    });

    // Listen for OS-level color scheme changes if user hasn't explicitly set a preference
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            toggle.checked = e.matches;
            document.body.classList.remove("dark-mode", "light-mode");
            if (e.matches) {
                document.body.classList.add("dark-mode");
            } else {
                document.body.classList.add("light-mode");
            }
        }
    });
}

/* =========================================================
   PERSISTENT STORAGE (Chunked Cookies with localStorage Fallback)
   ========================================================= */

/**
 * Writes a cookie with path and expiration parameters.
 *
 * @param {string} name - Cookie identifier.
 * @param {string} value - String value to store (URI-encoded).
 * @param {number} [days=365] - Validity duration in days.
 */
function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
}

/**
 * Retrieves and decodes a cookie value by name.
 *
 * @param {string} name - Cookie identifier.
 * @returns {string|null} Decoded cookie content or null if not found.
 */
function getCookie(name) {
    const cname = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim();
        if (c.indexOf(cname) === 0) {
            return decodeURIComponent(c.substring(cname.length));
        }
    }
    return null;
}

/**
 * Deletes a cookie by setting an expiration date in the past.
 *
 * @param {string} name - Cookie identifier to remove.
 */
function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

/**
 * Serializes and persists student course records.
 * Uses a chunked cookie strategy (sub-3500 bytes per chunk) to reliably store
 * transcripts exceeding standard 4KB browser cookie limits, with localStorage fallback.
 *
 * @param {Array<Object>} courses - Student course records.
 */
function saveCoursesToCookie(courses) {
    const jsonStr = JSON.stringify(courses);

    // Clean up previous chunk cookies to prevent stale fragments
    const oldChunks = parseInt(getCookie('courses_chunks') || '0', 10);
    for (let i = 0; i < oldChunks; i++) {
        deleteCookie('courses_chunk_' + i);
    }
    deleteCookie('courses_chunks');
    deleteCookie('courses_data');

    // Safe chunk size under browser 4KB per-cookie limit
    const CHUNK_SIZE = 3500;
    try {
        if (jsonStr.length <= CHUNK_SIZE) {
            // Single cookie storage
            setCookie('courses_data', jsonStr);
        } else {
            // Multi-cookie chunked storage
            const numChunks = Math.ceil(jsonStr.length / CHUNK_SIZE);
            setCookie('courses_chunks', numChunks.toString());
            for (let i = 0; i < numChunks; i++) {
                const chunk = jsonStr.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                setCookie('courses_chunk_' + i, chunk);
            }
        }
    } catch (e) {
        console.warn('Cookie storage failed, relying on localStorage:', e);
    }

    // Always mirror to localStorage as resilient secondary store
    try {
        localStorage.setItem('saved_courses', jsonStr);
    } catch (e) {}
}

/**
 * Reads and reconstructs saved student course records from cookies or localStorage.
 *
 * @returns {Array<Object>|null} Parsed course records or null if no saved data exists.
 */
function loadCoursesFromCookie() {
    // 1. Attempt reading single cookie
    const single = getCookie('courses_data');
    if (single) {
        try {
            return JSON.parse(single);
        } catch (e) {}
    }

    // 2. Attempt reading multi-part chunked cookies
    const chunkCountStr = getCookie('courses_chunks');
    if (chunkCountStr) {
        const numChunks = parseInt(chunkCountStr, 10);
        let combined = '';
        for (let i = 0; i < numChunks; i++) {
            const chunk = getCookie('courses_chunk_' + i);
            if (chunk) combined += chunk;
        }
        if (combined) {
            try {
                return JSON.parse(combined);
            } catch (e) {}
        }
    }

    // 3. Fallback to localStorage
    try {
        const local = localStorage.getItem('saved_courses');
        if (local) {
            return JSON.parse(local);
        }
    } catch (e) {}

    return null;
}

/**
 * Persists the user's selected curriculum identifier in cookies and localStorage.
 *
 * @param {string} curriculumId - Selected curriculum ID (e.g. 'ee_btech').
 */
function saveCurriculumToCookie(curriculumId) {
    setCookie('selected_curriculum', curriculumId);
    try {
        localStorage.setItem('selected_curriculum', curriculumId);
    } catch(e) {}
}

/**
 * Retrieves the user's saved curriculum choice or falls back to 'ee_btech'.
 *
 * @returns {string} Selected curriculum identifier.
 */
function loadCurriculumFromCookie() {
    return getCookie('selected_curriculum') || localStorage.getItem('selected_curriculum') || 'ee_btech';
}

/**
 * Persists student course substitutions in cookies and localStorage.
 *
 * @param {Array<Object>} substitutions - List of substitutions { origCode, replCode }.
 */
function saveSubstitutionsToCookie(substitutions) {
    const jsonStr = JSON.stringify(substitutions || []);
    setCookie('substitutions_data', jsonStr);
    try {
        localStorage.setItem('saved_substitutions', jsonStr);
    } catch (e) {}
}

/**
 * Reads saved course substitutions from cookies or localStorage.
 *
 * @returns {Array<Object>} List of substitutions or empty array if none saved.
 */
function loadSubstitutionsFromCookie() {
    const single = getCookie('substitutions_data');
    if (single) {
        try {
            return JSON.parse(single);
        } catch (e) {}
    }
    try {
        const local = localStorage.getItem('saved_substitutions');
        if (local) {
            return JSON.parse(local);
        }
    } catch (e) {}
    return [];
}

/* =========================================================
   CURRICULUM SELECTOR (Top Right Header Control)
   ========================================================= */

/**
 * Initializes the curriculum dropdown in the header.
 * Awaits catalog loading from curricula/index.json, populates options,
 * restores user's saved curriculum, and attaches change listeners.
 */
async function initializeCurriculumSelector() {
    // Ensure catalog list from curricula/index.json is loaded
    if (typeof loadCurriculaList === 'function') {
        try {
            await loadCurriculaList();
        } catch (err) {
            console.warn('Could not load curricula list from index.json:', err);
        }
    }

    const select = document.getElementById('curriculumSelect');
    if (!select) return;

    select.innerHTML = '';
    const list = (typeof curriculaList !== 'undefined' && Array.isArray(curriculaList) && curriculaList.length > 0)
        ? curriculaList
        : (typeof curricula !== 'undefined' && Object.keys(curricula).length > 0 ? Object.keys(curricula).map(id => ({ id, name: curricula[id].name || id })) : [{ id: 'ee_btech', name: 'EE B.Tech (pre 2023)' }]);

    // Populate dropdown with curriculum entries
    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name || item.id;
        select.appendChild(opt);
    });

    // Helper to update tooltip title with currently selected option label
    const updateSelectTitle = () => {
        if (select.selectedIndex >= 0 && select.options[select.selectedIndex]) {
            select.title = select.options[select.selectedIndex].text;
        }
    };

    // Restore saved choice
    const savedCurriculum = loadCurriculumFromCookie();
    if (list.some(item => item.id === savedCurriculum)) {
        select.value = savedCurriculum;
    }
    updateSelectTitle();
    updateCurriculumNotice();

    // React to curriculum changes
    select.addEventListener('change', async () => {
        updateSelectTitle();
        const selectedId = select.value;
        saveCurriculumToCookie(selectedId);
        try {
            if (typeof loadCurriculum === 'function') {
                await loadCurriculum(selectedId);
            }
            updateDatalists();
            updateCurriculumNotice();
            // Re-calculate compliance if courses are present
            if (currentCourses && currentCourses.length > 0) {
                runCompliance(currentCourses, getCurrentCurriculum(), currentSubstitutions);
            }
        } catch (err) {
            console.error('Failed to load curriculum:', err);
            showEditorNotice(`Failed to load curriculum ${selectedId}: ${err.message}`, 'error');
        }
    });
}

/**
 * Returns the currently active curriculum object from cache or loaded state.
 *
 * @returns {Object|null} Active curriculum definition object.
 */
function getCurrentCurriculum() {
    const select = document.getElementById('curriculumSelect');
    const selectedId = select ? select.value : 'ee_btech';
    if (typeof curricula !== 'undefined' && curricula[selectedId]) {
        return curricula[selectedId];
    }
    if (typeof getLoadedCurriculum === 'function') {
        return getLoadedCurriculum(selectedId);
    }
    return typeof curriculum !== 'undefined' ? curriculum : null;
}

/**
 * Updates the curriculum notice banner displayed at the beginning of the webpage.
 * Reads the optional 'extra' comments field directly from the loaded curriculum.
 *
 * @param {Object} [curriculum] - Optional curriculum object; defaults to getCurrentCurriculum().
 */
function updateCurriculumNotice(curriculum) {
    const noticeEl = document.getElementById('curriculumNotice');
    if (!noticeEl) return;

    if (!curriculum) {
        curriculum = typeof getCurrentCurriculum === 'function' ? getCurrentCurriculum() : null;
    }

    // Check optional 'extra' field from the loaded curriculum object
    const extra = curriculum?.extra;

    // Hide notice if field is omitted or empty
    if (!extra) {
        noticeEl.classList.remove('active');
        noticeEl.style.display = 'none';
        noticeEl.innerHTML = '';
        return;
    }

    let htmlContent = '';
    if (Array.isArray(extra)) {
        // Handle array of comment strings
        const lines = extra.filter(line => typeof line === 'string' && line.trim().length > 0);
        if (lines.length === 0) {
            noticeEl.classList.remove('active');
            noticeEl.style.display = 'none';
            noticeEl.innerHTML = '';
            return;
        }
        htmlContent = lines.map(line => escapeHtml(line)).join('<br>');
    } else if (typeof extra === 'string') {
        // Handle multiline string
        const trimmed = extra.trim();
        if (!trimmed) {
            noticeEl.classList.remove('active');
            noticeEl.style.display = 'none';
            noticeEl.innerHTML = '';
            return;
        }
        htmlContent = escapeHtml(trimmed).replace(/\n/g, '<br>');
    } else {
        noticeEl.classList.remove('active');
        noticeEl.style.display = 'none';
        noticeEl.innerHTML = '';
        return;
    }

    // Display formatted notice banner
    noticeEl.innerHTML = `<strong>Notice:</strong> ${htmlContent}`;
    noticeEl.classList.add('active');
    noticeEl.style.display = 'block';
}

/* =========================================================
   SCREEN & NAVIGATION MANAGEMENT
   ========================================================= */

/**
 * Toggles visibility between the Course Editor screen and the Compliance Summary screen.
 *
 * @param {'editor'|'summary'} screen - Name of the screen to display.
 */
function showScreen(screen) {
    const editorScreen = document.getElementById('editorScreen');
    const summaryScreen = document.getElementById('summaryScreen');

    if (screen === 'summary') {
        editorScreen.classList.add('hidden');
        summaryScreen.classList.remove('hidden');
    } else {
        editorScreen.classList.remove('hidden');
        summaryScreen.classList.add('hidden');
    }
}

/**
 * Asynchronously loads the initial application state on startup.
 * Restores the selected curriculum, student courses, and substitutions,
 * routing to Summary view if courses exist or Editor view if empty.
 */
async function loadInitialState() {
    const savedCurriculumId = loadCurriculumFromCookie() || 'ee_btech';
    if (typeof loadCurriculum === 'function') {
        try {
            await loadCurriculum(savedCurriculumId);
        } catch (err) {
            console.warn(`Could not load curriculum ${savedCurriculumId} via fetch:`, err);
            showEditorNotice(`Unable to load curriculum file (${err.message}). If using local files directly, please run a local server (e.g. 'python3 -m http.server').`, 'error');
        }
    }
    updateCurriculumNotice();

    const savedCourses = loadCoursesFromCookie();
    currentSubstitutions = loadSubstitutionsFromCookie() || [];

    if (savedCourses && Array.isArray(savedCourses) && savedCourses.length > 0) {
        currentCourses = savedCourses;
        populateEditorRows(currentCourses);
        populateSubstitutionRows(currentSubstitutions);
        runCompliance(currentCourses, getCurrentCurriculum(), currentSubstitutions);
        showScreen('summary');
    } else {
        currentCourses = [];
        populateEditorRows([]);
        populateSubstitutionRows(currentSubstitutions);
        showScreen('editor');
    }
    updateDatalists();
}

/**
 * Validates and loads imported course data from uploaded files or pasted text.
 * Accepts either a raw array of course objects or an object containing { courses, substitutions }.
 *
 * @param {Array|Object} parsed - Parsed JSON object.
 * @param {string} [sourceLabel='JSON'] - Description of import source for user notifications.
 */
function loadParsedCourseData(parsed, sourceLabel = 'JSON') {
    let coursesToLoad = [];
    let subsToLoad = [];

    if (Array.isArray(parsed)) {
        coursesToLoad = parsed;
    } else if (parsed && Array.isArray(parsed.courses)) {
        coursesToLoad = parsed.courses;
        if (Array.isArray(parsed.substitutions)) {
            subsToLoad = parsed.substitutions;
        }
    } else {
        throw new Error("JSON file must contain an array of course objects or an object with 'courses'.");
    }

    populateEditorRows(coursesToLoad, /* append = */ false);
    populateSubstitutionRows(subsToLoad);
    updateDatalists();
    const subMsg = subsToLoad.length > 0 ? ` and ${subsToLoad.length} substitution(s)` : '';
    showEditorNotice(`Loaded ${coursesToLoad.length} course(s)${subMsg} from ${sourceLabel}. Review or edit, then click 'Save & Calculate'.`, 'notice');
}

/* =========================================================
   COURSE EDITOR (Direct Addition & Modification)
   ========================================================= */

/**
 * Sets up button clicks, file uploads, drag-and-drop zones, clipboard copy,
 * and form action listeners across the course editor interface.
 */
function setupEditorControls() {
    // "Modify Courses" button on summary screen -> switch back to editor
    const modifyBtn = document.getElementById('modifyCoursesBtn');
    if (modifyBtn) {
        modifyBtn.addEventListener('click', () => {
            populateEditorRows(currentCourses);
            populateSubstitutionRows(currentSubstitutions);
            updateDatalists();
            showScreen('editor');
        });
    }

    // "Download PDF" button on summary screen -> open A4 print dialog
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (typeof triggerPdfDownload === 'function') {
                triggerPdfDownload();
            }
        });
    }

    // "+ Add substitution" button
    const addSubstitutionBtn = document.getElementById('addSubstitutionBtn');
    if (addSubstitutionBtn) {
        addSubstitutionBtn.addEventListener('click', () => {
            addSubstitutionRow();
            const rows = document.querySelectorAll('#substitutionRowsList .substitution-row');
            if (rows.length > 0) {
                rows[rows.length - 1].querySelector('.sub-core-code').focus();
            }
        });
    }

    // "+ Add course" button
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            addCourseRow();
            const rows = document.querySelectorAll('#courseRowsList .course-row');
            if (rows.length > 0) {
                const newRow = rows[rows.length - 1];
                newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                newRow.querySelector('.row-code').focus();
            }
        });
    }

    // JSON file upload button & hidden input
    const uploadJsonBtn = document.getElementById('uploadJsonBtn');
    const jsonFileInput = document.getElementById('jsonFileInput');
    if (uploadJsonBtn && jsonFileInput) {
        uploadJsonBtn.addEventListener('click', () => {
            jsonFileInput.click();
        });

        jsonFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const parsed = JSON.parse(e.target.result);
                    loadParsedCourseData(parsed, `file "${file.name}"`);
                } catch (err) {
                    showEditorNotice(`Failed to parse JSON file: ${err.message}`, 'error');
                    console.error(err);
                }
                jsonFileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    // Drag-and-drop & clipboard paste zone for course JSON
    const dropZone = document.getElementById('jsonDropZone');
    let isDropZoneHovered = false;

    if (dropZone) {
        dropZone.addEventListener('mouseenter', () => {
            isDropZoneHovered = true;
        });

        dropZone.addEventListener('mouseleave', () => {
            isDropZoneHovered = false;
            dropZone.blur();
        });

        dropZone.addEventListener('click', () => {
            const fileInput = jsonFileInput || document.getElementById('jsonFileInput');
            if (fileInput) {
                fileInput.click();
            }
        });

        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const fileInput = jsonFileInput || document.getElementById('jsonFileInput');
                if (fileInput) {
                    fileInput.click();
                }
            }
        });

        // Parse and ingest pasted JSON text
        const handlePasteString = (text, sourceLabel = 'pasted JSON') => {
            if (!text || !text.trim()) {
                showEditorNotice("No JSON content found in clipboard to paste.", 'error');
                return;
            }
            try {
                const parsed = JSON.parse(text.trim());
                loadParsedCourseData(parsed, sourceLabel);
            } catch (err) {
                showEditorNotice(`Failed to parse ${sourceLabel}: ${err.message}`, 'error');
                console.error(err);
            }
        };

        const onPasteEvent = (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;
            const text = clipboardData.getData('text');
            if (text) {
                e.preventDefault();
                handlePasteString(text, 'pasted JSON');
            }
        };

        dropZone.addEventListener('paste', onPasteEvent);

        // Global paste listener when hovering drop zone or drop zone is focused
        document.addEventListener('paste', (e) => {
            const targetTag = e.target && e.target.tagName;
            if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
                return;
            }
            if (isDropZoneHovered || document.activeElement === dropZone) {
                onPasteEvent(e);
            }
        });

        // Drag events visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('drag-over');
            });
        });

        // Drop file or text
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (!dt) return;

            if (dt.files && dt.files.length > 0) {
                const file = dt.files[0];
                const reader = new FileReader();
                reader.onload = function(evt) {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        loadParsedCourseData(parsed, `dropped file "${file.name}"`);
                    } catch (err) {
                        showEditorNotice(`Failed to parse dropped JSON file: ${err.message}`, 'error');
                        console.error(err);
                    }
                };
                reader.readAsText(file);
            } else {
                const text = dt.getData('text');
                if (text) {
                    handlePasteString(text, 'dropped JSON text');
                }
            }
        });
    }

    // JSON export button -> downloads completed_courses.json
    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    if (downloadJsonBtn) {
        downloadJsonBtn.addEventListener('click', () => {
            const courses = getCoursesFromEditor();
            if (courses.length === 0) {
                showEditorNotice("No courses to download. Please enter course details first.", 'error');
                return;
            }

            const substitutions = getSubstitutionsFromEditor();
            let exportData = courses;
            if (substitutions && substitutions.length > 0) {
                exportData = {
                    courses: courses,
                    substitutions: substitutions
                };
            }

            try {
                const dataStr = JSON.stringify(exportData, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "completed_courses.json";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                const subMsg = substitutions.length > 0 ? ` and ${substitutions.length} substitution(s)` : '';
                showEditorNotice(`Downloaded ${courses.length} course(s)${subMsg} to completed_courses.json.`, 'notice');
            } catch (err) {
                showEditorNotice(`Failed to export JSON: ${err.message}`, 'error');
                console.error(err);
            }
        });
    }

    // "Clear All" button -> empties editor table
    const clearCoursesBtn = document.getElementById('clearCoursesBtn');
    if (clearCoursesBtn) {
        clearCoursesBtn.addEventListener('click', () => {
            populateEditorRows([]);
            updateDatalists();
            showEditorNotice("Cleared all course rows.", 'notice');
        });
    }

    // "Save & Calculate" prominent action button
    const saveAndCalculateBtn = document.getElementById('saveAndCalculateBtn');
    if (saveAndCalculateBtn) {
        saveAndCalculateBtn.addEventListener('click', async () => {
            const courses = getCoursesFromEditor();
            if (courses.length === 0) {
                showEditorNotice("Please add at least one course before saving.", 'error');
                return;
            }

            const substitutions = getSubstitutionsFromEditor();

            currentCourses = courses;
            currentSubstitutions = substitutions;
            saveCoursesToCookie(currentCourses);
            saveSubstitutionsToCookie(currentSubstitutions);

            let curr = getCurrentCurriculum();
            if (!curr && typeof loadCurriculum === 'function') {
                const select = document.getElementById('curriculumSelect');
                const selectedId = select ? select.value : 'ee_btech';
                try {
                    curr = await loadCurriculum(selectedId);
                } catch (e) {
                    console.error(e);
                }
            }

            runCompliance(currentCourses, curr, currentSubstitutions);
            showScreen('summary');
        });
    }

    // Copy LLM prompt text button
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    const llmPromptText = document.getElementById('llmPromptText');
    if (copyPromptBtn && llmPromptText) {
        copyPromptBtn.addEventListener('click', () => {
            llmPromptText.select();
            const setCopied = () => {
                const originalText = copyPromptBtn.textContent;
                copyPromptBtn.textContent = "Copied to Clipboard!";
                setTimeout(() => {
                    copyPromptBtn.textContent = originalText;
                }, 2000);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(llmPromptText.value)
                    .then(setCopied)
                    .catch(() => {
                        document.execCommand('copy');
                        setCopied();
                    });
            } else {
                document.execCommand('copy');
                setCopied();
            }
        });
    }
}

/**
 * Displays an informational or error notice banner inside the course editor.
 *
 * @param {string} text - Message content to display.
 * @param {'notice'|'warning'|'error'} [type='notice'] - Notice type controlling styling.
 */
function showEditorNotice(text, type = 'notice') {
    const notice = document.getElementById('editorNotice');
    if (!notice) return;
    notice.className = `alert alert-${type} active`;
    notice.style.display = 'block';
    notice.innerHTML = `<strong>${type === 'error' ? 'Error:' : 'Notice:'}</strong> ${escapeHtml(text)}`;
}

/**
 * Escapes characters with special HTML meaning to prevent injection.
 *
 * @param {string} str - Raw string.
 * @returns {string} Safe HTML string.
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Populates course rows in the editor container from an array of course objects.
 *
 * @param {Array<Object>} courses - Array of courses { code, name, credits, category, semester }.
 * @param {boolean} [append=false] - If true, appends without clearing existing rows.
 */
function populateEditorRows(courses, append = false) {
    const container = document.getElementById('courseRowsList');
    if (!container) return;

    if (!append) {
        container.innerHTML = '';
    }

    if (!courses || courses.length === 0) {
        addCourseRow();
        return;
    }

    courses.forEach(c => {
        addCourseRow(c);
    });
}

/**
 * Appends a single editable course row to the course rows list.
 *
 * @param {Object} [course={}] - Optional course initial data.
 */
function addCourseRow(course = {}) {
    const container = document.getElementById('courseRowsList');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'course-row';

    const code = course.code || '';
    const name = course.name || '';
    const credits = course.credits !== undefined ? course.credits : '';
    const category = (course.category || 'P').toUpperCase();
    const semester = course.semester !== undefined ? course.semester : '';

    const standardCats = ['P', 'S', 'E', 'C', 'M', 'H', 'G', 'ANY'];
    let catOptionsHtml = standardCats.map(cat => 
        `<option value="${cat}" ${cat === category ? 'selected' : ''}>${cat}</option>`
    ).join('');
    if (category && !standardCats.includes(category)) {
        catOptionsHtml += `<option value="${category}" selected>${category}</option>`;
    }

    row.innerHTML = `
        <input type="text" class="row-code" placeholder="Code (e.g. EE2001)" value="${escapeHtml(code)}" maxlength="10">
        <input type="text" class="row-name" placeholder="Course Name" value="${escapeHtml(name)}">
        <input type="number" class="row-credits" placeholder="Credits" value="${credits}" min="0" max="60">
        <select class="row-category">
            ${catOptionsHtml}
        </select>
        <input type="number" class="row-semester" placeholder="Sem" value="${semester}" min="1" max="12">
        <span class="close-btn" title="Remove course" role="button" tabindex="0">×</span>
    `;

    // Row deletion handler
    const closeBtn = row.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        row.remove();
        if (document.querySelectorAll('#courseRowsList .course-row').length === 0) {
            addCourseRow();
        }
        updateCompletedCoursesDatalist();
    });
    closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.remove();
            if (document.querySelectorAll('#courseRowsList .course-row').length === 0) {
                addCourseRow();
            }
            updateCompletedCoursesDatalist();
        }
    });

    // Auto-update substitution autocomplete datalists when code or name changes
    const codeInput = row.querySelector('.row-code');
    const nameInput = row.querySelector('.row-name');
    if (codeInput) codeInput.addEventListener('input', updateCompletedCoursesDatalist);
    if (nameInput) nameInput.addEventListener('input', updateCompletedCoursesDatalist);

    container.appendChild(row);
}

/**
 * Extracts and sanitizes student course data from the editor DOM rows.
 *
 * @returns {Array<Object>} Array of sanitized course objects { code, name, credits, category, semester }.
 */
function getCoursesFromEditor() {
    const rows = document.querySelectorAll('#courseRowsList .course-row');
    const courses = [];

    rows.forEach(row => {
        const code = row.querySelector('.row-code').value.trim().toUpperCase();
        const name = row.querySelector('.row-name').value.trim();
        const creditsStr = row.querySelector('.row-credits').value.trim();
        const category = row.querySelector('.row-category').value.trim().toUpperCase();
        const semStr = row.querySelector('.row-semester').value.trim();

        if (code) {
            courses.push({
                code: code,
                name: name || code,
                credits: creditsStr === "" ? 0 : Number(creditsStr),
                category: category || "ANY",
                semester: semStr === "" ? 1 : Number(semStr)
            });
        }
    });

    return courses;
}

/**
 * Renders all saved substitution pairs into the substitution editor rows.
 *
 * @param {Array<Object>} substitutions - List of substitutions { origCode, replCode }.
 */
function populateSubstitutionRows(substitutions) {
    const container = document.getElementById('substitutionRowsList');
    if (!container) return;
    container.innerHTML = '';

    if (!substitutions || substitutions.length === 0) {
        showEmptySubstitutionHint();
        return;
    }

    substitutions.forEach(s => {
        const orig = s.origCode || s.coreCode || '';
        const repl = s.replacementCode || s.replCode || '';
        addSubstitutionRow(orig, repl);
    });
}

/**
 * Displays an informational placeholder hint when no substitutions have been configured.
 */
function showEmptySubstitutionHint() {
    const container = document.getElementById('substitutionRowsList');
    if (!container) return;
    if (container.querySelectorAll('.substitution-row').length === 0) {
        container.innerHTML = '<p class="hint empty-subs-hint" style="margin: 0.4rem 0;">No substitutions added. Click "Add Substitution" to replace a core course or named basket course with an alternate course.</p>';
    }
}

/**
 * Appends an editable substitution row mapping an original course to a replacement.
 *
 * @param {string} [coreCode=''] - Original course code to be replaced.
 * @param {string} [replacementCode=''] - Student's completed replacement course code.
 */
function addSubstitutionRow(coreCode = '', replacementCode = '') {
    const container = document.getElementById('substitutionRowsList');
    if (!container) return;

    const emptyHint = container.querySelector('.empty-subs-hint');
    if (emptyHint) emptyHint.remove();

    const row = document.createElement('div');
    row.className = 'substitution-row';
    row.innerHTML = `
        <input type="text" class="sub-core-code" placeholder="Original Course (e.g. EE2003)" list="curriculumCoursesDatalist" value="${escapeHtml(coreCode)}" maxlength="10">
        <input type="text" class="sub-repl-code" placeholder="Replacement Course (e.g. CS6001)" list="completedCoursesDatalist" value="${escapeHtml(replacementCode)}" maxlength="10">
        <span class="close-btn sub-close-btn" title="Remove substitution" role="button" tabindex="0">×</span>
    `;

    // Dynamic autocomplete datalist triggers on focus
    const coreInput = row.querySelector('.sub-core-code');
    if (coreInput) {
        coreInput.addEventListener('focus', updateCurriculumCoursesDatalist);
    }

    const replInput = row.querySelector('.sub-repl-code');
    if (replInput) {
        replInput.addEventListener('focus', updateCompletedCoursesDatalist);
    }

    // Row deletion handler
    const closeBtn = row.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        row.remove();
        if (container.querySelectorAll('.substitution-row').length === 0) {
            showEmptySubstitutionHint();
        }
    });
    closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.remove();
            if (container.querySelectorAll('.substitution-row').length === 0) {
                showEmptySubstitutionHint();
            }
        }
    });

    container.appendChild(row);
}

/**
 * Extracts and normalizes substitution pairs configured in the editor DOM.
 *
 * @returns {Array<Object>} List of substitutions { origCode, replCode, coreCode, replacementCode }.
 */
function getSubstitutionsFromEditor() {
    const rows = document.querySelectorAll('#substitutionRowsList .substitution-row');
    const substitutions = [];
    rows.forEach(row => {
        const coreCode = row.querySelector('.sub-core-code').value.trim().toUpperCase();
        const replacementCode = row.querySelector('.sub-repl-code').value.trim().toUpperCase();
        if (coreCode && replacementCode) {
            substitutions.push({
                origCode: coreCode,
                coreCode: coreCode,
                replacementCode: replacementCode,
                replCode: replacementCode
            });
        }
    });
    return substitutions;
}

/**
 * Refreshes all autocomplete datalists across the interface.
 */
function updateDatalists() {
    updateCurriculumCoursesDatalist();
    updateCompletedCoursesDatalist();
}

/**
 * Populates the #curriculumCoursesDatalist with core courses and named basket electives
 * belonging to the currently selected curriculum.
 */
function updateCurriculumCoursesDatalist() {
    const datalist = document.getElementById('curriculumCoursesDatalist');
    const legacyDatalist = document.getElementById('coreCoursesDatalist');
    const curr = getCurrentCurriculum();
    if (!curr) return;

    const options = [];
    const seen = new Set();

    // 1. Mandatory core courses
    if (curr.coreCourses) {
        Object.keys(curr.coreCourses).forEach(code => {
            const info = curr.coreCourses[code];
            seen.add(code);
            options.push(`<option value="${code}">${code} - ${escapeHtml(info.name || code)} (Core)</option>`);
        });
    }

    // 2. Named courses in elective baskets
    if (curr.requirements) {
        curr.requirements.forEach(req => {
            if (req.matchType === 'in_list' && Array.isArray(req.matchValue)) {
                req.matchValue.forEach(code => {
                    const tag = `${code} (${req.name})`;
                    if (!seen.has(tag)) {
                        seen.add(tag);
                        options.push(`<option value="${code}">${code} (${escapeHtml(req.name)})</option>`);
                    }
                });
            }
        });
    }

    const html = options.join('');
    if (datalist) datalist.innerHTML = html;
    if (legacyDatalist) legacyDatalist.innerHTML = html;
}

/**
 * Alias for updateCurriculumCoursesDatalist() for backwards compatibility.
 */
function updateCoreCoursesDatalist() {
    updateCurriculumCoursesDatalist();
}

/**
 * Populates the #completedCoursesDatalist with course codes entered in the course editor.
 */
function updateCompletedCoursesDatalist() {
    const completedDatalist = document.getElementById('completedCoursesDatalist');
    if (!completedDatalist) return;
    const editorCourses = getCoursesFromEditor();
    const listToUse = (editorCourses && editorCourses.length > 0) ? editorCourses : currentCourses;
    completedDatalist.innerHTML = listToUse.map(c => {
        return `<option value="${c.code}">${c.code} - ${escapeHtml(c.name)}</option>`;
    }).join('');
}

/* =========================================================
   COMPLIANCE LOGIC & RENDERING
   ========================================================= */

/**
 * Orchestrates calculation of degree requirements and renders output to the DOM.
 *
 * @param {Array<Object>} userCourses - Student completed courses.
 * @param {Object} [curr] - Curriculum definition; defaults to getCurrentCurriculum().
 * @param {Array<Object>} [subs] - Configured substitutions; defaults to currentSubstitutions.
 */
function runCompliance(userCourses, curr, subs) {
    const curriculumToUse = curr || getCurrentCurriculum();
    if (!curriculumToUse) {
        console.error("No curriculum available for compliance check.");
        return;
    }
    const substitutionsToUse = subs !== undefined ? subs : currentSubstitutions;

    const { results, messages } = calculateCompliance(userCourses, curriculumToUse, substitutionsToUse);
    renderMessages(messages);
    renderResults(results);
}

/**
 * Renders warning, error, and informational notice banners inside the #messageBoard container.
 *
 * @param {Array<Object>} messages - Array of message objects { type, text }.
 */
function renderMessages(messages) {
    const board = document.getElementById('messageBoard');
    if (!board) return;
    board.innerHTML = ''; 

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `alert alert-${msg.type} active`;
        
        let prefix = "Notice:";
        if (msg.type === 'warning') prefix = "Warning:";
        if (msg.type === 'error') prefix = "Error:";

        div.innerHTML = `<strong>${prefix}</strong> ${escapeHtml(msg.text)}`;
        board.appendChild(div);
    });
}

/**
 * Renders the Summary table and the detailed breakdown cards into the summary screen.
 *
 * @param {Object} results - Calculated compliance results object from calculateCompliance().
 */
function renderResults(results) {
    const tbody = document.querySelector('#summaryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const detailsSection = document.getElementById('detailsSection');
    if (detailsSection) detailsSection.innerHTML = '';

    // Collect core courses and all elective requirement baskets
    const allSections = [
        { id: 'core', data: results.core, isCore: true },
        ...Object.keys(results.reqs).map(key => ({ id: key, data: results.reqs[key], isCore: false }))
    ];

    allSections.forEach(section => {
        const req = section.data;
        
        let isCompleted = false;
        let targetText = "";
        let completedText = "";
        let pendingCredits = 0;

        if (section.isCore) {
            const neededCredits = req.neededCredits !== undefined ? req.neededCredits : req.needed;
            const appliedCredits = req.appliedCredits !== undefined ? req.appliedCredits : 0;
            const neededCourses = req.neededCourses !== undefined ? req.neededCourses : (req.coursesUsed ? req.coursesUsed.length : 0);
            const appliedCourses = req.appliedCourses !== undefined ? req.appliedCourses : (req.coursesUsed ? req.coursesUsed.filter(c => c.isCompleted).length : 0);

            const creditsComplete = appliedCredits >= neededCredits;
            const coursesComplete = appliedCourses >= neededCourses;
            isCompleted = creditsComplete && coursesComplete;
            pendingCredits = Math.max(0, neededCredits - appliedCredits);

            targetText = `<div class="metric-val">${neededCredits} Credits</div><div class="metric-sub">(${neededCourses} Courses)</div>`;
            completedText = `<div class="metric-val">${appliedCredits} Credits</div><div class="metric-sub">(${appliedCourses} Courses)</div>`;
        } else {
            let creditsComplete = req.applied >= req.needed;
            let coursesComplete = req.minCourses ? (req.coursesUsed.length >= req.minCourses) : true;
            
            isCompleted = creditsComplete && coursesComplete;
            pendingCredits = Math.max(0, req.needed - req.applied);
            targetText = `<div class="metric-val">${req.needed} Credits</div>`;
            completedText = `<div class="metric-val">${req.applied} Credits</div>`;
            
            if (req.minCourses) {
                targetText += `<div class="metric-sub">(Min ${req.minCourses} Courses)</div>`;
                completedText += `<div class="metric-sub">(${req.coursesUsed.length} Courses)</div>`;
            }
        }

        // Create interactive summary table row
        const tr = document.createElement('tr');
        tr.classList.add('clickable-row');
        tr.setAttribute('data-section', section.id);
        tr.setAttribute('role', 'button');
        tr.setAttribute('tabindex', '0');
        tr.innerHTML = `
            <td><strong>${escapeHtml(req.name)}</strong></td>
            <td>${targetText}</td>
            <td>${completedText}</td>
            <td class="status-cell">
                <div class="status-wrap">
                    <span class="badge ${isCompleted ? 'badge-pass' : 'badge-fail'}">
                        ${isCompleted ? 'Complete' : 'Incomplete'}
                    </span>
                    <span class="status-pending">(${pendingCredits} pending)</span>
                </div>
            </td>
        `;
        
        // Click and keyboard accessibility listeners to expand details
        tr.addEventListener('click', () => toggleDetails(section.id));
        tr.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDetails(section.id);
            }
        });

        tbody.appendChild(tr);

        // Build expandable details card container
        if (detailsSection) {
            const detailDiv = document.createElement('div');
            detailDiv.id = `detail-${section.id}`;
            detailDiv.className = 'form-section detail-card hidden';

            let tableHtml = `
                <h3 style="margin-top: 0; margin-bottom: 0.25rem;">${escapeHtml(req.name)} - Applied Courses</h3>
                ${req.coursesUsed.length === 0 ? '<p class="hint">No courses applied to this requirement yet.</p>' : `
                <div class="table-wrap">
                    <table class="${section.isCore ? 'table-core' : 'table-elective'}">
                        <thead>
                            <tr>
                                <th scope="col">Code</th>
                                <th scope="col">Name</th>
                                <th scope="col">Credits Applied</th>
                                ${section.isCore ? '<th scope="col" style="text-align: center;">Intended Sem</th>' : ''}
                                <th scope="col" style="text-align: center;">Completed Sem</th>
                                <th scope="col" style="text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${req.coursesUsed.map(c => `
                                <tr>
                                    <td><code>${escapeHtml(c.code)}</code></td>
                                    <td class="cell-wrap">${escapeHtml(c.name)}</td>
                                    <td>${c.creditsApplied}</td>
                                    ${section.isCore ? `<td style="text-align: center;">${c.intendedSem}</td>` : ''}
                                    <td style="text-align: center;">${c.completedSem !== "-" ? c.completedSem : "-"}</td>
                                    <td class="status-cell"><span class="badge ${c.isCompleted ? 'badge-pass' : 'badge-fail'}">${escapeHtml(c.note)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`}
            `;
            detailDiv.innerHTML = tableHtml;
            detailsSection.appendChild(detailDiv);
        }
    });
}

/**
 * Toggles visibility of the detailed course list card for a given requirement section.
 * Closes other open detail cards and toggles the .selected-row highlight on the summary table.
 *
 * @param {string} sectionId - Section identifier (e.g. 'core', 'stream_basket', 'free').
 */
function toggleDetails(sectionId) {
    const target = document.getElementById(`detail-${sectionId}`);
    const isCurrentlyHidden = target ? target.classList.contains('hidden') : true;

    // Close all other detail cards
    document.querySelectorAll('.detail-card').forEach(card => {
        card.classList.add('hidden');
    });

    // Remove active highlight from all summary rows
    document.querySelectorAll('#summaryTable tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });

    // Toggle target card if previously closed
    if (target && isCurrentlyHidden) {
        target.classList.remove('hidden');
        const activeRow = document.querySelector(`#summaryTable tbody tr[data-section="${sectionId}"]`);
        if (activeRow) {
            activeRow.classList.add('selected-row');
        }
    }
}