const eeCoreCoursesPre2023 = {
    // Semester 1
    "MA1101": { name: "Functions of Several Variables", credits: 10, semester: 1 },
    "PH1010": { name: "Physics I", credits: 10, semester: 1 },
    "CY1001": { name: "Chemistry 1: Structure, Bonding & Reactivity", credits: 10, semester: 1 },
    "ME1100": { name: "Thermodynamics", credits: 10, semester: 1 },
    "CY1002": { name: "Chemistry Lab I", credits: 3, semester: 1 },
    "ID1200": { name: "Ecology and Environment", credits: 0, semester: 1 },
    "GN1101": { name: "Life Skills 1", credits: 0, semester: 1 },
    "WS1301": { name: "Workshop-I", credits: 3, semester: 1 }, 

    // Semester 2
    "MA1102": { name: "Series and Matrices", credits: 10, semester: 2 },
    "PH1020": { name: "Physics II", credits: 10, semester: 2 },
    "EE2001": { name: "Digital Systems & Lab", credits: 16, semester: 2 },
    "EE1101": { name: "Signals and Systems", credits: 10, semester: 2 },
    "GN1102": { name: "Life Skills 2", credits: 0, semester: 2 },
    "PH1030": { name: "Physics Laboratory I", credits: 4, semester: 2 },
    "WS1302": { name: "Workshop-II", credits: 3, semester: 2 }, 

    // Semester 3
    "EE2025": { name: "Engineering Electromagnetics", credits: 10, semester: 3 },
    "EE2015": { name: "Electric Circuits & Networks", credits: 11, semester: 3 },
    "EE2016": { name: "Microprocessor Theory+Lab", credits: 12, semester: 3 },
    "EE2703": { name: "Applied Programming Lab.", credits: 6, semester: 3 },

    // Semester 4
    "EE2004": { name: "Digital Signal Processing", credits: 11, semester: 4 },
    "EE2005": { name: "Electrical Machines and Lab", credits: 15, semester: 4 },
    "EE2019": { name: "Analog Systems and Lab", credits: 17, semester: 4 },
    "EE3001": { name: "Solid State Devices", credits: 11, semester: 4 },

    // Semester 5
    "EE3004": { name: "Control Engineering", credits: 11, semester: 5 },
    "EE3006": { name: "Principles of Measurement", credits: 8, semester: 5 },
    "BT1010": { name: "Life Sciences", credits: 9, semester: 5 },

    // Semester 8
    "HS3050": { name: "Professional Ethics", credits: 0, semester: 8 }
};

const eeStreamElectivesPre2023 = [
    "EE2003", "EE3007", "EE3002", "EE3110", "EE3003", "EE3203", 
    "EE5312", "EE3402", "EE4502", "EE3005", "EP3200", "EE5311", "EE4901"
];

const eeCoreCourses2024 = {
    // Semester 1
    "MA1101": { name: "Calculus", credits: 10, semester: 1 },
    "PH1010": { name: "Physics I", credits: 10, semester: 1 },
    "ME1100": { name: "Thermodynamics", credits: 10, semester: 1 },
    "PH1030": { name: "Physics Lab", credits: 4, semester: 1 },
    "WS1301": { name: "Workshop I", credits: 3, semester: 1 },
    "GN1101": { name: "Life Skills", credits: 4, semester: 1 },

    // Semester 2
    "MA2101": { name: "Linear Algebra via Matrices", credits: 9, semester: 2 },
    "PH1020": { name: "Physics II (Electromagnetism)", credits: 10, semester: 2 },
    "EE2002": { name: "Digital Systems", credits: 10, semester: 2 },
    "EE2702": { name: "Digital Systems Lab", credits: 5, semester: 2 },
    "EE1101": { name: "Signals & Systems", credits: 10, semester: 2 },
    "WS1302": { name: "Workshop II", credits: 3, semester: 2 },
    "GN1102": { name: "Life Skills", credits: 2, semester: 2 },

    // Semester 3
    "EE2021": { name: "Materials Science for Electrical Engineers", credits: 10, semester: 3 },
    "EE2015": { name: "Electric Circuits & Networks", credits: 10, semester: 3 },
    "EE2016": { name: "Microprocessor Theory + Lab", credits: 11, semester: 3 },
    "EE2703": { name: "Applied Programming Lab", credits: 5, semester: 3 },
    "EE2025": { name: "Engineering Electromagnetics", credits: 10, semester: 3 },
    "ID1200": { name: "Ecology and Environment", credits: 2, semester: 3 },

    // Semester 4
    "EE2007": { name: "Analog Systems", credits: 10, semester: 4 },
    "EE2707": { name: "Analog Systems Lab", credits: 5, semester: 4 },
    "EE2004": { name: "Digital Signal Processing", credits: 10, semester: 4 },
    "EE2006": { name: "Electrical Machines", credits: 10, semester: 4 },
    "EE2706": { name: "Electrical Machines Lab", credits: 5, semester: 4 },
    "EE3001": { name: "Solid State Devices", credits: 10, semester: 4 },

    // Semester 5
    "EE3004": { name: "Control Engg", credits: 10, semester: 5 },
    "EE3006": { name: "Principles of Measurement & Lab", credits: 8, semester: 5 },
    "CY4050": { name: "Electrochemical Technology", credits: 10, semester: 5 },
    "HS3050": { name: "Professional Ethics", credits: 2, semester: 5 }
};

