/**
 * Processes completed courses against the curriculum.
 */
function calculateCompliance(userCourses, curriculum) {
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
        clonedCourse.waterfalledTo = null;
        return clonedCourse;
    });

    let results = {
        core: {
            name: "Core Courses",
            needed: Object.keys(curriculum.coreCourses).length,
            applied: 0,
            coursesUsed: []
        },
        reqs: {}
    };

    Object.keys(curriculum.coreCourses).forEach(coreCode => {
        const coreInfo = curriculum.coreCourses[coreCode];
        const userCourseIndex = pool.findIndex(c => c.code === coreCode);

        if (userCourseIndex !== -1) {
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
        }
    });

    curriculum.requirements.forEach(req => {
        results.reqs[req.id] = {
            name: req.name,
            needed: req.minCredits,
            minCourses: req.minCourses, // Pass optional parameter to UI
            applied: 0,
            coursesUsed: []
        };

        pool.forEach(course => {
            if (course.remainingCredits > 0 && matchesRequirement(course, req)) {
                
                let creditsNeededForReq = req.minCredits - results.reqs[req.id].applied;
                let coursesNeededForReq = req.minCourses ? req.minCourses - results.reqs[req.id].coursesUsed.length : 0;
                
                let take = Math.max(0, Math.min(creditsNeededForReq, course.remainingCredits));

                // Apply if we need the credits OR if we need the course count
                if (take > 0 || coursesNeededForReq > 0) {
                    results.reqs[req.id].applied += take;
                    course.remainingCredits -= take;
                    
                    let noteText = "Full Credit";
                    if (take > 0 && take < course.credits) noteText = `Split (${take} used here)`;
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

    const leftovers = pool.filter(c => c.remainingCredits > 0 && !curriculum.coreCourses.hasOwnProperty(c.code));
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