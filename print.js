/**
 * A4 Printable & PDF Compliance Report Generator
 *
 * Dedicated module responsible for formatting, paginating, and generating
 * print-ready compliance reports optimized for physical A4 printing and PDF export.
 *
 * Features:
 * - Page 1: Formal title header, generation timestamp, metadata summary, and
 *   a vertically centered "Summary by Requirement" status table.
 * - Page 2: Section 2 heading and complete mandatory core courses breakdown.
 * - Pages 3+: Elective requirement baskets and approved course substitutions,
 *   dynamically paginated with a conservative row budget to avoid awkward breaks.
 * - Running footers on every page with calculated "Page X of Y" counters.
 * - Global interception of Ctrl+P / Cmd+P to invoke this custom printable view.
 */

/**
 * Escapes special HTML characters to prevent XSS injection in generated print templates.
 * Uses global escapeHtml from ui.js if available, with a local regex fallback.
 *
 * @param {string} str - Raw input string.
 * @returns {string} HTML-escaped safe string.
 */
function escapePrintHtml(str) {
    if (typeof escapeHtml === 'function') {
        return escapeHtml(str);
    }
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Resolves the official full display name for a curriculum.
 * Prioritizes the loaded curriculum's fullName property, falling back to dropdown
 * option text, catalog registry metadata, or the raw identifier.
 *
 * @param {string} currId - Curriculum identifier (e.g. 'ee_btech').
 * @returns {string} Human-friendly curriculum display title.
 */
function getCurriculumDisplayName(currId) {
    const curr = (typeof getCurrentCurriculum === 'function' ? getCurrentCurriculum() : null) || (typeof curricula !== 'undefined' ? curricula[currId] : null);
    if (curr && (curr.fullName || curr.name)) return curr.fullName || curr.name;
    const select = document.getElementById('curriculumSelect');
    if (select?.selectedOptions?.[0]) {
        return select.selectedOptions[0].text;
    }
    if (typeof curriculaList !== 'undefined' && Array.isArray(curriculaList)) {
        const found = curriculaList.find(c => c.id === currId);
        if (found) return found.name || found.id;
    }
    return currId || "Curriculum";
}

/**
 * Renders the standardized running footer for an A4 print page.
 * Displays unofficial report disclaimer, author credits, and explicit page numbers.
 *
 * @param {number} pageNum - Current 1-based page number.
 * @param {number} totalP - Total calculated page count.
 * @returns {string} HTML string for the page footer container.
 */
function renderPrintFooter(pageNum, totalP) {
    return `
        <div class="print-page-footer">
            <span>Credit Completion Status (Unofficial)</span>
            <span>Designed by AR &nbsp;|&nbsp; Page ${pageNum} of ${totalP}</span>
        </div>
    `;
}

/**
 * Renders an individual requirement category card with its course breakdown table for print.
 * Supports splitting long elective categories across multiple pages via chunking.
 *
 * @param {Object} section - Section wrapper { id, data, isCore }.
 * @param {number} idx - Sequential section index.
 * @param {Array<Object>} coursesSubset - Subset of courses to render in this table.
 * @param {string} [partLabel=''] - Optional multi-part label (e.g. " (Part 1 of 2)").
 * @param {number} [startIdx=null] - 1-based start index of courses rendered in this chunk.
 * @param {number} [endIdx=null] - 1-based end index of courses rendered in this chunk.
 * @returns {string} HTML markup for the category card.
 */
function renderPrintCategoryCard(section, idx, coursesSubset, partLabel = '', startIdx = null, endIdx = null) {
    const req = section.data;
    let reqPending = 0;
    let reqIsCompleted = false;
    let targetSummary = "";

    // Calculate requirement targets and completion status
    if (section.isCore) {
        const neededCr = req.neededCredits !== undefined ? req.neededCredits : req.needed;
        const appliedCr = req.appliedCredits !== undefined ? req.appliedCredits : 0;
        const neededCo = req.neededCourses !== undefined ? req.neededCourses : 0;
        const appliedCo = req.appliedCourses !== undefined ? req.appliedCourses : 0;
        reqIsCompleted = appliedCr >= neededCr && appliedCo >= neededCo;
        reqPending = Math.max(0, neededCr - appliedCr);
        targetSummary = `Requirement: ${neededCr} Credits (${neededCo} Courses) | Applied: ${appliedCr} Credits (${appliedCo} Courses)`;
    } else {
        const creditsOk = req.applied >= req.needed;
        const coursesOk = req.minCourses ? (req.coursesUsed.length >= req.minCourses) : true;
        reqIsCompleted = creditsOk && coursesOk;
        reqPending = Math.max(0, req.needed - req.applied);
        targetSummary = `Requirement: ${req.needed} Credits${req.minCourses ? ` (Min ${req.minCourses} Courses)` : ''} | Applied: ${req.applied} Credits (${req.coursesUsed.length} Courses)`;
    }

    // Append chunk range indicator if category has been paginated into multiple parts
    if (startIdx && endIdx && section.data.coursesUsed && section.data.coursesUsed.length > coursesSubset.length) {
        targetSummary += ` | Showing courses ${startIdx} to ${endIdx} of ${section.data.coursesUsed.length}`;
    }

    let html = `
        <div class="print-category-card">
            <div class="print-category-header">
                <span class="print-category-title">${idx + 1}. ${escapePrintHtml(req.name)}${partLabel}</span>
                <span class="print-category-status">
                    <span class="print-badge ${reqIsCompleted ? 'print-badge-pass' : 'print-badge-fail'}">${reqIsCompleted ? 'Complete' : 'Incomplete'}</span>
                    <span class="print-pending-text">(${reqPending} pending)</span>
                </span>
            </div>
            <div style="font-size: 7.5pt; color: #555; margin-bottom: 3pt;">${escapePrintHtml(targetSummary)}</div>
    `;

    // Render course rows or placeholder if empty
    if (!coursesSubset || coursesSubset.length === 0) {
        html += `<p class="print-empty-hint">No courses applied to this requirement yet.</p>`;
    } else {
        html += `
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: ${section.isCore ? '13%' : '14%'};">Code</th>
                        <th style="width: ${section.isCore ? '37%' : '44%'};">Course Name</th>
                        <th style="width: 14%; text-align: center;">Credits Applied</th>
                        ${section.isCore ? '<th style="width: 12%; text-align: center;">Intended Sem</th>' : ''}
                        <th style="width: ${section.isCore ? '12%' : '14%'}; text-align: center;">Completed Sem</th>
                        <th style="width: ${section.isCore ? '12%' : '14%'}; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        coursesSubset.forEach(c => {
            html += `
                <tr>
                    <td><strong>${escapePrintHtml(c.code)}</strong></td>
                    <td>${escapePrintHtml(c.name)}</td>
                    <td style="text-align: center;">${c.creditsApplied}</td>
                    ${section.isCore ? `<td style="text-align: center;">${c.intendedSem || '-'}</td>` : ''}
                    <td style="text-align: center;">${c.completedSem !== "-" ? c.completedSem : "-"}</td>
                    <td style="text-align: center;"><span class="print-badge ${c.isCompleted ? 'print-badge-pass' : 'print-badge-fail'}">${escapePrintHtml(c.note)}</span></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Renders the Course Substitutions table card for the print breakdown view.
 *
 * @param {Array<Object>} substitutions - List of substitutions { origCode, replCode }.
 * @returns {string} HTML markup for the substitutions card or empty string if no substitutions.
 */
function renderPrintSubstitutionsCard(substitutions) {
    if (!substitutions || substitutions.length === 0) return '';
    let html = `
        <div class="print-category-card">
            <div class="print-category-header">
                <span class="print-category-title">Course Substitutions</span>
            </div>
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Original Course Code</th>
                        <th style="width: 50%;">Replacement Course Code</th>
                    </tr>
                </thead>
                <tbody>
    `;
    substitutions.forEach(s => {
        const orig = (s.origCode || s.coreCode || '').trim().toUpperCase();
        const repl = (s.replacementCode || s.replCode || '').trim().toUpperCase();
        if (orig && repl) {
            html += `
                <tr>
                    <td><strong>${escapePrintHtml(orig)}</strong></td>
                    <td><strong>${escapePrintHtml(repl)}</strong></td>
                </tr>
            `;
        }
    });
    html += `
                </tbody>
            </table>
        </div>
    `;
    return html;
}

/**
 * Builds and renders the complete multi-page printable HTML report into #printReportView.
 *
 * Pagination strategy:
 * - Page 1: Standalone summary with title header and vertically centered requirement overview.
 * - Page 2: Dedicated to Section 2 title and complete Core Courses list.
 * - Pages 3+: Electives and substitutions grouped using a conservative row cost budget
 *   (MAX_BUDGET = 26) to prevent overflow or orphaned footers.
 *
 * @param {Object} [overrideCurr] - Optional curriculum object to use instead of active selection.
 */
function populatePrintReport(overrideCurr) {
    const printContainer = document.getElementById('printReportView');
    if (!printContainer) return;

    // Resolve curriculum definition
    const curr = overrideCurr || (typeof getCurrentCurriculum === 'function' ? getCurrentCurriculum() : null);
    if (!curr) return;

    // Gather completed courses and active substitutions
    let courses = typeof currentCourses !== 'undefined' ? currentCourses : [];
    if ((!courses || courses.length === 0) && typeof getCoursesFromEditor === 'function') {
        courses = getCoursesFromEditor();
    }

    let subs = typeof currentSubstitutions !== 'undefined' ? currentSubstitutions : [];
    if ((!subs || subs.length === 0) && typeof getSubstitutionsFromEditor === 'function') {
        subs = getSubstitutionsFromEditor();
    }

    // Run compliance calculations
    const { results } = calculateCompliance(courses, curr, subs);
    const currDisplayName = getCurriculumDisplayName(curr.id);
    const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Compute cumulative credit totals and overall degree completion state
    const coreNeeded = results.core.neededCredits !== undefined ? results.core.neededCredits : results.core.needed;
    const coreApplied = results.core.appliedCredits !== undefined ? results.core.appliedCredits : 0;
    const coreNeededCourses = results.core.neededCourses !== undefined ? results.core.neededCourses : (results.core.coursesUsed ? results.core.coursesUsed.length : 0);
    const coreAppliedCourses = results.core.appliedCourses !== undefined ? results.core.appliedCourses : (results.core.coursesUsed ? results.core.coursesUsed.filter(c => c.isCompleted).length : 0);
    const corePending = Math.max(0, coreNeeded - coreApplied);
    const coreComplete = coreApplied >= coreNeeded && coreAppliedCourses >= coreNeededCourses;

    let totalNeededCredits = coreNeeded;
    let totalAppliedCredits = coreApplied;
    let allComplete = coreComplete;
    let totalPendingCredits = corePending;

    const reqKeys = Object.keys(results.reqs || {});
    reqKeys.forEach(k => {
        const req = results.reqs[k];
        totalNeededCredits += (req.needed || 0);
        totalAppliedCredits += (req.applied || 0);
        const reqPending = Math.max(0, (req.needed || 0) - (req.applied || 0));
        totalPendingCredits += reqPending;
        const reqCoursesComplete = req.minCourses ? (req.coursesUsed.length >= req.minCourses) : true;
        if (req.applied < req.needed || !reqCoursesComplete) {
            allComplete = false;
        }
    });

    const allSections = [
        { id: 'core', data: results.core, isCore: true },
        ...reqKeys.map(key => ({ id: key, data: results.reqs[key], isCore: false }))
    ];

    // Build summary rows for Page 1 overview table
    let summaryRowsHtml = '';
    allSections.forEach(section => {
        const req = section.data;
        let isCompleted = false;
        let targetText = "";
        let completedText = "";
        let pending = 0;

        if (section.isCore) {
            const neededCr = req.neededCredits !== undefined ? req.neededCredits : req.needed;
            const appliedCr = req.appliedCredits !== undefined ? req.appliedCredits : 0;
            const neededCo = req.neededCourses !== undefined ? req.neededCourses : 0;
            const appliedCo = req.appliedCourses !== undefined ? req.appliedCourses : 0;
            isCompleted = appliedCr >= neededCr && appliedCo >= neededCo;
            pending = Math.max(0, neededCr - appliedCr);
            targetText = `${neededCr} Credits (${neededCo} Courses)`;
            completedText = `${appliedCr} Credits (${appliedCo} Courses)`;
        } else {
            const creditsOk = req.applied >= req.needed;
            const coursesOk = req.minCourses ? (req.coursesUsed.length >= req.minCourses) : true;
            isCompleted = creditsOk && coursesOk;
            pending = Math.max(0, req.needed - req.applied);
            targetText = `${req.needed} Credits${req.minCourses ? ` (Min ${req.minCourses} Courses)` : ''}`;
            completedText = `${req.applied} Credits${req.minCourses ? ` (${req.coursesUsed.length} Courses)` : ''}`;
        }

        summaryRowsHtml += `
            <tr>
                <td><strong>${escapePrintHtml(req.name)}</strong></td>
                <td style="text-align: center;">${targetText}</td>
                <td style="text-align: center;">${completedText}</td>
                <td style="text-align: center;">
                    <span class="print-badge ${isCompleted ? 'print-badge-pass' : 'print-badge-fail'}">
                        ${isCompleted ? 'Complete' : 'Incomplete'}
                    </span>
                    <span class="print-pending-text">(${pending} pending)</span>
                </td>
            </tr>
        `;
    });

    // Page 2: Dedicated Core Courses table
    const coreSection = allSections[0];
    const coreCoursesList = (coreSection && coreSection.data) ? (coreSection.data.coursesUsed || []) : [];
    const coreCardHtml = renderPrintCategoryCard(coreSection, 0, coreCoursesList, '');

    // Pages 3+: Chunk long elective categories and collect printable cards
    const electiveCards = [];
    allSections.slice(1).forEach((section, idx) => {
        const coursesList = section.data.coursesUsed || [];
        const CHUNK_SIZE = 22; // Maximum courses per sub-table chunk
        if (coursesList.length > CHUNK_SIZE) {
            const numChunks = Math.ceil(coursesList.length / CHUNK_SIZE);
            const perChunk = Math.ceil(coursesList.length / numChunks);
            for (let i = 0; i < coursesList.length; i += perChunk) {
                const chunk = coursesList.slice(i, i + perChunk);
                const partNum = Math.floor(i / perChunk) + 1;
                const partLabel = ` (Part ${partNum} of ${numChunks})`;
                electiveCards.push({
                    html: renderPrintCategoryCard(section, idx + 1, chunk, partLabel, i + 1, Math.min(i + chunk.length, coursesList.length)),
                    cost: 3 + chunk.length
                });
            }
        } else {
            electiveCards.push({
                html: renderPrintCategoryCard(section, idx + 1, coursesList, ''),
                cost: 3 + Math.max(1, coursesList.length)
            });
        }
    });

    // Append course substitutions card if substitutions exist
    if (subs && subs.length > 0) {
        electiveCards.push({
            html: renderPrintSubstitutionsCard(subs),
            cost: 3 + subs.length
        });
    }

    // Dynamic pagination algorithm grouping elective cards into pages
    const MAX_BUDGET = 26; // Total line height units allowed per page
    const electivePages = [];
    let currentPageCards = [];
    let currentBudget = 0;

    electiveCards.forEach(item => {
        if (currentPageCards.length > 0 && (currentBudget + item.cost > MAX_BUDGET)) {
            electivePages.push(currentPageCards);
            currentPageCards = [item];
            currentBudget = item.cost;
        } else {
            currentPageCards.push(item);
            currentBudget += item.cost;
        }
    });
    if (currentPageCards.length > 0) {
        electivePages.push(currentPageCards);
    }

    // Sequence breakdown pages starting from Page 2
    const breakdownPages = [
        { html: `<h2 class="print-section-heading">2. Detailed Breakdown by Requirement</h2>${coreCardHtml}` },
        ...electivePages.map(pageItems => ({
            html: pageItems.map(item => item.html).join('')
        }))
    ];

    const totalPages = 1 + breakdownPages.length;

    // Assemble Page 1 markup
    let fullHtml = `
        <div class="print-page">
            <div class="print-page-content">
                <div class="print-report-header">
                    <h1 class="print-report-title">Credit Completion Status</h1>
                    <div class="print-report-date">Generated: ${escapePrintHtml(dateStr)}</div>
                    <div class="print-header-spacing"></div>
                    <div class="print-report-meta">
                        <span><strong>Curriculum:</strong> ${escapePrintHtml(currDisplayName)}</span>
                        <span><strong>Overall Status:</strong> ${allComplete ? '<span class="print-badge print-badge-pass">Complete</span>' : '<span class="print-badge print-badge-fail">Incomplete</span>'} (${totalPendingCredits} pending)</span>
                        <span><strong>Credits:</strong> ${totalAppliedCredits} / ${totalNeededCredits}</span>
                        <span><strong>Courses Completed:</strong> ${courses.length}</span>
                    </div>
                </div>

                <div class="print-summary-content">
                    <h2 class="print-section-heading print-summary-heading">1. Summary by Requirement</h2>
                    <table class="print-table print-summary-table">
                        <thead>
                            <tr>
                                <th style="width: 36%;">Requirement</th>
                                <th style="width: 20%; text-align: center;">Target</th>
                                <th style="width: 20%; text-align: center;">Completed</th>
                                <th style="width: 24%; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summaryRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
            ${renderPrintFooter(1, totalPages)}
        </div>
    `;

    // Assemble Breakdown Pages (Page 2 to totalPages)
    breakdownPages.forEach((pageItem, pageIdx) => {
        const pageNumber = pageIdx + 2;
        fullHtml += `
            <div class="print-page">
                <div class="print-page-content">
                    ${pageItem.html}
                </div>
                ${renderPrintFooter(pageNumber, totalPages)}
            </div>
        `;
    });

    // Inject compiled document into the print container
    printContainer.innerHTML = fullHtml;
}

/**
 * Validates prerequisites, compiles the print document, and opens the system print / PDF dialog.
 */
async function triggerPdfDownload() {
    let curr = typeof getCurrentCurriculum === 'function' ? getCurrentCurriculum() : null;
    if (!curr && typeof loadCurriculum === 'function') {
        const select = document.getElementById('curriculumSelect');
        const selectedId = select ? select.value : 'ee_btech';
        try {
            curr = await loadCurriculum(selectedId);
        } catch (e) {
            console.error('Failed to load curriculum for print:', e);
        }
    }

    let courses = typeof currentCourses !== 'undefined' ? currentCourses : [];
    if ((!courses || courses.length === 0) && typeof getCoursesFromEditor === 'function') {
        courses = getCoursesFromEditor();
    }

    // Require completed courses before generating PDF
    if (!courses || courses.length === 0) {
        if (typeof showEditorNotice === 'function') {
            showEditorNotice("Please enter your completed courses before downloading compliance PDF.", 'notice');
        }
        return;
    }

    populatePrintReport(curr);
    window.print();
}

// Global print event listeners
// Intercept Ctrl+P / Cmd+P to execute our structured A4 report instead of default page print
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerPdfDownload();
    }
});

// Update print report immediately prior to printing (e.g. if user clicked browser Print menu)
window.addEventListener('beforeprint', () => {
    populatePrintReport();
});