const eeStreamElectives2024 = [
    "EE2003", "EE3007", "EE3002", "EE5180", "EE3003", "EE3203", 
    "EE5312", "EE3402", "EE5413", "EE3005", "EP3200", "EE5311"
];

const curricula = {
    "ee_btech": {
        id: "ee_btech",
        name: "EE B.Tech (pre 2023)",
        fullName: "Electrical Engineering (B.Tech - pre 2023)",
        totalCredits: 430,
        coreCourses: eeCoreCoursesPre2023,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 12,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectivesPre2023,
                minCredits: 36,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030"],
                minCredits: 0,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 29,
                waterfallTo: "free"
            },
            {
                id: "math",
                name: "Mathematics",
                matchType: "startsWith",
                matchValue: "MA",
                minCredits: 9,
                waterfallTo: "science"
            },
            {
                id: "science",
                name: "Basic Sciences",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "ANY"],
                minCredits: 88,
                waterfallTo: null
            }
        ]
    },
    "ee_btech_hons": {
        id: "ee_btech_hons",
        name: "EE B.Tech Honours (pre 2023)",
        fullName: "Electrical Engineering (B.Tech Honours - pre 2023)",
        totalCredits: 457,
        coreCourses: eeCoreCoursesPre2023,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 12,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectivesPre2023,
                minCredits: 36,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030"],
                minCredits: 0,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "btp",
                name: "B. Tech Project",
                matchType: "in_list",
                matchValue: ["EE4900"],
                minCredits: 27,
                waterfallTo: null
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 27,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 29,
                waterfallTo: "free"
            },
            {
                id: "math",
                name: "Mathematics",
                matchType: "startsWith",
                matchValue: "MA",
                minCredits: 9,
                waterfallTo: "science"
            },
            {
                id: "science",
                name: "Basic Sciences",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "ANY"],
                minCredits: 61,
                waterfallTo: null
            }
        ]
    },
    "ee_dual_degree": {
        id: "ee_dual_degree",
        name: "EE Dual Degree (pre 2023)",
        fullName: "Electrical Engineering (Dual Degree - pre 2023)",
        totalCredits: 551,
        coreCourses: eeCoreCoursesPre2023,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 12,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectivesPre2023,
                minCredits: 36,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030"],
                minCredits: 0,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "dd_project",
                name: "Dual Degree Project",
                matchType: "startsWith",
                matchValue: "EE69",
                minCredits: 85,
                waterfallTo: "professional"
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 36,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 29,
                waterfallTo: "free"
            },
            {
                id: "math",
                name: "Mathematics",
                matchType: "startsWith",
                matchValue: "MA",
                minCredits: 9,
                waterfallTo: "science"
            },
            {
                id: "science",
                name: "Basic Sciences",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "ANY"],
                minCredits: 88,
                waterfallTo: null
            }
        ]
    },
    "ee_dual_degree_hons": {
        id: "ee_dual_degree_hons",
        name: "EE Dual Degree Honours (pre 2023)",
        fullName: "Electrical Engineering (Dual Degree Honours - pre 2023)",
        totalCredits: 578,
        coreCourses: eeCoreCoursesPre2023,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 12,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectivesPre2023,
                minCredits: 36,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030"],
                minCredits: 0,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "dd_project",
                name: "Dual Degree Project",
                matchType: "startsWith",
                matchValue: "EE69",
                minCredits: 85,
                waterfallTo: "professional"
            },
            {
                id: "btp",
                name: "B. Tech Project",
                matchType: "in_list",
                matchValue: ["EE4900"],
                minCredits: 27,
                waterfallTo: null
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 63,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 29,
                waterfallTo: "free"
            },
            {
                id: "math",
                name: "Mathematics",
                matchType: "startsWith",
                matchValue: "MA",
                minCredits: 9,
                waterfallTo: "science"
            },
            {
                id: "science",
                name: "Basic Sciences",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "ANY"],
                minCredits: 61,
                waterfallTo: null
            }
        ]
    },

    // Post-2024 Curricula
    "ee_btech_2024": {
        id: "ee_btech_2024",
        name: "EE B.Tech (2024)",
        fullName: "Electrical Engineering (B.Tech - 2024)",
        totalCredits: 403,
        coreCourses: eeCoreCourses2024,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 11,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectives2024,
                minCredits: 40,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "recreation_basket",
                name: "Recreation Elective Basket",
                matchType: "in_list",
                matchValue: ["ID1300"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030", "NCA"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "management",
                name: "Management Elective",
                matchType: "category",
                matchValue: "M",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "math_science",
                name: "Maths / Science Elective",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "C", "M", "ANY"],
                minCredits: 54,
                waterfallTo: null
            }
        ]
    },
    "ee_btech_hons_2024": {
        id: "ee_btech_hons_2024",
        name: "EE B.Tech Honours (2024)",
        fullName: "Electrical Engineering (B.Tech Honours - 2024)",
        totalCredits: 430,
        coreCourses: eeCoreCourses2024,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 11,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectives2024,
                minCredits: 40,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "recreation_basket",
                name: "Recreation Elective Basket",
                matchType: "in_list",
                matchValue: ["ID1300"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030", "NCA"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "btp",
                name: "B. Tech Project",
                matchType: "in_list",
                matchValue: ["EE4900"],
                minCredits: 27,
                waterfallTo: null
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 27,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "management",
                name: "Management Elective",
                matchType: "category",
                matchValue: "M",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "math_science",
                name: "Maths / Science Elective",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "C", "M", "ANY"],
                minCredits: 27,
                waterfallTo: null
            }
        ]
    },
    "ee_dual_degree_2024": {
        id: "ee_dual_degree_2024",
        name: "EE Dual Degree (2024)",
        fullName: "Electrical Engineering (Dual Degree - 2024)",
        totalCredits: 515,
        coreCourses: eeCoreCourses2024,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 11,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectives2024,
                minCredits: 40,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "recreation_basket",
                name: "Recreation Elective Basket",
                matchType: "in_list",
                matchValue: ["ID1300"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030", "NCA"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "dd_project",
                name: "Dual Degree Project",
                matchType: "startsWith",
                matchValue: "EE69",
                minCredits: 85,
                waterfallTo: "professional"
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 27,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "management",
                name: "Management Elective",
                matchType: "category",
                matchValue: "M",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "math_science",
                name: "Maths / Science Elective",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "C", "M", "ANY"],
                minCredits: 54,
                waterfallTo: null
            }
        ]
    },
    "ee_dual_degree_hons_2024": {
        id: "ee_dual_degree_hons_2024",
        name: "EE Dual Degree Honours (2024)",
        fullName: "Electrical Engineering (Dual Degree Honours - 2024)",
        totalCredits: 542,
        coreCourses: eeCoreCourses2024,
        requirements: [
            {
                id: "programming_basket",
                name: "EE Programming Elective Basket",
                matchType: "in_list",
                matchValue: ["EE1102", "EE1103"],
                minCredits: 11,
                minCourses: 1,
                waterfallTo: "professional"
            },
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: eeStreamElectives2024,
                minCredits: 40,
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "recreation_basket",
                name: "Recreation Elective Basket",
                matchType: "in_list",
                matchValue: ["ID1300"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC / NSO Basket",
                matchType: "in_list",
                matchValue: ["NC1010", "NS1020", "NS1030", "NCA"],
                minCredits: 4,
                waterfallTo: "free"
            },
            {
                id: "dd_project",
                name: "Dual Degree Project",
                matchType: "startsWith",
                matchValue: "EE69",
                minCredits: 85,
                waterfallTo: "professional"
            },
            {
                id: "btp",
                name: "B. Tech Project",
                matchType: "in_list",
                matchValue: ["EE4900"],
                minCredits: 27,
                waterfallTo: null
            },
            {
                id: "ee_5000_electives",
                name: "EE 5000+ Level Electives",
                matchType: "level_or_above",
                prefix: "EE",
                excludePrefix: "EE69",
                category: "P",
                minLevel: 5000,
                minCredits: 54,
                waterfallTo: "professional"
            },
            {
                id: "professional",
                name: "Professional Electives",
                matchType: "category",
                matchValue: "P",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "management",
                name: "Management Elective",
                matchType: "category",
                matchValue: "M",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "math_science",
                name: "Maths / Science Elective",
                matchType: "category",
                matchValue: "S",
                minCredits: 9,
                waterfallTo: "free"
            },
            {
                id: "humanities",
                name: "Humanities",
                matchType: "category",
                matchValue: "H",
                minCredits: 27,
                waterfallTo: "free"
            },
            {
                id: "free",
                name: "Free Electives",
                matchType: "category",
                matchValue: ["G", "E", "C", "M", "ANY"],
                minCredits: 27,
                waterfallTo: null
            }
        ]
    }
};

// Default export for backward compatibility
const curriculum = curricula["ee_btech"];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        curricula,
        curriculum,
        eeCoreCoursesPre2023,
        eeStreamElectivesPre2023,
        eeCoreCourses2024,
        eeStreamElectives2024
    };
}