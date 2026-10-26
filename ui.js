let currentCourses = [];
let currentSubstitutions = [];

document.addEventListener("DOMContentLoaded", function() {
    setupDarkMode();
    initializeCurriculumSelector();
    setupEditorControls();
    loadInitialState();
});

/* =========================================================
   THEME TOGGLE (Consistent with tt.mathiitm.com)
   ========================================================= */
function setupDarkMode() {
    const toggle = document.getElementById("darkModeToggle");
    if (!toggle) return;

    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
        toggle.checked = true;
    } else if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
        toggle.checked = false;
    } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        toggle.checked = prefersDark;
        if (prefersDark) {
            document.body.classList.add("dark-mode");
        } else {
            document.body.classList.add("light-mode");
        }
    }

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
   PERSISTENT COOKIE STORAGE (Chunked for >4KB safety)
   ========================================================= */
function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
}

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

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

function saveCoursesToCookie(courses) {
    const jsonStr = JSON.stringify(courses);

    // Clean up previous chunk cookies
    const oldChunks = parseInt(getCookie('courses_chunks') || '0', 10);
    for (let i = 0; i < oldChunks; i++) {
        deleteCookie('courses_chunk_' + i);
    }
    deleteCookie('courses_chunks');
    deleteCookie('courses_data');

    // Safe chunk size under 4KB cookie limits
    const CHUNK_SIZE = 2000;
    const totalChunks = Math.ceil(jsonStr.length / CHUNK_SIZE);

    if (totalChunks <= 1) {
        setCookie('courses_data', jsonStr);
    } else {
        setCookie('courses_chunks', totalChunks.toString());
        for (let i = 0; i < totalChunks; i++) {
            setCookie('courses_chunk_' + i, jsonStr.substr(i * CHUNK_SIZE, CHUNK_SIZE));
        }
    }

    // Mirror to localStorage as a safeguard
    try {
        localStorage.setItem('saved_courses', jsonStr);
    } catch (e) {}
}

function loadCoursesFromCookie() {
    // 1. Single cookie
    const single = getCookie('courses_data');
    if (single) {
        try {
            return JSON.parse(single);
        } catch (e) {}
    }

    // 2. Chunked cookies
    const chunkCount = parseInt(getCookie('courses_chunks') || '0', 10);
    if (chunkCount > 0) {
        let combined = '';
        for (let i = 0; i < chunkCount; i++) {
            const chunk = getCookie('courses_chunk_' + i);
            if (chunk) combined += chunk;
        }
        if (combined) {
            try {
                return JSON.parse(combined);
            } catch (e) {}
        }
    }

    // 3. Fallback to localStorage if cookies unavailable
    try {
        const local = localStorage.getItem('saved_courses');
        if (local) {
            return JSON.parse(local);
        }
    } catch (e) {}

    return null;
}

function saveCurriculumToCookie(curriculumId) {
    setCookie('selected_curriculum', curriculumId);
    try {
        localStorage.setItem('selected_curriculum', curriculumId);
    } catch(e) {}
}

function loadCurriculumFromCookie() {
    return getCookie('selected_curriculum') || localStorage.getItem('selected_curriculum') || 'ee_btech';
}

function saveSubstitutionsToCookie(substitutions) {
    const jsonStr = JSON.stringify(substitutions || []);
    setCookie('substitutions_data', jsonStr);
    try {
        localStorage.setItem('saved_substitutions', jsonStr);
    } catch (e) {}
}

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
   CURRICULUM SELECTOR (Top Right Corner)
   ========================================================= */
