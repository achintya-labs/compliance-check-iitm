/**
 * Academic Compliance & Credit Evaluation Engine
 * 
 * Evaluates completed student course records against degree requirements,
 * core curriculum mandates, elective baskets, course substitutions, and
 * credit waterfall rules.
 */

/**
 * Calculates academic compliance for a student's completed courses against a selected curriculum.
 *
 * @param {Array<Object>} userCourses - List of student course objects with properties:
 *                                      code, name, credits, category, semester.
 * @param {Object} curriculum - Curriculum rules object containing:
 *                              coreCourses: Dictionary of mandatory core courses.
 *                              requirements: Ordered array of elective requirement baskets.
 * @param {Array<Object>} [substitutions=[]] - Array of approved course substitution pairs:
 *                                             origCode / coreCode, replacementCode / replCode.
 * @returns {{results: Object, messages: Array<Object>}} An object containing:
 *          - results: Detailed status for 'core' and all 'reqs' baskets.
 *          - messages: Notices, warnings, and error messages generated during evaluation.
 */
function calculateCompliance(userCourses, curriculum, substitutions = []) {
    // Array to capture informational notices and warnings during processing
    let messages = [];
    
    // Deep-clone user courses into an evaluation pool to track credit consumption state
    let pool = userCourses.map(c => {
        let clonedCourse = { ...c };
        
        // Enforce authoritative curriculum credits for mandatory core courses
        if (curriculum.coreCourses.hasOwnProperty(clonedCourse.code)) {
            const coreInfo = curriculum.coreCourses[clonedCourse.code];
            
            // If user's input credits differ from curriculum definition, override and log warning
            if (clonedCourse.credits !== coreInfo.credits) {
                messages.push({
                    type: 'warning',
                    text: `Mismatch in ${clonedCourse.code}: User JSON specified ${clonedCourse.credits} credits. Forced to curriculum standards: ${coreInfo.credits} credits.`
                });
                clonedCourse.credits = coreInfo.credits;
            }
        }
        
        // Initialize mutable tracking fields for credit allocation and waterfalling
        clonedCourse.remainingCredits = clonedCourse.credits;
        clonedCourse.consumed = false;
        clonedCourse.waterfalledTo = null;
        return clonedCourse;
    });

    /**
     * Determines whether a course is eligible to satisfy requirements.
     * Zero-credit courses (e.g. Life Skills, NSS) remain available until consumed.
     *
     * @param {Object} c - The candidate course in the evaluation pool.
     * @returns {boolean} True if the course has unallocated credits or is unconsumed zero-credit.
     */
    function isCourseAvailable(c) {
        if (c.consumed) return false;
        if (c.credits === 0) return true;
        return c.remainingCredits > 0;
    }

    // Normalize user-defined course substitutions into standard uppercase {origCode, replCode} objects
    const validSubs = Array.isArray(substitutions) ? substitutions.filter(s => {
        const orig = (s.origCode || s.coreCode || '').trim().toUpperCase();
        const repl = (s.replacementCode || s.replCode || '').trim().toUpperCase();
        return orig && repl;
    }).map(s => ({
        origCode: (s.origCode || s.coreCode || '').trim().toUpperCase(),
        replCode: (s.replacementCode || s.replCode || '').trim().toUpperCase()
    })) : [];

    // Track which substitution rules have been matched to identify any unused mappings
    const handledSubs = new Set();

    // Sum total mandatory core credits required by the curriculum
    let totalCoreCredits = 0;
    Object.values(curriculum.coreCourses).forEach(info => {
        totalCoreCredits += (info.credits || 0);
    });

    // Initialize the compliance results structure
    let results = {
        core: {
            name: "Core Courses",
            neededCredits: totalCoreCredits,
            appliedCredits: 0,
            neededCourses: Object.keys(curriculum.coreCourses).length,
            appliedCourses: 0,
            needed: totalCoreCredits,
            applied: 0,
            coursesUsed: []
        },
        reqs: {}
    };

    /* ------------------------------------------------------------------
       STEP 1: Evaluate Mandatory Core Courses
       ------------------------------------------------------------------ */
    Object.keys(curriculum.coreCourses).forEach(coreCode => {
        const coreInfo = curriculum.coreCourses[coreCode];

        // Check if an approved substitution is mapped for this core course
        const sub = validSubs.find(s => s.origCode === coreCode);
        const replCode = sub ? sub.replCode : null;

        // Locate replacement course in student pool if substitution exists
        const replCourseIndex = replCode ? pool.findIndex(c => c.code === replCode && isCourseAvailable(c)) : -1;
        
        // Locate directly completed core course (accounting for historical ME1100 -> ME3100 equivalence)
        const userCourseIndex = pool.findIndex(c => (c.code === coreCode || (coreCode === 'ME1100' && c.code === 'ME3100')) && isCourseAvailable(c));

        if (replCode && replCourseIndex !== -1) {
            // Case 1A: Satisfied via approved course substitution
            const replCourse = pool[replCourseIndex];
            results.core.appliedCourses += 1;
            results.core.appliedCredits += coreInfo.credits;
            results.core.applied = results.core.appliedCredits;
            results.core.coursesUsed.push({
                code: coreCode,
                name: coreInfo.name || replCourse.name,
                creditsApplied: coreInfo.credits,
                intendedSem: coreInfo.semester,
                completedSem: replCourse.semester,
                isCompleted: true,
                note: `${replCourse.code} substituted`
            });
            // Mark the replacement course fully consumed so it cannot satisfy elective baskets
            replCourse.remainingCredits = 0;
            replCourse.consumed = true;
            messages.push({
                type: 'notice',
                text: `${coreCode} (${coreInfo.name || coreCode}) satisfied by alternate course ${replCourse.code} (${replCourse.name}). ${replCourse.code} cannot count towards other sections.`
            });
            handledSubs.add(sub);
        } else if (userCourseIndex !== -1) {
            // Case 1B: Satisfied directly by taking the mandatory core course
            const userCourse = pool[userCourseIndex];
            results.core.appliedCourses += 1;
            results.core.appliedCredits += coreInfo.credits;
            results.core.applied = results.core.appliedCredits;
            results.core.coursesUsed.push({
                code: userCourse.code,
                name: coreInfo.name || userCourse.name,
                creditsApplied: coreInfo.credits,
                intendedSem: coreInfo.semester,
                completedSem: userCourse.semester,
                isCompleted: true,
                note: "Complete"
            });
            // Consume the core course
            userCourse.remainingCredits = 0;
            userCourse.consumed = true;
            if (sub) handledSubs.add(sub);
        } else {
            // Case 1C: Core course pending / incomplete
            results.core.coursesUsed.push({
                code: coreCode,
                name: coreInfo.name || "Pending...", 
                creditsApplied: 0,
                intendedSem: coreInfo.semester,
                completedSem: "-",
                isCompleted: false,
                note: "Incomplete"
            });
            // Warn if student configured a substitution but has not completed the replacement
            if (replCode) {
                messages.push({
                    type: 'warning',
                    text: `Substitution set: Core course ${coreCode} is mapped to replacement ${replCode}, but ${replCode} was not found in completed courses.`
                });
                handledSubs.add(sub);
            }
        }
    });

    /* ------------------------------------------------------------------
       STEP 2: Evaluate Elective Requirement Baskets (Ordered Sequence)
       ------------------------------------------------------------------ */
    curriculum.requirements.forEach(req => {
        results.reqs[req.id] = {
            name: req.name,
            needed: req.minCredits,
            minCourses: req.minCourses, // Optional constraint: minimum distinct courses required
            applied: 0,
            coursesUsed: []
        };

        // 2A: Process substitutions specifically targeting named courses in this basket
        if (req.matchType === 'in_list' && Array.isArray(req.matchValue)) {
            const basketSubs = validSubs.filter(s => req.matchValue.includes(s.origCode) && !handledSubs.has(s));

            basketSubs.forEach(sub => {
                const replCourseIndex = pool.findIndex(c => c.code === sub.replCode && isCourseAvailable(c));
                if (replCourseIndex !== -1) {
                    const replCourse = pool[replCourseIndex];
                    let creditsNeededForReq = Math.max(0, req.minCredits - results.reqs[req.id].applied);
                    let coursesNeededForReq = req.minCourses ? req.minCourses - results.reqs[req.id].coursesUsed.length : 0;

                    // Allocate credit up to requirement cap or course availability
                    let take = Math.min(creditsNeededForReq, replCourse.remainingCredits);
                    if (take === 0 && creditsNeededForReq <= 0 && coursesNeededForReq > 0) {
                        take = 0;
                    } else if (take === 0 && req.minCredits === 0) {
                        take = replCourse.remainingCredits;
                    }

                    results.reqs[req.id].applied += take;
                    replCourse.remainingCredits = 0; // Substituted elective cannot count elsewhere
                    replCourse.consumed = true;

                    results.reqs[req.id].coursesUsed.push({
                        code: replCourse.code,
                        name: replCourse.name,
                        creditsApplied: take,
                        completedSem: replCourse.semester,
                        isCompleted: true,
                        note: `${sub.origCode} substituted`
                    });

                    messages.push({
                        type: 'notice',
                        text: `${sub.origCode} in ${req.name} satisfied by alternate course ${replCourse.code} (${replCourse.name}). ${replCourse.code} cannot count towards other sections.`
                    });
                    handledSubs.add(sub);
                } else {
                    messages.push({
                        type: 'warning',
                        text: `Substitution set: Course ${sub.origCode} in ${req.name} is mapped to replacement ${sub.replCode}, but ${sub.replCode} was not found in completed courses.`
                    });
                    handledSubs.add(sub);
                }
            });
        }

        // 2B: Match and allocate standard student courses to this requirement basket
        pool.forEach(course => {
            if (isCourseAvailable(course) && matchesRequirement(course, req)) {
                
                let creditsNeededForReq = req.minCredits - results.reqs[req.id].applied;
                let coursesNeededForReq = req.minCourses ? req.minCourses - results.reqs[req.id].coursesUsed.length : 0;
                
                // Determine credit allocation: capped at what is needed for this basket
                let take = Math.max(0, Math.min(creditsNeededForReq, course.remainingCredits));

                // Apply course if it provides needed credits OR satisfies course count constraint
                if (take > 0 || coursesNeededForReq > 0) {
                    results.reqs[req.id].applied += take;
                    course.remainingCredits -= take;
                    if (course.credits === 0 || course.remainingCredits <= 0) {
                        course.consumed = true;
                    }
                    
                    // Human-readable status label describing how credits were utilized
                    let noteText = "Full Credit";
                    if (course.credits === 0) noteText = "Complete";
                    else if (take > 0 && take < course.credits) noteText = `Split (${take} used here)`;
                    else if (take === 0) noteText = "Course Req Only";

                    results.reqs[req.id].coursesUsed.push({
                        code: course.code,
                        name: course.name,
                        creditsApplied: take,
                        completedSem: course.semester,
                        isCompleted: true,
                        note: noteText
                    });
                }

                // If course has leftover credits and basket defines a waterfall target, route leftovers
                if (course.remainingCredits > 0 && req.waterfallTo) {
                    course.waterfalledTo = req.waterfallTo;
                }
            }
        });
    });

    /* ------------------------------------------------------------------
       STEP 3: Post-processing Audits and Leftover Detection
       ------------------------------------------------------------------ */
    // Check for substitutions configured by the student that did not match any core or basket course
    validSubs.forEach(sub => {
        if (!handledSubs.has(sub)) {
            messages.push({
                type: 'warning',
                text: `Substitution set: Course ${sub.origCode} is mapped to ${sub.replCode}, but ${sub.origCode} was not found as a core course or named course in any elective basket.`
            });
        }
    });

    // Detect non-core courses with leftover credits after all baskets have been fulfilled
    const leftovers = pool.filter(c => !c.consumed && c.remainingCredits > 0 && !curriculum.coreCourses.hasOwnProperty(c.code));
    if (leftovers.length > 0) {
        messages.push({
            type: 'notice',
            text: `${leftovers.length} elective course(s) have unapplied credits. They exceeded all requirement targets.`
        });
    }

    return { results, messages };
}

