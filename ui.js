let currentCourses = [];

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
        if (currentCourses && currentCourses.length > 0) {
            runCompliance(currentCourses, getCurrentCurriculum());
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
    const modifyBtn = document.getElementById('modifyCoursesBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    if (screen === 'summary') {
        editorScreen.classList.add('hidden');
        summaryScreen.classList.remove('hidden');
        if (modifyBtn) modifyBtn.classList.remove('hidden');
    } else {
        editorScreen.classList.remove('hidden');
        summaryScreen.classList.add('hidden');
        if (modifyBtn) modifyBtn.classList.add('hidden');
        if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
            const hasSaved = currentCourses && currentCourses.length > 0;
            cancelBtn.disabled = !hasSaved;
            cancelBtn.title = hasSaved ? "Return to compliance summary" : "No saved compliance summary available yet";
        }
    }
}

function loadInitialState() {
    const savedCourses = loadCoursesFromCookie();

    if (savedCourses && Array.isArray(savedCourses) && savedCourses.length > 0) {
        currentCourses = savedCourses;
        runCompliance(currentCourses, getCurrentCurriculum());
        showScreen('summary');
    } else {
        currentCourses = [];
        populateEditorRows([]);
        showScreen('editor');
    }
}

/* =========================================================
   COURSE EDITOR (Direct Addition & Modification)
   ========================================================= */
function setupEditorControls() {
    const modifyBtn = document.getElementById('modifyCoursesBtn');
    if (modifyBtn) {
        modifyBtn.addEventListener('click', () => {
            populateEditorRows(currentCourses);
            showScreen('editor');
        });
    }

    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
            addCourseRow();
            const rows = document.querySelectorAll('#courseRowsList .course-row');
            if (rows.length > 0) {
                rows[rows.length - 1].querySelector('.row-code').focus();
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
                    if (!Array.isArray(parsed)) {
                        throw new Error("JSON file must contain an array of course objects.");
                    }
                    // Directly populate courses from JSON into editor rows
                    populateEditorRows(parsed, /* append = */ false);
                    showEditorNotice(`Loaded ${parsed.length} course(s) from JSON. Review or edit, then click 'Save & Calculate Compliance'.`, 'notice');
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

            try {
                const dataStr = JSON.stringify(courses, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "completed_courses.json";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                showEditorNotice(`Downloaded ${courses.length} course(s) to completed_courses.json.`, 'notice');
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

            currentCourses = courses;
            saveCoursesToCookie(currentCourses);

            const curr = getCurrentCurriculum();
            runCompliance(currentCourses, curr);
            showScreen('summary');
        });
    }

    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (currentCourses && currentCourses.length > 0) {
                showScreen('summary');
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

    const standardCats = ['P', 'S', 'E', 'H', 'G', 'ANY'];
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
    });
    closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.remove();
            if (document.querySelectorAll('#courseRowsList .course-row').length === 0) {
                addCourseRow();
            }
        }
    });

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

/* =========================================================
   COMPLIANCE LOGIC & RENDERING
   ========================================================= */
function runCompliance(userCourses, curr) {
    const curriculumToUse = curr || getCurrentCurriculum();
    if (!curriculumToUse) {
        console.error("No curriculum available for compliance check.");
        return;
    }

    const { results, messages } = calculateCompliance(userCourses, curriculumToUse);
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
            isCompleted = req.applied >= req.needed;
            targetText = `<div class="metric-val">${req.needed} Courses</div>`;
            completedText = `<div class="metric-val">${req.applied} Courses</div>`;
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

        const unitLabel = section.isCore ? 'Courses' : 'Credits';

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
                                <th scope="col">${unitLabel} Applied</th>
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