function initializeCurriculumSelector() {
    const select = document.getElementById('curriculumSelect');
    if (!select) return;

    select.innerHTML = '';
    const availableCurricula = typeof curricula !== 'undefined' ? curricula : { "ee_btech": curriculum };

    Object.keys(availableCurricula).forEach(id => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = availableCurricula[id].name || id;
        select.appendChild(opt);
    });

    const savedCurriculum = loadCurriculumFromCookie();
    if (availableCurricula[savedCurriculum]) {
        select.value = savedCurriculum;
    }

    select.addEventListener('change', () => {
        saveCurriculumToCookie(select.value);
        updateDatalists();
        if (currentCourses && currentCourses.length > 0) {
            runCompliance(currentCourses, getCurrentCurriculum(), currentSubstitutions);
        }
    });
}

function getCurrentCurriculum() {
    const select = document.getElementById('curriculumSelect');
    const selectedId = select ? select.value : 'ee_btech';
    if (typeof curricula !== 'undefined' && curricula[selectedId]) {
        return curricula[selectedId];
    }
    return typeof curriculum !== 'undefined' ? curriculum : null;
}

/* =========================================================
   SCREEN & NAVIGATION MANAGEMENT
   ========================================================= */
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

function loadInitialState() {
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

/* =========================================================
   COURSE EDITOR (Direct Addition & Modification)
   ========================================================= */
function setupEditorControls() {
    const modifyBtn = document.getElementById('modifyCoursesBtn');
    if (modifyBtn) {
        modifyBtn.addEventListener('click', () => {
            populateEditorRows(currentCourses);
            populateSubstitutionRows(currentSubstitutions);
            updateDatalists();
            showScreen('editor');
        });
    }

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
                    showEditorNotice(`Loaded ${coursesToLoad.length} course(s)${subMsg} from JSON. Review or edit, then click 'Save & Calculate'.`, 'notice');
                } catch (err) {
                    showEditorNotice(`Failed to parse JSON file: ${err.message}`, 'error');
                    console.error(err);
                }
                jsonFileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

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

    const clearCoursesBtn = document.getElementById('clearCoursesBtn');
    if (clearCoursesBtn) {
        clearCoursesBtn.addEventListener('click', () => {
            populateEditorRows([]);
            updateDatalists();
            showEditorNotice("Cleared all course rows.", 'notice');
        });
    }

    const saveAndCalculateBtn = document.getElementById('saveAndCalculateBtn');
    if (saveAndCalculateBtn) {
        saveAndCalculateBtn.addEventListener('click', () => {
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

            const curr = getCurrentCurriculum();
            runCompliance(currentCourses, curr, currentSubstitutions);
            showScreen('summary');
        });
    }

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

function showEditorNotice(text, type = 'notice') {
    const notice = document.getElementById('editorNotice');
    if (!notice) return;
    notice.className = `alert alert-${type} active`;
    notice.style.display = 'block';
    notice.innerHTML = `<strong>${type === 'error' ? 'Error:' : 'Notice:'}</strong> ${escapeHtml(text)}`;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

    const codeInput = row.querySelector('.row-code');
    const nameInput = row.querySelector('.row-name');
    if (codeInput) codeInput.addEventListener('input', updateCompletedCoursesDatalist);
    if (nameInput) nameInput.addEventListener('input', updateCompletedCoursesDatalist);

    container.appendChild(row);
}

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

function showEmptySubstitutionHint() {
    const container = document.getElementById('substitutionRowsList');
    if (!container) return;
    if (container.querySelectorAll('.substitution-row').length === 0) {
        container.innerHTML = '<p class="hint empty-subs-hint" style="margin: 0.4rem 0;">No substitutions added. Click "Add Substitution" to replace a core course or named basket course with an alternate course.</p>';
    }
}

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

    const coreInput = row.querySelector('.sub-core-code');
    if (coreInput) {
        coreInput.addEventListener('focus', updateCurriculumCoursesDatalist);
    }

    const replInput = row.querySelector('.sub-repl-code');
    if (replInput) {
        replInput.addEventListener('focus', updateCompletedCoursesDatalist);
    }

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

function updateDatalists() {
    updateCurriculumCoursesDatalist();
    updateCompletedCoursesDatalist();
}

function updateCurriculumCoursesDatalist() {
    const datalist = document.getElementById('curriculumCoursesDatalist');
    const legacyDatalist = document.getElementById('coreCoursesDatalist');
    const curr = getCurrentCurriculum();
    if (!curr) return;

    const options = [];
    const seen = new Set();

    // 1. Core courses
    if (curr.coreCourses) {
        Object.keys(curr.coreCourses).forEach(code => {
            const info = curr.coreCourses[code];
            seen.add(code);
            options.push(`<option value="${code}">${code} - ${escapeHtml(info.name || code)} (Core)</option>`);
        });
    }

    // 2. Named courses in baskets / requirements
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

function updateCoreCoursesDatalist() {
    updateCurriculumCoursesDatalist();
}

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

function renderResults(results) {
    const tbody = document.querySelector('#summaryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const detailsSection = document.getElementById('detailsSection');
    if (detailsSection) detailsSection.innerHTML = '';

    const allSections = [
        { id: 'core', data: results.core, isCore: true },
        ...Object.keys(results.reqs).map(key => ({ id: key, data: results.reqs[key], isCore: false }))
    ];

    allSections.forEach(section => {
        const req = section.data;
        
        let isCompleted = false;
        let targetText = "";
        let completedText = "";

        if (section.isCore) {
            const neededCredits = req.neededCredits !== undefined ? req.neededCredits : req.needed;
            const appliedCredits = req.appliedCredits !== undefined ? req.appliedCredits : 0;
            const neededCourses = req.neededCourses !== undefined ? req.neededCourses : (req.coursesUsed ? req.coursesUsed.length : 0);
            const appliedCourses = req.appliedCourses !== undefined ? req.appliedCourses : (req.coursesUsed ? req.coursesUsed.filter(c => c.isCompleted).length : 0);

            const creditsComplete = appliedCredits >= neededCredits;
            const coursesComplete = appliedCourses >= neededCourses;
            isCompleted = creditsComplete && coursesComplete;

            targetText = `<div class="metric-val">${neededCredits} Credits</div><div class="metric-sub">(${neededCourses} Courses)</div>`;
            completedText = `<div class="metric-val">${appliedCredits} Credits</div><div class="metric-sub">(${appliedCourses} Courses)</div>`;
        } else {
            let creditsComplete = req.applied >= req.needed;
            let coursesComplete = req.minCourses ? (req.coursesUsed.length >= req.minCourses) : true;
            
            isCompleted = creditsComplete && coursesComplete;
            targetText = `<div class="metric-val">${req.needed} Credits</div>`;
            completedText = `<div class="metric-val">${req.applied} Credits</div>`;
            
            if (req.minCourses) {
                targetText += `<div class="metric-sub">(Min ${req.minCourses} Courses)</div>`;
                completedText += `<div class="metric-sub">(${req.coursesUsed.length} Courses)</div>`;
            }
        }

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
                <span class="badge ${isCompleted ? 'badge-pass' : 'badge-fail'}">
                    ${isCompleted ? 'Complete' : 'Incomplete'}
                </span>
            </td>
        `;
        
        tr.addEventListener('click', () => toggleDetails(section.id));
        tr.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDetails(section.id);
            }
        });

        tbody.appendChild(tr);

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

function toggleDetails(sectionId) {
    const target = document.getElementById(`detail-${sectionId}`);
    const isCurrentlyHidden = target ? target.classList.contains('hidden') : true;

    document.querySelectorAll('.detail-card').forEach(card => {
        card.classList.add('hidden');
    });

    document.querySelectorAll('#summaryTable tbody tr').forEach(row => {
        row.classList.remove('selected-row');
    });

    if (target && isCurrentlyHidden) {
        target.classList.remove('hidden');
        const activeRow = document.querySelector(`#summaryTable tbody tr[data-section="${sectionId}"]`);
        if (activeRow) {
            activeRow.classList.add('selected-row');
        }
    }
}