/**
 * Evaluates whether a course matches an elective requirement basket's criteria.
 *
 * Supports multiple matching paradigms:
 * - 'level_or_above': Department prefix and numeric course level threshold (e.g. EE 5000+).
 * - 'in_list': Explicit array of eligible course codes.
 * - 'startsWith': Course code prefix pattern (e.g. 'MA' or 'ID1300').
 * - 'category': Course category single-letter code matching (e.g. 'P', 'H', 'S', 'G').
 * - Waterfall redirection: Courses whose surplus credits were routed to this requirement.
 *
 * @param {Object} course - Course object from the evaluation pool.
 * @param {Object} req - Requirement basket definition from curriculum.requirements.
 * @returns {boolean} True if the course satisfies the requirement criteria.
 */
function matchesRequirement(course, req) {
    // Check advanced course level criteria (e.g. 5000+ level electives)
    if (req.matchType === 'level_or_above') {
        if (req.prefix && !course.code.startsWith(req.prefix)) return false;
        if (req.excludePrefix && course.code.startsWith(req.excludePrefix)) return false;
        if (req.category && course.category !== req.category) return false;
        const digits = course.code.match(/\d+/);
        const num = digits ? parseInt(digits[0], 10) : 0;
        return num >= (req.minLevel || 0);
    }

    // Check if course has surplus credits redirected here via waterfall
    if (course.waterfalledTo) {
        return course.waterfalledTo === req.id;
    }

    // Standard pattern matching
    switch (req.matchType) {
        case 'in_list':
            return req.matchValue.includes(course.code);
        case 'startsWith':
            return course.code.startsWith(req.matchValue);
        case 'category':
            if (Array.isArray(req.matchValue)) {
                return req.matchValue.includes(course.category);
            }
            return course.category === req.matchValue;
        default:
            return false;
    }
}

// CommonJS module export for automated unit tests & offline Node execution
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateCompliance, matchesRequirement };
}