/**
 * Processes completed courses against the curriculum.
 */
function calculateCompliance(userCourses, curriculum, substitutions = []) {
    let messages = [];
    
    let pool = userCourses.map(c => {
        let clonedCourse = { ...c };
        
        if (curriculum.coreCourses.hasOwnProperty(clonedCourse.code)) {
            const coreInfo = curriculum.coreCourses[clonedCourse.code];
            
            if (clonedCourse.credits !== coreInfo.credits) {
                messages.push({
                    type: 'warning',
                    text: `Mismatch in ${clonedCourse.code}: User JSON specified ${clonedCourse.credits} credits. Forced to curriculum standards: ${coreInfo.credits} credits.`
                });
                clonedCourse.credits = coreInfo.credits;
            }
        }
        
        clonedCourse.remainingCredits = clonedCourse.credits;
        clonedCourse.consumed = false;
        clonedCourse.waterfalledTo = null;
        return clonedCourse;
    });

    function isCourseAvailable(c) {
        if (c.consumed) return false;
        if (c.credits === 0) return true;
        return c.remainingCredits > 0;
    }

    // Normalize substitutions
    const validSubs = Array.isArray(substitutions) ? substitutions.filter(s => {
        const orig = (s.origCode || s.coreCode || '').trim().toUpperCase();
        const repl = (s.replacementCode || s.replCode || '').trim().toUpperCase();
        return orig && repl;
    }).map(s => ({
        origCode: (s.origCode || s.coreCode || '').trim().toUpperCase(),
        replCode: (s.replacementCode || s.replCode || '').trim().toUpperCase()
    })) : [];

    const handledSubs = new Set();

    let results = {
        core: {
            name: "Core Courses",
            needed: Object.keys(curriculum.coreCourses).length,
            applied: 0,
            coursesUsed: []
        },
        reqs: {}
    };

    // 1. Process Core Courses
    Object.keys(curriculum.coreCourses).forEach(coreCode => {
        const coreInfo = curriculum.coreCourses[coreCode];

        // Check if there is a substitution mapped for this core course
        const sub = validSubs.find(s => s.origCode === coreCode);
        const replCode = sub ? sub.replCode : null;

        // Check if replacement course was completed
        const replCourseIndex = replCode ? pool.findIndex(c => c.code === replCode && isCourseAvailable(c)) : -1;
        // Check if core course was completed directly
        const userCourseIndex = pool.findIndex(c => c.code === coreCode && isCourseAvailable(c));

        if (replCode && replCourseIndex !== -1) {
            const replCourse = pool[replCourseIndex];
            results.core.applied += 1;
            results.core.coursesUsed.push({
                code: coreCode,
                name: coreInfo.name || replCourse.name,
                creditsApplied: coreInfo.credits,
                intendedSem: coreInfo.semester,
                completedSem: replCourse.semester,
                isCompleted: true,
                note: `${replCourse.code} substituted`
            });
            // Mark replacement course as consumed so it cannot count towards other sections
            replCourse.remainingCredits = 0;
            replCourse.consumed = true;
            messages.push({
                type: 'notice',
                text: `${coreCode} (${coreInfo.name || coreCode}) satisfied by alternate course ${replCourse.code} (${replCourse.name}). ${replCourse.code} cannot count towards other sections.`
            });
            handledSubs.add(sub);
        } else if (userCourseIndex !== -1) {
            const userCourse = pool[userCourseIndex];
            results.core.applied += 1;
            results.core.coursesUsed.push({
                code: userCourse.code,
                name: coreInfo.name || userCourse.name,
                creditsApplied: coreInfo.credits,
                intendedSem: coreInfo.semester,
                completedSem: userCourse.semester,
                isCompleted: true,
                note: "Complete"
            });
            userCourse.remainingCredits = 0;
            userCourse.consumed = true;
            if (sub) handledSubs.add(sub);
        } else {
            results.core.coursesUsed.push({
                code: coreCode,
                name: coreInfo.name || "Pending...", 
                creditsApplied: 0,
                intendedSem: coreInfo.semester,
                completedSem: "-",
                isCompleted: false,
                note: "Incomplete"
            });
            if (replCode) {
                messages.push({
                    type: 'warning',
                    text: `Substitution set: Core course ${coreCode} is mapped to replacement ${replCode}, but ${replCode} was not found in completed courses.`
                });
                handledSubs.add(sub);
            }
        }
    });

    // 2. Process Requirements / Elective Baskets
    curriculum.requirements.forEach(req => {
        results.reqs[req.id] = {
            name: req.name,
            needed: req.minCredits,
            minCourses: req.minCourses, // Pass optional parameter to UI
            applied: 0,
            coursesUsed: []
        };

        // First, apply any substitutions targeting named courses in this basket
        if (req.matchType === 'in_list' && Array.isArray(req.matchValue)) {
            const basketSubs = validSubs.filter(s => req.matchValue.includes(s.origCode) && !handledSubs.has(s));

            basketSubs.forEach(sub => {
                const replCourseIndex = pool.findIndex(c => c.code === sub.replCode && isCourseAvailable(c));
                if (replCourseIndex !== -1) {
                    const replCourse = pool[replCourseIndex];
                    let creditsNeededForReq = Math.max(0, req.minCredits - results.reqs[req.id].applied);
                    let coursesNeededForReq = req.minCourses ? req.minCourses - results.reqs[req.id].coursesUsed.length : 0;

                    let take = Math.min(creditsNeededForReq, replCourse.remainingCredits);
                    if (take === 0 && creditsNeededForReq <= 0 && coursesNeededForReq > 0) {
                        take = 0;
                    } else if (take === 0 && req.minCredits === 0) {
                        take = replCourse.remainingCredits;
                    }

                    results.reqs[req.id].applied += take;
                    replCourse.remainingCredits = 0; // Substituted course cannot count towards other sections
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

        // Second, process standard courses matching this requirement
        pool.forEach(course => {
            if (isCourseAvailable(course) && matchesRequirement(course, req)) {
                
                let creditsNeededForReq = req.minCredits - results.reqs[req.id].applied;
                let coursesNeededForReq = req.minCourses ? req.minCourses - results.reqs[req.id].coursesUsed.length : 0;
                
                let take = Math.max(0, Math.min(creditsNeededForReq, course.remainingCredits));

                // Apply if we need the credits OR if we need the course count
                if (take > 0 || coursesNeededForReq > 0) {
                    results.reqs[req.id].applied += take;
                    course.remainingCredits -= take;
                    if (course.credits === 0 || course.remainingCredits <= 0) {
                        course.consumed = true;
                    }
                    
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

                if (course.remainingCredits > 0 && req.waterfallTo) {
                    course.waterfalledTo = req.waterfallTo;
                }
            }
        });
    });

    // Check for any substitutions targeting unknown courses
    validSubs.forEach(sub => {
        if (!handledSubs.has(sub)) {
            messages.push({
                type: 'warning',
                text: `Substitution set: Course ${sub.origCode} is mapped to ${sub.replCode}, but ${sub.origCode} was not found as a core course or named course in any elective basket.`
            });
        }
    });

    const leftovers = pool.filter(c => !c.consumed && c.remainingCredits > 0 && !curriculum.coreCourses.hasOwnProperty(c.code));
    if (leftovers.length > 0) {
        messages.push({
            type: 'notice',
            text: `${leftovers.length} elective course(s) have unapplied credits. They exceeded all requirement targets.`
        });
    }

    return { results, messages };
}

function matchesRequirement(course, req) {
    if (course.waterfalledTo) {
        return course.waterfalledTo === req.id;
    }
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