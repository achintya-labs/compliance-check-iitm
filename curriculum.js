const curricula = {
    "ee_btech": {
        id: "ee_btech",
        name: "EE B.Tech (pre 2023)",
        fullName: "Electrical Engineering (B.Tech)",
        coreCourses: {
            // Semester 1
            "MA1101": { name: "Functions of Several Variables", credits: 10, semester: 1 },
            "PH1010": { name: "Physics I", credits: 10, semester: 1 },
            "CY1001": { name: "Chemistry 1: Structure, Bonding & Reactivity", credits: 10, semester: 1 },
            "EE1102": { name: "Introduction to Programming", credits: 12, semester: 1 },
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

            // Semester 8
            "HS3050": { name: "Professional Ethics", credits: 0, semester: 8 }
        },
        requirements: [
            {
                id: "stream_basket",
                name: "EE Stream Elective Basket",
                matchType: "in_list",
                matchValue: [
                    "EE2003", "EE3007", "EE3002", "EE3110", "EE3003", "EE3203", 
                    "EE5312", "EE3402", "EE4502", "EE3005", "EP3200", "EE5311", "EE4901" 
                ],
                minCredits: 36, 
                minCourses: 4,
                waterfallTo: "professional"
            },
            {
                id: "ncc_nco_nss_basket",
                name: "NCC NCO NSS Basket",
                matchType: "in_list",
                matchValue: [
                    "NC1010", "NS1020", "NS1020"
                ],
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
    }
};

// Default export for backward compatibility
const curriculum = curricula["ee_btech"];