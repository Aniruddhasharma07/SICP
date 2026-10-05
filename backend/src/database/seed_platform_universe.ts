import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedPlatformUniverse() {
  console.log('====================================================');
  console.log('SICP — POPULATING FULL PLATFORM REALISTIC UNIVERSE');
  console.log('====================================================');

  const defaultPassword = await bcrypt.hash('SICP@2026!secure', 10);

  // --------------------------------------------------------------------------
  // 1. ORGANIZATIONS (Universities, Industry, Government Departments)
  // --------------------------------------------------------------------------
  console.log('\n[1/10] Seeding Verified Premier Organizations...');

  // Universities
  const gla = await prisma.organization.upsert({
    where: { slug: 'gla-university-mathura' },
    create: {
      id: 'org-univ-gla',
      name: 'GLA University Mathura',
      slug: 'gla-university-mathura',
      type: 'UNIVERSITY',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        district: 'Mathura',
        state: 'Uttar Pradesh',
        aisheCode: 'U-0511',
        naacGrade: 'A+',
        category: 'Autonomous University',
        researchDomains: ['Environmental Systems', 'IoT & Smart Sensors', 'Urban Water Management', 'Civil Engineering'],
        departments: [
          'Civil Engineering',
          'Computer Science & Engineering',
          'Environmental Engineering',
          'Electrical Engineering',
          'Mechanical Engineering',
        ],
        currentRatingScore: 94.5,
        representativeTitle: 'Dean of Research & Industrial Consultancy',
      },
    },
    update: {},
  });

  const iitb = await prisma.organization.upsert({
    where: { slug: 'iit-bombay' },
    create: {
      id: 'org-univ-iitb',
      name: 'Indian Institute of Technology Bombay',
      slug: 'iit-bombay',
      type: 'UNIVERSITY',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        aisheCode: 'U-0306',
        naacGrade: 'A++',
        category: 'Institute of National Importance',
        researchDomains: ['Water Resources', 'Structural Geotechnics', 'Chemical Effluent Treatment', 'Clean Energy'],
        departments: [
          'Civil Engineering',
          'Centre for Environmental Science and Engineering (CESE)',
          'Electrical Engineering',
          'Chemical Engineering',
        ],
        currentRatingScore: 98.2,
        representativeTitle: 'Dean of Research and Development (R&D)',
      },
    },
    update: {},
  });

  const iitd = await prisma.organization.upsert({
    where: { slug: 'iit-delhi' },
    create: {
      id: 'org-univ-iitd',
      name: 'Indian Institute of Technology Delhi',
      slug: 'iit-delhi',
      type: 'UNIVERSITY',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        district: 'South Delhi',
        state: 'Delhi',
        aisheCode: 'U-0092',
        naacGrade: 'A++',
        category: 'Institute of National Importance',
        researchDomains: ['Urban Transportation', 'Atmospheric Pollution', 'Hydraulic Structures', 'Robotics & AI'],
        departments: [
          'Civil Engineering',
          'Centre for Atmospheric Sciences',
          'Computer Science & Engineering',
          'Mechanical Engineering',
        ],
        currentRatingScore: 97.8,
        representativeTitle: 'Associate Dean (Industrial Research & Development)',
      },
    },
    update: {},
  });

  // Industry & CSR Partners
  const cleanGrid = await prisma.organization.upsert({
    where: { slug: 'cleangrid-technologies' },
    create: {
      id: 'org-ind-cleangrid',
      name: 'CleanGrid Technologies Ltd.',
      slug: 'cleangrid-technologies',
      type: 'INDUSTRY',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        sector: 'Environmental Engineering & Clean Water',
        cin: 'L40100MH2014PLC254891',
        csrEligible: true,
        csrBudgetAvailable: 5000000,
        focusAreas: ['Industrial Effluent Monitoring', 'Water Body Rejuvenation', 'Solar Water Pumping'],
        representativeName: 'Vivek Singhania (Head of CSR & Sustainability)',
        district: 'Pune',
        state: 'Maharashtra',
      },
    },
    update: {},
  });

  const tataPower = await prisma.organization.upsert({
    where: { slug: 'tata-power-csr-foundation' },
    create: {
      id: 'org-ind-tatapower',
      name: 'Tata Power Community Development Trust',
      slug: 'tata-power-csr-foundation',
      type: 'CSR',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        sector: 'Power, Infrastructure & Rural Upliftment',
        csrEligible: true,
        csrBudgetAvailable: 12000000,
        focusAreas: ['Electrical Safety', 'Smart Street Lighting', 'Rural Micro-Grids', 'Skill Development'],
        representativeName: 'Pooja Kulkarni (Chief CSR Officer)',
        district: 'Mumbai',
        state: 'Maharashtra',
      },
    },
    update: {},
  });

  const mahindraMsme = await prisma.organization.upsert({
    where: { slug: 'mahindra-msme-infra' },
    create: {
      id: 'org-ind-mahindramsme',
      name: 'Mahindra MSME Infrastructure Consortium',
      slug: 'mahindra-msme-infra',
      type: 'MSME',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        sector: 'Urban Civil Paving & Drainage Fabrication',
        msmeUdyam: 'UDYAM-MH-12-0048192',
        csrEligible: false,
        commercialCapacity: 8000000,
        focusAreas: ['Precast Concrete Drainage Slabs', 'Polymer Pothole Mixes', 'Rapid Culvert Repair'],
        representativeName: 'Rajendra Joshi (Managing Director)',
        district: 'Thane',
        state: 'Maharashtra',
      },
    },
    update: {},
  });

  // Municipal Departments & ULBs
  const mmc = await prisma.organization.upsert({
    where: { slug: 'mathura-municipal-corporation' },
    create: {
      id: 'org-gov-mmc',
      name: 'Mathura-Vrindavan Nagar Nigam',
      slug: 'mathura-municipal-corporation',
      type: 'GOVERNMENT',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        jurisdiction: 'Mathura-Vrindavan Municipal Corporation',
        district: 'Mathura',
        state: 'Uttar Pradesh',
        department: 'Urban Local Body (ULB)',
      },
    },
    update: {},
  });

  const bmc = await prisma.organization.upsert({
    where: { slug: 'bhopal-municipal-corporation' },
    create: {
      id: 'org-gov-bmc',
      name: 'Bhopal Municipal Corporation',
      slug: 'bhopal-municipal-corporation',
      type: 'GOVERNMENT',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        jurisdiction: 'Bhopal Municipal Area',
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        department: 'Urban Local Body (ULB)',
      },
    },
    update: {},
  });

  const mmrda = await prisma.organization.upsert({
    where: { slug: 'mmrda-mumbai' },
    create: {
      id: 'org-gov-mmrda',
      name: 'Mumbai Metropolitan Region Development Authority',
      slug: 'mmrda-mumbai',
      type: 'GOVERNMENT',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        jurisdiction: 'MMR Region',
        district: 'Mumbai',
        state: 'Maharashtra',
        department: 'Urban Development Department',
      },
    },
    update: {},
  });

  const dpwd = await prisma.organization.upsert({
    where: { slug: 'delhi-public-works-department' },
    create: {
      id: 'org-gov-dpwd',
      name: 'Delhi Public Works Department (PWD)',
      slug: 'delhi-public-works-department',
      type: 'GOVERNMENT',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      metadata: {
        jurisdiction: 'National Capital Territory of Delhi',
        district: 'New Delhi',
        state: 'Delhi',
        department: 'Public Works Department',
      },
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 2. USERS ACROSS ALL PERSONAS
  // --------------------------------------------------------------------------
  console.log('\n[2/10] Seeding Multi-Tier Persona Users...');

  // System Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sicp.gov.in' },
    create: {
      id: 'usr-sysadmin-01',
      fullName: 'SICP National System Administrator',
      email: 'admin@sicp.gov.in',
      passwordHash: defaultPassword,
      role: 'SYSTEM_ADMIN',
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: { passwordHash: defaultPassword, isActive: true },
  });

  // Canonical Persona Accounts (Aligned with Portal Presets)
  await prisma.user.upsert({
    where: { email: 'citizen@sicp.gov.in' },
    create: {
      id: 'usr-preset-citizen',
      fullName: 'Aarav Sharma (Citizen)',
      email: 'citizen@sicp.gov.in',
      passwordHash: defaultPassword,
      role: 'CITIZEN',
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: { passwordHash: defaultPassword, isActive: true },
  });

  await prisma.user.upsert({
    where: { email: 'officer@sicp.gov.in' },
    create: {
      id: 'usr-preset-officer',
      fullName: 'Sandeep Roy (Municipal Triage Officer)',
      email: 'officer@sicp.gov.in',
      passwordHash: defaultPassword,
      role: 'GOVERNMENT_OFFICER',
      organizationId: mmc.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: { passwordHash: defaultPassword, isActive: true },
  });

  await prisma.user.upsert({
    where: { email: 'university@sicp.gov.in' },
    create: {
      id: 'usr-preset-univ',
      fullName: 'Dr. Sunita Bansal (University R&D Admin)',
      email: 'university@sicp.gov.in',
      passwordHash: defaultPassword,
      role: 'UNIVERSITY_ADMIN',
      organizationId: gla.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: { passwordHash: defaultPassword, isActive: true },
  });

  await prisma.user.upsert({
    where: { email: 'industry@sicp.gov.in' },
    create: {
      id: 'usr-preset-industry',
      fullName: 'Vikram Malhotra (CSR & Industry Partner)',
      email: 'industry@sicp.gov.in',
      passwordHash: defaultPassword,
      role: 'CSR_ORGANIZATION',
      organizationId: cleanGrid.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: { passwordHash: defaultPassword, isActive: true },
  });

  // Government Officers
  const officerMathura = await prisma.user.upsert({
    where: { email: 'officer.mathura@gov.in' },
    create: {
      id: 'usr-gov-mathura',
      fullName: 'Er. Rakesh Verma',
      email: 'officer.mathura@gov.in',
      passwordHash: defaultPassword,
      role: 'GOVERNMENT_OFFICER',
      organizationId: mmc.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  const officerBhopal = await prisma.user.upsert({
    where: { email: 'officer.bhopal@gov.in' },
    create: {
      id: 'usr-gov-bhopal',
      fullName: 'Deepak Saxena',
      email: 'officer.bhopal@gov.in',
      passwordHash: defaultPassword,
      role: 'GOVERNMENT_OFFICER',
      organizationId: bmc.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  const officerMumbai = await prisma.user.upsert({
    where: { email: 'officer.mumbai@gov.in' },
    create: {
      id: 'usr-gov-mumbai',
      fullName: 'Sanjay Deshmukh',
      email: 'officer.mumbai@gov.in',
      passwordHash: defaultPassword,
      role: 'GOVERNMENT_OFFICER',
      organizationId: mmrda.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  const officerDelhi = await prisma.user.upsert({
    where: { email: 'officer.delhi@gov.in' },
    create: {
      id: 'usr-gov-delhi',
      fullName: 'Alok Ranjan',
      email: 'officer.delhi@gov.in',
      passwordHash: defaultPassword,
      role: 'GOVERNMENT_OFFICER',
      organizationId: dpwd.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  // University Admins
  const glaAdmin = await prisma.user.upsert({
    where: { email: 'admin@gla.ac.in' },
    create: {
      id: 'usr-univadmin-gla',
      fullName: 'Prof. Kamal Sharma (GLA Dean R&D)',
      email: 'admin@gla.ac.in',
      passwordHash: defaultPassword,
      role: 'UNIVERSITY_ADMIN',
      organizationId: gla.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  const iitbAdmin = await prisma.user.upsert({
    where: { email: 'dean.rnd@iitb.ac.in' },
    create: {
      id: 'usr-univadmin-iitb',
      fullName: 'Prof. Milind Atrey (IIT Bombay Dean R&D)',
      email: 'dean.rnd@iitb.ac.in',
      passwordHash: defaultPassword,
      role: 'UNIVERSITY_ADMIN',
      organizationId: iitb.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  const iitdAdmin = await prisma.user.upsert({
    where: { email: 'dean.rnd@iitd.ac.in' },
    create: {
      id: 'usr-univadmin-iitd',
      fullName: 'Prof. Sunil Kumar Khare (IIT Delhi Dean R&D)',
      email: 'dean.rnd@iitd.ac.in',
      passwordHash: defaultPassword,
      role: 'UNIVERSITY_ADMIN',
      organizationId: iitd.id,
      approvalStatus: 'APPROVED',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  // Faculty Members
  const facultyUsers = [
    {
      id: 'usr-fac-gla-01',
      fullName: 'Dr. Arun Sharma',
      email: 'arun.sharma@gla.ac.in',
      orgId: gla.id,
      dept: 'Civil & Environmental Engineering',
      designation: 'Associate Professor',
      expertise: ['Urban Hydrology', 'Drainage Design', 'Silt Removal', 'Stormwater Infrastructure'],
      interests: ['Gravity-feed filtration', 'Sensor-based water logging alert systems'],
      pubs: 24,
      patents: 2,
    },
    {
      id: 'usr-fac-gla-02',
      fullName: 'Dr. Meenakshi Sundaram',
      email: 'meenakshi.s@gla.ac.in',
      orgId: gla.id,
      dept: 'Computer Science & IoT Lab',
      designation: 'Professor',
      expertise: ['IoT Sensing', 'Ultrasonic Flow Telemetry', 'Embedded Microcontrollers', 'Edge Computing'],
      interests: ['Low-power wide area networks (LoRaWAN)', 'Municipal telemetry integration'],
      pubs: 38,
      patents: 4,
    },
    {
      id: 'usr-fac-iitb-01',
      fullName: 'Prof. Rajesh Kulkarni',
      email: 'rkulkarni@iitb.ac.in',
      orgId: iitb.id,
      dept: 'Civil & Geotechnical Engineering',
      designation: 'Professor & Head',
      expertise: ['Pavement Mechanics', 'Subgrade Stabilization', 'Polymer Bitumen', 'Monsoon Subsidence'],
      interests: ['Geosynthetic reinforcement', 'Recycled plastic aggregates in urban roads'],
      pubs: 62,
      patents: 6,
    },
    {
      id: 'usr-fac-iitb-02',
      fullName: 'Prof. Sunita Rao',
      email: 'srao@iitb.ac.in',
      orgId: iitb.id,
      dept: 'Centre for Environmental Science (CESE)',
      designation: 'Professor',
      expertise: ['Industrial Effluent Treatment', 'Spectrophotometry', 'Heavy Metal Remediation', 'River Basins'],
      interests: ['Autonomous optical water quality nodes', 'Industrial compliance forensics'],
      pubs: 54,
      patents: 5,
    },
    {
      id: 'usr-fac-iitd-01',
      fullName: 'Dr. Vikramaditya Sen',
      email: 'vsen@iitd.ac.in',
      orgId: iitd.id,
      dept: 'Civil & Urban Transportation',
      designation: 'Associate Professor',
      expertise: ['Urban Drainage Corridors', 'SCADA Pumping Controls', 'Sediment Transport', 'Hydraulic Modelling'],
      interests: ['Automated mechanical silt scrapers', 'Monsoon peak mitigation algorithms'],
      pubs: 31,
      patents: 3,
    },
    {
      id: 'usr-fac-iitd-02',
      fullName: 'Dr. Ananya Mukherjee',
      email: 'amukherjee@iitd.ac.in',
      orgId: iitd.id,
      dept: 'Atmospheric Sciences & Aerosols',
      designation: 'Assistant Professor',
      expertise: ['Particulate Matter Dispersion', 'Fugitive Dust Containment', 'Urban Aerosols', 'Air Quality Modeling'],
      interests: ['Mist canopy suppressors', 'Sensor telemetry for transit corridor smog'],
      pubs: 19,
      patents: 1,
    },
  ];

  for (const f of facultyUsers) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      create: {
        id: f.id,
        fullName: f.fullName,
        email: f.email,
        passwordHash: defaultPassword,
        role: 'FACULTY',
        organizationId: f.orgId,
        approvalStatus: 'APPROVED',
        isActive: true,
        emailVerified: true,
      },
      update: {},
    });

    await prisma.facultyProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        department: f.dept,
        designation: f.designation,
        expertiseTags: f.expertise,
        researchInterests: f.interests,
        publicationsCount: f.pubs,
        patentsCount: f.patents,
        pastProjectsCount: Math.floor(f.pubs / 4),
        availabilityStatus: 'AVAILABLE',
      },
      update: {},
    });

    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: f.orgId, userId: user.id } },
      create: { organizationId: f.orgId, userId: user.id, role: 'FACULTY' },
      update: {},
    });
  }

  // Students (16 Approved Students + 2 Pending Registrations)
  const studentData = [
    // GLA Students
    { id: 'usr-std-gla-01', name: 'Rahul Verma', email: 'rahul.verma@gla.ac.in', orgId: gla.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '4th Year', skills: ['AutoCAD', 'Hydraulic Modeling', 'Surveying'] },
    { id: 'usr-std-gla-02', name: 'Sneha Gupta', email: 'sneha.gupta@gla.ac.in', orgId: gla.id, dept: 'Computer Science', prog: 'B.Tech', year: '3rd Year', skills: ['Python', 'Embedded C', 'LoRaWAN', 'FastAPI'] },
    { id: 'usr-std-gla-03', name: 'Amit Patel', email: 'amit.patel@gla.ac.in', orgId: gla.id, dept: 'Environmental Engineering', prog: 'M.Tech', year: '2nd Year', skills: ['Water Chemistry', 'Turbidity Analysis', 'GIS'] },
    { id: 'usr-std-gla-04', name: 'Priya Singh', email: 'priya.singh@gla.ac.in', orgId: gla.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '3rd Year', skills: ['Concrete Testing', 'Drainage Flow Simulation'] },
    { id: 'usr-std-gla-05', name: 'Devendra Sharma', email: 'devendra.s@gla.ac.in', orgId: gla.id, dept: 'Mechanical Engineering', prog: 'B.Tech', year: '4th Year', skills: ['SolidWorks', 'Pump Mechanics', 'Silt Trap Design'] },
    // IIT Bombay Students
    { id: 'usr-std-iitb-01', name: 'Rohan Deshmukh', email: 'rohan.d@iitb.ac.in', orgId: iitb.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '4th Year', skills: ['Bituminous Mix Design', 'Pavement Profiling'] },
    { id: 'usr-std-iitb-02', name: 'Tanvi Kulkarni', email: 'tanvi.k@iitb.ac.in', orgId: iitb.id, dept: 'Centre for Environmental Science', prog: 'M.Tech', year: '2nd Year', skills: ['BOD/COD Forensics', 'Chromatography', 'Spectrophotometry'] },
    { id: 'usr-std-iitb-03', name: 'Siddharth Mehta', email: 'siddharth.m@iitb.ac.in', orgId: iitb.id, dept: 'Electrical Engineering', prog: 'Ph.D.', year: '3rd Year', skills: ['Optical Sensors', 'Signal Processing', 'Wireless Mesh'] },
    { id: 'usr-std-iitb-04', name: 'Pooja Shinde', email: 'pooja.s@iitb.ac.in', orgId: iitb.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '3rd Year', skills: ['Soil Mechanics', 'Geogrid Testing', 'FLAC3D'] },
    { id: 'usr-std-iitb-05', name: 'Aditya Joshi', email: 'aditya.j@iitb.ac.in', orgId: iitb.id, dept: 'Chemical Engineering', prog: 'M.Tech', year: '1st Year', skills: ['Effluent Neutralization', 'Membrane Filtration'] },
    // IIT Delhi Students
    { id: 'usr-std-iitd-01', name: 'Harsh Vardhan', email: 'harsh.v@iitd.ac.in', orgId: iitd.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '4th Year', skills: ['Open Channel Hydraulics', 'HEC-RAS', 'Culvert Sizing'] },
    { id: 'usr-std-iitd-02', name: 'Ritu Choudhary', email: 'ritu.c@iitd.ac.in', orgId: iitd.id, dept: 'Mechanical Engineering', prog: 'M.Tech', year: '2nd Year', skills: ['Robotics Mechanism', 'Underwater Scraping Gears', 'SCADA'] },
    { id: 'usr-std-iitd-03', name: 'Varun Nair', email: 'varun.n@iitd.ac.in', orgId: iitd.id, dept: 'Atmospheric Sciences', prog: 'Ph.D.', year: '2nd Year', skills: ['Aerosol Metrology', 'Optical Particle Counters', 'WRF-Chem'] },
    { id: 'usr-std-iitd-04', name: 'Simran Kaur', email: 'simran.k@iitd.ac.in', orgId: iitd.id, dept: 'Computer Science', prog: 'B.Tech', year: '3rd Year', skills: ['Time-series Telemetry', 'InfluxDB', 'React Native'] },
    { id: 'usr-std-iitd-05', name: 'Nikhil Aggarwal', email: 'nikhil.a@iitd.ac.in', orgId: iitd.id, dept: 'Civil Engineering', prog: 'B.Tech', year: '4th Year', skills: ['Pavement Roughness Index', 'Asphalt Quality Assurance'] },
    { id: 'usr-std-iitd-06', name: 'Divya Prakash', email: 'divya.p@iitd.ac.in', orgId: iitd.id, dept: 'Environmental Engineering', prog: 'M.Tech', year: '1st Year', skills: ['Microbial Source Tracking', 'Potable Water QA'] },
  ];

  for (const s of studentData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      create: {
        id: s.id,
        fullName: s.name,
        email: s.email,
        passwordHash: defaultPassword,
        role: 'STUDENT',
        organizationId: s.orgId,
        approvalStatus: 'APPROVED',
        isActive: true,
        emailVerified: true,
      },
      update: {},
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        department: s.dept,
        program: s.prog,
        yearOrSemester: s.year,
        skills: s.skills,
        interests: ['Community Innovation', 'Smart Infrastructure Research'],
        rollNumber: `ROLL-${s.prog}-${s.id.split('-').pop()}`,
        gpa: 8.7,
      },
      update: {},
    });

    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: s.orgId, userId: user.id } },
      create: { organizationId: s.orgId, userId: user.id, role: 'STUDENT' },
      update: {},
    });
  }

  // Pending Registration Users (For demonstrating University Admin approval queue)
  const pendingStudent = await prisma.user.upsert({
    where: { email: 'mohit.rawat@gla.ac.in' },
    create: {
      id: 'usr-std-pending-01',
      fullName: 'Mohit Rawat',
      email: 'mohit.rawat@gla.ac.in',
      passwordHash: defaultPassword,
      role: 'STUDENT',
      organizationId: gla.id,
      approvalStatus: 'PENDING',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  await prisma.studentProfile.upsert({
    where: { userId: pendingStudent.id },
    create: {
      userId: pendingStudent.id,
      department: 'Civil Engineering',
      program: 'B.Tech',
      yearOrSemester: '2nd Year',
      skills: ['Surveying', 'GIS Mapping'],
      interests: ['Urban Flood Mitigation'],
      rollNumber: 'GLA-CE-2024-089',
    },
    update: {},
  });

  const pendingFaculty = await prisma.user.upsert({
    where: { email: 'kavita.nair@gla.ac.in' },
    create: {
      id: 'usr-fac-pending-01',
      fullName: 'Dr. Kavita Nair',
      email: 'kavita.nair@gla.ac.in',
      passwordHash: defaultPassword,
      role: 'FACULTY',
      organizationId: gla.id,
      approvalStatus: 'PENDING',
      isActive: true,
      emailVerified: true,
    },
    update: {},
  });

  await prisma.facultyProfile.upsert({
    where: { userId: pendingFaculty.id },
    create: {
      userId: pendingFaculty.id,
      department: 'Environmental Engineering',
      designation: 'Assistant Professor',
      expertiseTags: ['Groundwater Contamination', 'Arsenic Remediation'],
      researchInterests: ['Rural Aquifer Quality'],
      publicationsCount: 8,
      patentsCount: 1,
    },
    update: {},
  });

  // Industry Representatives
  const industryUsers = [
    { id: 'usr-ind-cleangrid', name: 'Vivek Singhania', email: 'contact@cleangrid.io', orgId: cleanGrid.id },
    { id: 'usr-ind-tatapower', name: 'Pooja Kulkarni', email: 'csr@tatapower.com', orgId: tataPower.id },
    { id: 'usr-ind-mahindra', name: 'Rajendra Joshi', email: 'projects@mahindramsme.in', orgId: mahindraMsme.id },
  ];

  for (const ind of industryUsers) {
    const user = await prisma.user.upsert({
      where: { email: ind.email },
      create: {
        id: ind.id,
        fullName: ind.name,
        email: ind.email,
        passwordHash: defaultPassword,
        role: 'INDUSTRY_PARTNER',
        organizationId: ind.orgId,
        approvalStatus: 'APPROVED',
        isActive: true,
        emailVerified: true,
      },
      update: {},
    });

    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: ind.orgId, userId: user.id } },
      create: { organizationId: ind.orgId, userId: user.id, role: 'INDUSTRY_REPRESENTATIVE' },
      update: {},
    });
  }

  // Citizens (12 Active Citizens across locations)
  const citizenData = [
    { id: 'usr-cit-01', name: 'Anil Kumar Tiwari', email: 'anil.tiwari@gmail.com', city: 'Mathura' },
    { id: 'usr-cit-02', name: 'Radha Mohan Pathak', email: 'rmpathak@rediffmail.com', city: 'Mathura' },
    { id: 'usr-cit-03', name: 'Sarita Devi Agrawal', email: 'sarita.agrawal@yahoo.com', city: 'Mathura' },
    { id: 'usr-cit-04', name: 'Gaurav Bhardwaj', email: 'gbhardwaj.mathura@gmail.com', city: 'Mathura' },
    { id: 'usr-cit-05', name: 'Dr. Ramesh Chandra', email: 'dr.rchandra.bhopal@gmail.com', city: 'Bhopal' },
    { id: 'usr-cit-06', name: 'Manish Malviya', email: 'manish.kolar@outlook.com', city: 'Bhopal' },
    { id: 'usr-cit-07', name: 'Kavita Shrivastava', email: 'kavita.shrivastava@gmail.com', city: 'Bhopal' },
    { id: 'usr-cit-08', name: 'Pradeep Thorat', email: 'pradeep.thorat@gmail.com', city: 'Pune' },
    { id: 'usr-cit-09', name: 'Babanrao Patil', email: 'babanrao.alandi@gmail.com', city: 'Pune' },
    { id: 'usr-cit-10', name: 'Virendra Singh Rawat', email: 'vs.rawat.dwarka@gmail.com', city: 'Delhi' },
    { id: 'usr-cit-11', name: 'Harpreet Singh', email: 'harpreet.isbt@gmail.com', city: 'Delhi' },
    { id: 'usr-cit-12', name: 'Sanjay Aggarwal', email: 'sanjay.anandvihar@gmail.com', city: 'Delhi' },
  ];

  for (const c of citizenData) {
    await prisma.user.upsert({
      where: { email: c.email },
      create: {
        id: c.id,
        fullName: c.name,
        email: c.email,
        passwordHash: defaultPassword,
        role: 'CITIZEN',
        approvalStatus: 'APPROVED',
        isActive: true,
        emailVerified: true,
      },
      update: {},
    });
  }

  // --------------------------------------------------------------------------
  // 3. MASTER CHALLENGES, PROBLEM GROUPS & PROBLEMS
  // --------------------------------------------------------------------------
  console.log('\n[3/10] Seeding Master Challenges & Governed Problem Hierarchy...');

  const problemIdMap = new Map<string, string>();

  async function upsertProblemSafely(p: {
    id: string;
    code: string;
    title: string;
    description: string;
    category: string;
    status: string;
    aiSeverity: any;
    govSeverity: any;
    aiPriority: any;
    govPriority: any;
    aiAffectedPopulation: number;
    populationStatus: any;
    populationProvenance: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    district?: string;
    state?: string;
    wardNumber?: string;
    submitterId: string;
    groupId: string;
    challengeId: string;
  }) {
    const existing = await prisma.problem.findFirst({
      where: {
        OR: [{ id: p.id }, { code: p.code }],
      },
    });

    let problemId = p.id;
    if (existing) {
      problemId = existing.id;
      await prisma.problem.update({
        where: { id: existing.id },
        data: {
          code: p.code,
          title: p.title,
          description: p.description,
          category: p.category,
          status: p.status as any,
          aiSeverity: p.aiSeverity,
          govSeverity: p.govSeverity,
          aiPriority: p.aiPriority,
          govPriority: p.govPriority,
          aiAffectedPopulation: p.aiAffectedPopulation,
          populationStatus: p.populationStatus,
          populationProvenance: p.populationProvenance,
          latitude: p.latitude,
          longitude: p.longitude,
          locationName: p.locationName,
          district: p.district,
          state: p.state,
          wardNumber: p.wardNumber,
          submitterId: p.submitterId,
          groupId: p.groupId,
        },
      });
    } else {
      await prisma.problem.create({
        data: {
          id: p.id,
          code: p.code,
          title: p.title,
          description: p.description,
          category: p.category,
          status: p.status as any,
          aiSeverity: p.aiSeverity,
          govSeverity: p.govSeverity,
          aiPriority: p.aiPriority,
          govPriority: p.govPriority,
          aiAffectedPopulation: p.aiAffectedPopulation,
          populationStatus: p.populationStatus,
          populationProvenance: p.populationProvenance,
          latitude: p.latitude,
          longitude: p.longitude,
          locationName: p.locationName,
          district: p.district,
          state: p.state,
          wardNumber: p.wardNumber,
          submitterId: p.submitterId,
          groupId: p.groupId,
        },
      });
    }

    await prisma.problemGroupMember.upsert({
      where: { groupId_problemId: { groupId: p.groupId, problemId } },
      create: { groupId: p.groupId, problemId },
      update: {},
    });

    await prisma.challengeProblem.upsert({
      where: { challengeId_problemId: { challengeId: p.challengeId, problemId } },
      create: { challengeId: p.challengeId, problemId },
      update: {},
    });

    problemIdMap.set(p.id, problemId);
    return problemId;
  }

  // ==========================================================================
  // CHALLENGE 1: Urban Drainage Stagnation in Mathura Western Sector
  // ==========================================================================
  const chalMathura = await prisma.challenge.upsert({
    where: { id: 'chal-mathura-drainage' },
    create: {
      id: 'chal-mathura-drainage',
      title: 'Urban Drainage Stagnation and Gutter Overflow in Mathura Western Sector',
      description: 'Persistent stormwater and sewage stagnation caused by blocked roadside culverts, inadequate gradient slope along the highway bypass, and dense silt accumulation leading to severe monsoon waterlogging.',
      category: 'SANITATION',
      severity: 'SEVERE',
      priority: 'HIGH',
      priorityScore: 78.5,
      status: 'IN_PILOT',
      submitterId: 'usr-cit-01',
      latitude: 27.7925414,
      longitude: 77.4367904,
      address: 'Near Highway Bypass, Ward 18, Mathura, Uttar Pradesh',
      district: 'Mathura',
      state: 'Uttar Pradesh',
      affectedPopulation: 6500,
      durationMonths: 14,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 30 * 86400000),
      verifiedById: officerMathura.id,
      verificationNotes: 'On-site technical inspection confirmed hydraulic backflow and silt accumulation. Verified for university multidisciplinary pilot.',
    },
    update: {
      status: 'IN_PILOT',
      title: 'Urban Drainage Stagnation and Gutter Overflow in Mathura Western Sector',
    },
  });

  // Group 1A: Drainage Backflow and Gutter Blockage Cluster
  const grpMathura1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-mathura-drain-01' },
    create: {
      id: 'grp-mathura-drain-01',
      title: 'Drainage Backflow and Gutter Blockage Cluster',
      canonicalCategory: 'SANITATION',
      relationshipStrength: 0.94,
      factorBreakdown: { spatial: 0.95, semantic: 0.92, temporal: 0.94 },
      challengeId: chalMathura.id,
    },
    update: { challengeId: chalMathura.id },
  });

  // Group 1B: Culvert Silt Accumulation Near Highway Bypass
  const grpMathura2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-mathura-silt-02' },
    create: {
      id: 'grp-mathura-silt-02',
      title: 'Culvert Silt Accumulation Near Highway Bypass',
      canonicalCategory: 'SANITATION',
      relationshipStrength: 0.88,
      factorBreakdown: { spatial: 0.89, semantic: 0.86, temporal: 0.9 },
      challengeId: chalMathura.id,
    },
    update: { challengeId: chalMathura.id },
  });

  // Link Groups to Challenge
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalMathura.id, groupId: grpMathura1.id } },
    create: { challengeId: chalMathura.id, groupId: grpMathura1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalMathura.id, groupId: grpMathura2.id } },
    create: { challengeId: chalMathura.id, groupId: grpMathura2.id },
    update: {},
  });

  // Problems for Challenge 1
  const mathuraProblems = [
    {
      id: 'prb-mathura-01',
      code: 'PRB-2026-4776',
      title: 'drainage issue in my locality',
      desc: 'The main roadside drain has been choked completely for 3 weeks. Dirty water is flowing onto the footpath and entering ground-floor shops during evening hours.',
      groupId: grpMathura1.id,
      submitterId: 'usr-cit-01',
      lat: 27.7925414,
      lon: 77.4367904,
      loc: 'Ward 18 Main Road, Mathura',
      status: 'GROUPED',
    },
    {
      id: 'prb-mathura-02',
      code: 'PRB-2026-9857',
      title: 'gutter overflow',
      desc: 'Sewer manhole and open gutter overflowing continuously near the dairy corner. Stench is unbearable and mosquitoes are breeding rapidly.',
      groupId: grpMathura1.id,
      submitterId: 'usr-cit-02',
      lat: 27.7926102,
      lon: 77.4368512,
      loc: 'Dairy Corner Lane, Ward 18, Mathura',
      status: 'GROUPED',
    },
    {
      id: 'prb-mathura-03',
      code: 'PRB-2026-1102',
      title: 'stagnant sewage water accumulation outside primary school',
      desc: 'Overflown wastewater from the neighborhood drain has formed a persistent stagnant pool 50 meters wide right at the entrance gate of the government primary school.',
      groupId: grpMathura1.id,
      submitterId: 'usr-cit-03',
      lat: 27.7928200,
      lon: 77.4371000,
      loc: 'Outside Primary School, Ward 18, Mathura',
      status: 'GROUPED',
    },
    {
      id: 'prb-mathura-04',
      code: 'PRB-2026-1103',
      title: 'stormwater drain clogged with solid silt',
      desc: 'The concrete box culvert passing under the highway bypass is 80% choked with hardened silt and construction debris, causing backpressure in the entire local grid.',
      groupId: grpMathura2.id,
      submitterId: 'usr-cit-04',
      lat: 27.7941000,
      lon: 77.4382000,
      loc: 'Bypass Culvert km 4, Mathura',
      status: 'GROUPED',
    },
    {
      id: 'prb-mathura-05',
      code: 'PRB-2026-1104',
      title: 'inadequate culvert slope causing road waterlogging',
      desc: 'Water does not flow into the secondary storm drain because the culvert invert level is higher than the feeder drain bed, resulting in perpetual reverse pooling.',
      groupId: grpMathura2.id,
      submitterId: 'usr-cit-01',
      lat: 27.7943500,
      lon: 77.4385000,
      loc: 'Highway Feeder Junction, Mathura',
      status: 'GROUPED',
    },
  ];

  for (const p of mathuraProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'SANITATION',
      status: p.status as any,
      aiSeverity: 'SEVERE',
      govSeverity: 'SEVERE',
      aiPriority: 'HIGH',
      govPriority: 'HIGH',
      aiAffectedPopulation: 2500,
      populationStatus: 'KNOWN',
      populationProvenance: 'Ward 18 Household Census & Municipal Voter Records',
      latitude: p.lat,
      longitude: p.lon,
      locationName: p.loc,
      district: 'Mathura',
      state: 'Uttar Pradesh',
      wardNumber: 'Ward 18',
      submitterId: p.submitterId,
      groupId: p.groupId,
      challengeId: chalMathura.id,
    });
  }

  // ==========================================================================
  // CHALLENGE 2: Kolar Road Arterial Pavement Subsidence in Bhopal
  // ==========================================================================
  const chalBhopal = await prisma.challenge.upsert({
    where: { id: 'chal-bhopal-roads' },
    create: {
      id: 'chal-bhopal-roads',
      title: 'Kolar Road Arterial Pavement Degradation & Monsoon Subsidence Corridor',
      description: 'Severe subgrade settlement and recurring crater-pothole formation along an 8.2 km arterial transit corridor, aggravated by uncompacted utility pipeline trenches and heavy multi-axle freight diversions.',
      category: 'ROAD_TRANSPORT',
      severity: 'SEVERE',
      priority: 'CRITICAL',
      priorityScore: 84.0,
      status: 'ASSIGNED_TO_UNIVERSITY',
      submitterId: 'usr-cit-05',
      latitude: 23.1895,
      longitude: 77.4243,
      address: 'Chuna Bhatti to Kolar Tiraha Corridor, Bhopal, Madhya Pradesh',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      affectedPopulation: 45000,
      durationMonths: 18,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 15 * 86400000),
      verifiedById: officerBhopal.id,
      verificationNotes: 'Subgrade CBR values found below 3%. PWD & Municipal joint committee validated for geosynthetic base redesign.',
    },
    update: {
      status: 'ASSIGNED_TO_UNIVERSITY',
    },
  });

  const grpBhopal1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-bhopal-road-01' },
    create: {
      id: 'grp-bhopal-road-01',
      title: 'Chuna Bhatti to Kolar Square Pothole Grid',
      canonicalCategory: 'ROAD_TRANSPORT',
      relationshipStrength: 0.91,
      factorBreakdown: { spatial: 0.94, semantic: 0.92, temporal: 0.88 },
      challengeId: chalBhopal.id,
    },
    update: { challengeId: chalBhopal.id },
  });

  const grpBhopal2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-bhopal-road-02' },
    create: {
      id: 'grp-bhopal-road-02',
      title: 'Sarvadharma Bridge Approach Slump',
      canonicalCategory: 'ROAD_TRANSPORT',
      relationshipStrength: 0.86,
      factorBreakdown: { spatial: 0.88, semantic: 0.85, temporal: 0.85 },
      challengeId: chalBhopal.id,
    },
    update: { challengeId: chalBhopal.id },
  });

  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalBhopal.id, groupId: grpBhopal1.id } },
    create: { challengeId: chalBhopal.id, groupId: grpBhopal1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalBhopal.id, groupId: grpBhopal2.id } },
    create: { challengeId: chalBhopal.id, groupId: grpBhopal2.id },
    update: {},
  });

  const bhopalProblems = [
    { id: 'prb-bhopal-01', code: 'PRB-2026-2101', title: 'Deep craters near Chuna Bhatti traffic signal', desc: 'Over 12 deep craters exceeding 25 cm depth have developed right at the junction, leading to constant two-wheeler skidding and spine injuries.', grp: grpBhopal1.id, sub: 'usr-cit-05', lat: 23.1895, lon: 77.4243 },
    { id: 'prb-bhopal-02', code: 'PRB-2026-2102', title: 'Uncompacted gas pipeline trench depression', desc: 'Trench dug for gas pipeline 4 months ago was backfilled with loose silt without bitumen patching. Rain has washed out the trench creating a 100m wheel trap.', grp: grpBhopal1.id, sub: 'usr-cit-06', lat: 23.1882, lon: 77.4238 },
    { id: 'prb-bhopal-03', code: 'PRB-2026-2103', title: 'Bituminous surface peeling off after moderate rainfall', desc: 'The entire top wearing coat applied last season has disintegrated into loose gravel, creating hazardous dust and stone projectile hazards.', grp: grpBhopal1.id, sub: 'usr-cit-07', lat: 23.1870, lon: 77.4230 },
    { id: 'prb-bhopal-04', code: 'PRB-2026-2104', title: 'Sarvadharma Bridge approach slab sinking', desc: 'Bridge expansion joint has a 15 cm vertical step due to settlement of approach embankment. Heavy trucks brake violently causing night collisions.', grp: grpBhopal2.id, sub: 'usr-cit-05', lat: 23.1780, lon: 77.4210 },
    { id: 'prb-bhopal-05', code: 'PRB-2026-2105', title: 'Embankment slope erosion threatening carriageway', desc: 'Unlined roadside drain on bridge approach has eroded sub-base material beneath the left lane, threatening sudden structural collapse of the outer lane.', grp: grpBhopal2.id, sub: 'usr-cit-06', lat: 23.1765, lon: 77.4202 },
  ];

  for (const p of bhopalProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'ROAD_TRANSPORT',
      status: 'GROUPED',
      aiSeverity: 'SEVERE',
      govSeverity: 'SEVERE',
      aiPriority: 'CRITICAL',
      govPriority: 'CRITICAL',
      aiAffectedPopulation: 12000,
      populationStatus: 'KNOWN',
      populationProvenance: 'Bhopal Transport Department Daily Traffic Census',
      latitude: p.lat,
      longitude: p.lon,
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      wardNumber: 'Ward 82',
      submitterId: p.sub,
      groupId: p.grp,
      challengeId: chalBhopal.id,
    });
  }

  // ==========================================================================
  // CHALLENGE 3: Indrayani River Industrial Effluent Ingress (Pune / Pimpri)
  // ==========================================================================
  const chalIndrayani = await prisma.challenge.upsert({
    where: { id: 'chal-indrayani-effluent' },
    create: {
      id: 'chal-indrayani-effluent',
      title: 'Indrayani River Industrial Effluent Ingress & Water Quality Degradation',
      description: 'Severe chemical frothing, dissolved oxygen depletion, and hazardous toxic discharge into the sacred Indrayani River along the Dehu-Alandi pilgrim corridor, contaminating drinking water intakes and adjacent agricultural irrigation wells.',
      category: 'WATER_SUPPLY',
      severity: 'CATASTROPHIC',
      priority: 'CRITICAL',
      priorityScore: 92.5,
      status: 'OUTCOME_VERIFIED',
      submitterId: 'usr-cit-08',
      latitude: 18.7180,
      longitude: 73.7710,
      address: 'Dehu-Alandi Ghat Corridor, Pune District, Maharashtra',
      district: 'Pune',
      state: 'Maharashtra',
      affectedPopulation: 85000,
      durationMonths: 24,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 60 * 86400000),
      verifiedById: officerMumbai.id,
      verificationNotes: 'Maharashtra Pollution Control Board (MPCB) and SICP multidisciplinary deployment verified 42% reduction in unneutralized effluent.',
    },
    update: {
      status: 'OUTCOME_VERIFIED',
    },
  });

  const grpIndrayani1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-indrayani-effluent-01' },
    create: {
      id: 'grp-indrayani-effluent-01',
      title: 'Dehu-Alandi Industrial Effluent Discharge Points',
      canonicalCategory: 'WATER_SUPPLY',
      relationshipStrength: 0.96,
      factorBreakdown: { spatial: 0.98, semantic: 0.95, temporal: 0.94 },
      challengeId: chalIndrayani.id,
    },
    update: { challengeId: chalIndrayani.id },
  });

  const grpIndrayani2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-indrayani-effluent-02' },
    create: {
      id: 'grp-indrayani-effluent-02',
      title: 'Downstream Agricultural Well Salinization',
      canonicalCategory: 'WATER_SUPPLY',
      relationshipStrength: 0.89,
      factorBreakdown: { spatial: 0.91, semantic: 0.88, temporal: 0.9 },
      challengeId: chalIndrayani.id,
    },
    update: { challengeId: chalIndrayani.id },
  });

  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalIndrayani.id, groupId: grpIndrayani1.id } },
    create: { challengeId: chalIndrayani.id, groupId: grpIndrayani1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalIndrayani.id, groupId: grpIndrayani2.id } },
    create: { challengeId: chalIndrayani.id, groupId: grpIndrayani2.id },
    update: {},
  });

  const indrayaniProblems = [
    { id: 'prb-indrayani-01', code: 'PRB-2026-3101', title: 'Dense white chemical foam forming on river surface', desc: 'Thick chemical foam rising 3 feet above river surface at Dehu ghat. Pilgrims are unable to take holy dip and foul chemical odor is widespread.', grp: grpIndrayani1.id, sub: 'usr-cit-08', lat: 18.7180, lon: 73.7710 },
    { id: 'prb-indrayani-02', code: 'PRB-2026-3102', title: 'Midnight colored chemical discharge from storm outlet', desc: 'Black pungent effluent released into the river every night between 1 AM and 4 AM via stormwater outlet near MIDC boundary.', grp: grpIndrayani1.id, sub: 'usr-cit-09', lat: 18.7195, lon: 73.7735 },
    { id: 'prb-indrayani-03', code: 'PRB-2026-3103', title: 'Mass fish mortality observed along Alandi stretch', desc: 'Dead fish floating along 4 km stretch from Chikhali to Alandi. Water dissolved oxygen measured near 0.8 mg/L.', grp: grpIndrayani1.id, sub: 'usr-cit-08', lat: 18.7250, lon: 73.7850 },
    { id: 'prb-indrayani-04', code: 'PRB-2026-3104', title: 'Irrigation borewell water turned yellow and pungent', desc: 'Three agricultural open wells in downstream farms yield yellow tinted water smelling of sulfur, scorching spinach and coriander crops.', grp: grpIndrayani2.id, sub: 'usr-cit-09', lat: 18.7300, lon: 73.8100 },
    { id: 'prb-indrayani-05', code: 'PRB-2026-3105', title: 'River intake filtration choked with heavy sludge', desc: 'Rural water supply pump suction well choked with industrial surfactant sludge every 48 hours requiring manual scraping.', grp: grpIndrayani2.id, sub: 'usr-cit-08', lat: 18.7320, lon: 73.8150 },
  ];

  for (const p of indrayaniProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'WATER_SUPPLY',
      status: 'RESOLVED',
      aiSeverity: 'CATASTROPHIC',
      govSeverity: 'CATASTROPHIC',
      aiPriority: 'CRITICAL',
      govPriority: 'CRITICAL',
      aiAffectedPopulation: 25000,
      populationStatus: 'KNOWN',
      populationProvenance: 'PCMC & Alandi Municipal Public Health Records',
      latitude: p.lat,
      longitude: p.lon,
      district: 'Pune',
      state: 'Maharashtra',
      submitterId: p.sub,
      groupId: p.grp,
      challengeId: chalIndrayani.id,
    });
  }

  // ==========================================================================
  // CHALLENGE 4: Najafgarh Drain Silt Accumulation & Backflow (Delhi)
  // ==========================================================================
  const chalNajafgarh = await prisma.challenge.upsert({
    where: { id: 'chal-delhi-najafgarh' },
    create: {
      id: 'chal-delhi-najafgarh',
      title: 'Najafgarh Drain Silt Accumulation & Recurrent Monsoon Backflow',
      description: 'Heavy solid silt banks at the Kakrola Regulator restrict storm flow discharge into the Yamuna basin, creating severe backflow and basement inundation across Dwarka residential sectors.',
      category: 'FLOOD_ENVIRONMENT',
      severity: 'SEVERE',
      priority: 'HIGH',
      priorityScore: 76.0,
      status: 'IN_RESEARCH',
      submitterId: 'usr-cit-10',
      latitude: 28.6010,
      longitude: 77.0320,
      address: 'Kakrola Regulator, Najafgarh Drain Basin, Southwest Delhi',
      district: 'South West Delhi',
      state: 'Delhi',
      affectedPopulation: 120000,
      durationMonths: 20,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 25 * 86400000),
      verifiedById: officerDelhi.id,
      verificationNotes: 'Irrigation & Flood Control Dept Delhi verified hydraulic bottleneck at Kakrola. Routed to IIT Delhi Urban Hydrology consortium.',
    },
    update: {
      status: 'IN_RESEARCH',
    },
  });

  const grpNajafgarh1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-delhi-najafgarh-01' },
    create: {
      id: 'grp-delhi-najafgarh-01',
      title: 'Kakrola Regulator Silt Bank',
      canonicalCategory: 'FLOOD_ENVIRONMENT',
      relationshipStrength: 0.93,
      factorBreakdown: { spatial: 0.95, semantic: 0.91, temporal: 0.92 },
      challengeId: chalNajafgarh.id,
    },
    update: { challengeId: chalNajafgarh.id },
  });

  const grpNajafgarh2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-delhi-najafgarh-02' },
    create: {
      id: 'grp-delhi-najafgarh-02',
      title: 'Dwarka Sector 8 Pumping Substation Failure',
      canonicalCategory: 'FLOOD_ENVIRONMENT',
      relationshipStrength: 0.87,
      factorBreakdown: { spatial: 0.88, semantic: 0.86, temporal: 0.87 },
      challengeId: chalNajafgarh.id,
    },
    update: { challengeId: chalNajafgarh.id },
  });

  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalNajafgarh.id, groupId: grpNajafgarh1.id } },
    create: { challengeId: chalNajafgarh.id, groupId: grpNajafgarh1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalNajafgarh.id, groupId: grpNajafgarh2.id } },
    create: { challengeId: chalNajafgarh.id, groupId: grpNajafgarh2.id },
    update: {},
  });

  const delhiNajafgarhProblems = [
    { id: 'prb-delhi-01', code: 'PRB-2026-4101', title: 'Massive silt accumulation blocking regulator gates', desc: 'Over 4 meters of compacted silt sitting in front of sluice gates 3, 4 and 5 at Kakrola regulator, reducing discharge capacity by 65%.', grp: grpNajafgarh1.id, sub: 'usr-cit-10', lat: 28.6010, lon: 77.0320 },
    { id: 'prb-delhi-02', code: 'PRB-2026-4102', title: 'Colony trunk drain backflow during 30 min rainfall', desc: 'Water in Sector 14 trunk stormwater drain reversed direction during moderate rain, flooding residential basements with black sewage-silt water.', grp: grpNajafgarh1.id, sub: 'usr-cit-10', lat: 28.5980, lon: 77.0350 },
    { id: 'prb-delhi-03', code: 'PRB-2026-4103', title: 'Weed and water hyacinth mat choking flow channel', desc: 'Dense vegetation mats spanning 500 meters have entangled plastic waste and stopped surface water movement.', grp: grpNajafgarh1.id, sub: 'usr-cit-10', lat: 28.6040, lon: 77.0290 },
    { id: 'prb-delhi-04', code: 'PRB-2026-4104', title: 'Sector 8 storm pump motor burned due to silt entry', desc: 'Heavy sediment intake destroyed bearings of 150 HP stormwater evacuation pump during last week rain event.', grp: grpNajafgarh2.id, sub: 'usr-cit-10', lat: 28.5830, lon: 77.0650 },
    { id: 'prb-delhi-05', code: 'PRB-2026-4105', title: 'Unprotected electrical panels at pumping station', desc: 'Electrical switchgear submerged under 2 feet of backflow water inside pump house making emergency startup impossible.', grp: grpNajafgarh2.id, sub: 'usr-cit-10', lat: 28.5815, lon: 77.0640 },
  ];

  for (const p of delhiNajafgarhProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'FLOOD_ENVIRONMENT',
      status: 'GROUPED',
      aiSeverity: 'SEVERE',
      govSeverity: 'SEVERE',
      aiPriority: 'HIGH',
      govPriority: 'HIGH',
      aiAffectedPopulation: 35000,
      populationStatus: 'KNOWN',
      populationProvenance: 'Delhi Disaster Management Authority Hazard Atlas',
      latitude: p.lat,
      longitude: p.lon,
      district: 'South West Delhi',
      state: 'Delhi',
      submitterId: p.sub,
      groupId: p.grp,
      challengeId: chalNajafgarh.id,
    });
  }

  // ==========================================================================
  // CHALLENGE 5: Construction Dust Spikes in Anand Vihar Transit Hub (Delhi)
  // ==========================================================================
  const chalAnandVihar = await prisma.challenge.upsert({
    where: { id: 'chal-delhi-anandvihar' },
    create: {
      id: 'chal-delhi-anandvihar',
      title: 'Unregulated Construction Dust & Particulate Matter Spikes in Anand Vihar Transit Hub',
      description: 'Continuous airborne PM10 and PM2.5 concentrations exceeding 450 ug/m3 generated by unpaved bus terminals, uncurtained metro transit expansion construction, and uncovered commercial aggregate hauling.',
      category: 'ENVIRONMENT',
      severity: 'SEVERE',
      priority: 'HIGH',
      priorityScore: 79.0,
      status: 'UNDER_GOV_REVIEW',
      submitterId: 'usr-cit-11',
      latitude: 28.6470,
      longitude: 77.3160,
      address: 'Anand Vihar ISBT & Railway Station Vicinity, East Delhi',
      district: 'East Delhi',
      state: 'Delhi',
      affectedPopulation: 90000,
      durationMonths: 10,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 5 * 86400000),
      verifiedById: officerDelhi.id,
      verificationNotes: 'Continuous Ambient Air Quality Monitoring Station (CAAQMS) data confirms particulate spike. Under government review for university mist canopy pilot.',
    },
    update: {
      status: 'UNDER_GOV_REVIEW',
    },
  });

  const grpAnandVihar1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-delhi-anandvihar-01' },
    create: {
      id: 'grp-delhi-anandvihar-01',
      title: 'ISBT & Railway Station Approach Dust Corridor',
      canonicalCategory: 'ENVIRONMENT',
      relationshipStrength: 0.92,
      factorBreakdown: { spatial: 0.94, semantic: 0.9, temporal: 0.92 },
      challengeId: chalAnandVihar.id,
    },
    update: { challengeId: chalAnandVihar.id },
  });

  const grpAnandVihar2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-delhi-anandvihar-02' },
    create: {
      id: 'grp-delhi-anandvihar-02',
      title: 'Surajmal Vihar Building Construction Encroachment',
      canonicalCategory: 'ENVIRONMENT',
      relationshipStrength: 0.85,
      factorBreakdown: { spatial: 0.88, semantic: 0.84, temporal: 0.84 },
      challengeId: chalAnandVihar.id,
    },
    update: { challengeId: chalAnandVihar.id },
  });

  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalAnandVihar.id, groupId: grpAnandVihar1.id } },
    create: { challengeId: chalAnandVihar.id, groupId: grpAnandVihar1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalAnandVihar.id, groupId: grpAnandVihar2.id } },
    create: { challengeId: chalAnandVihar.id, groupId: grpAnandVihar2.id },
    update: {},
  });

  const anandViharProblems = [
    { id: 'prb-delhi-11', code: 'PRB-2026-5101', title: 'Blinding dust storms raised by interstate bus movements', desc: 'Unpaved departure bays at Anand Vihar ISBT create continuous dust plumes engulfing passengers and street vendors.', grp: grpAnandVihar1.id, sub: 'usr-cit-11', lat: 28.6470, lon: 77.3160 },
    { id: 'prb-delhi-12', code: 'PRB-2026-5102', title: 'Open transit flyover construction without green barricades', desc: 'Contractor crushing concrete rubble along road median without water sprinkling or dust barrier curtains.', grp: grpAnandVihar1.id, sub: 'usr-cit-12', lat: 28.6485, lon: 77.3175 },
    { id: 'prb-delhi-13', code: 'PRB-2026-5103', title: 'Overloaded dumper trucks dropping fine silt on road', desc: 'Over 40 uncovered trucks enter the transit road daily spreading dry crushed limestone which gets pulverized into fine PM2.5.', grp: grpAnandVihar1.id, sub: 'usr-cit-11', lat: 28.6455, lon: 77.3140 },
    { id: 'prb-delhi-14', code: 'PRB-2026-5104', title: 'Uncovered aggregate storage pile on public road', desc: 'Commercial sand and coarse gravel stored openly on half the carriageway, blowing directly into Surajmal Vihar residences.', grp: grpAnandVihar2.id, sub: 'usr-cit-12', lat: 28.6550, lon: 77.3050 },
    { id: 'prb-delhi-15', code: 'PRB-2026-5105', title: 'Dry manual sweeping without vacuum or wet suppressants', desc: 'Sanitation workers using dry brooms at 8 AM, throwing dense dust clouds directly at eye level during school bus timings.', grp: grpAnandVihar2.id, sub: 'usr-cit-12', lat: 28.6565, lon: 77.3065 },
  ];

  for (const p of anandViharProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'ENVIRONMENT',
      status: 'GROUPED',
      aiSeverity: 'SEVERE',
      govSeverity: 'SEVERE',
      aiPriority: 'HIGH',
      govPriority: 'HIGH',
      aiAffectedPopulation: 40000,
      populationStatus: 'KNOWN',
      populationProvenance: 'Delhi Pollution Control Committee Monitoring Data',
      latitude: p.lat,
      longitude: p.lon,
      district: 'East Delhi',
      state: 'Delhi',
      submitterId: p.sub,
      groupId: p.grp,
      challengeId: chalAnandVihar.id,
    });
  }

  // ==========================================================================
  // CHALLENGE 6: Intermittent Potable Water Contamination in Old City Mathura
  // ==========================================================================
  const chalMathuraWater = await prisma.challenge.upsert({
    where: { id: 'chal-mathura-water' },
    create: {
      id: 'chal-mathura-water',
      title: 'Intermittent Potable Water Contamination & Coliform Seepage in Old City Mathura',
      description: 'Aged cast-iron distribution pipelines running adjacent to medieval open stone gutters develop negative suction pressure during non-supply hours, drawing contaminated drain seepage into the municipal potable drinking water network.',
      category: 'WATER_SUPPLY',
      severity: 'SEVERE',
      priority: 'CRITICAL',
      priorityScore: 88.0,
      status: 'APPROVED',
      submitterId: 'usr-cit-03',
      latitude: 27.5020,
      longitude: 77.6830,
      address: 'Dwarkadhish Temple Lane to Vishram Ghat, Mathura, Uttar Pradesh',
      district: 'Mathura',
      state: 'Uttar Pradesh',
      affectedPopulation: 32000,
      durationMonths: 12,
      isCanonical: true,
      verifiedAt: new Date(Date.now() - 10 * 86400000),
      verifiedById: officerMathura.id,
      verificationNotes: 'Jal Sansthan bacteriological report confirmed E. coli contamination in 4 out of 6 tap samples. Approved for acoustic leak inspection.',
    },
    update: {
      status: 'APPROVED',
    },
  });

  const grpMathuraWater1 = await prisma.problemGroup.upsert({
    where: { id: 'grp-mathura-water-01' },
    create: {
      id: 'grp-mathura-water-01',
      title: 'Dwarkadhish Temple Lane Supply Contamination',
      canonicalCategory: 'WATER_SUPPLY',
      relationshipStrength: 0.95,
      factorBreakdown: { spatial: 0.97, semantic: 0.94, temporal: 0.94 },
      challengeId: chalMathuraWater.id,
    },
    update: { challengeId: chalMathuraWater.id },
  });

  const grpMathuraWater2 = await prisma.problemGroup.upsert({
    where: { id: 'grp-mathura-water-02' },
    create: {
      id: 'grp-mathura-water-02',
      title: 'Vishram Ghat Pipeline Pressure Loss & Negative Suction',
      canonicalCategory: 'WATER_SUPPLY',
      relationshipStrength: 0.88,
      factorBreakdown: { spatial: 0.91, semantic: 0.85, temporal: 0.88 },
      challengeId: chalMathuraWater.id,
    },
    update: { challengeId: chalMathuraWater.id },
  });

  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalMathuraWater.id, groupId: grpMathuraWater1.id } },
    create: { challengeId: chalMathuraWater.id, groupId: grpMathuraWater1.id },
    update: {},
  });
  await prisma.challengeGroup.upsert({
    where: { challengeId_groupId: { challengeId: chalMathuraWater.id, groupId: grpMathuraWater2.id } },
    create: { challengeId: chalMathuraWater.id, groupId: grpMathuraWater2.id },
    update: {},
  });

  const mathuraWaterProblems = [
    { id: 'prb-mwater-01', code: 'PRB-2026-6101', title: 'Black foul-smelling water coming from tap in morning', desc: 'For the first 15 minutes of supply at 6:30 AM, water is dark brown with noticeable fecal odor before clearing up slightly.', grp: grpMathuraWater1.id, sub: 'usr-cit-03', lat: 27.5020, lon: 77.6830 },
    { id: 'prb-mwater-02', code: 'PRB-2026-6102', title: 'Multiple cases of acute gastroenteritis in lane 4', desc: 'Over 14 family members across 3 adjoining houses hospitalized with diarrhea and vomiting suspected from municipal tap supply.', grp: grpMathuraWater1.id, sub: 'usr-cit-04', lat: 27.5028, lon: 77.6835 },
    { id: 'prb-mwater-03', code: 'PRB-2026-6103', title: 'Water pipe crossing directly through masonry sewer', desc: 'Visible 3-inch GI pipe has rusted through where it passes inside the municipal sewer channel behind the sweet shop.', grp: grpMathuraWater1.id, sub: 'usr-cit-03', lat: 27.5015, lon: 77.6822 },
    { id: 'prb-mwater-04', code: 'PRB-2026-6104', title: 'Total pressure drop during morning supply hours', desc: 'Taps on upper floors get zero water while lower floor suction pumps pull air and sludge into the delivery lines.', grp: grpMathuraWater2.id, sub: 'usr-cit-04', lat: 27.5050, lon: 77.6880 },
    { id: 'prb-mwater-05', code: 'PRB-2026-6105', title: 'Siphon effect sucking drain water when valve is shut', desc: 'When main booster pump shuts down, water line hisses loudly and sucks drain overflow through loose joints.', grp: grpMathuraWater2.id, sub: 'usr-cit-03', lat: 27.5058, lon: 77.6888 },
  ];

  for (const p of mathuraWaterProblems) {
    await upsertProblemSafely({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.desc,
      category: 'WATER_SUPPLY',
      status: 'GROUPED',
      aiSeverity: 'SEVERE',
      govSeverity: 'SEVERE',
      aiPriority: 'CRITICAL',
      govPriority: 'CRITICAL',
      aiAffectedPopulation: 18000,
      populationStatus: 'KNOWN',
      populationProvenance: 'Mathura Jal Sansthan Public Health Surveillance',
      latitude: p.lat,
      longitude: p.lon,
      district: 'Mathura',
      state: 'Uttar Pradesh',
      wardNumber: 'Ward 4',
      submitterId: p.sub,
      groupId: p.grp,
      challengeId: chalMathuraWater.id,
    });
  }

  // ==========================================================================
  // ISOLATED / INDEPENDENT PROBLEMS (Demonstrating non-clustering independence)
  // ==========================================================================
  console.log('\n[4/10] Seeding Genuinely Independent Isolated Problems...');

  const isolatedProblems = [
    {
      id: 'prb-iso-01',
      code: 'PRB-2026-9001',
      title: 'Sodium vapor street light flickering and sparking',
      desc: 'Single pole street light fixture in residential cul-de-sac sparks repeatedly at night and turns off after 9 PM. No other electrical issues in neighborhood.',
      cat: 'ELECTRICITY',
      lat: 23.2500,
      lon: 77.4000,
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      sub: 'usr-cit-06',
    },
    {
      id: 'prb-iso-02',
      code: 'PRB-2026-9002',
      title: 'Overhanging banyan tree branch contacting 11kV distribution line',
      desc: 'Heavy banyan tree branch resting directly on single-phase 11kV LT wire near Krishna Nagar market gate, needs municipal pruning.',
      cat: 'ELECTRICITY',
      lat: 27.4900,
      lon: 77.6700,
      district: 'Mathura',
      state: 'Uttar Pradesh',
      sub: 'usr-cit-02',
    },
    {
      id: 'prb-iso-03',
      code: 'PRB-2026-9003',
      title: 'Broken swing chain in community children park',
      desc: 'Iron chain on children swing broken and hanging loose in Sector 14 DDA park, posing minor injury hazard.',
      cat: 'PUBLIC_INFRASTRUCTURE',
      lat: 28.5900,
      lon: 77.0200,
      district: 'South West Delhi',
      state: 'Delhi',
      sub: 'usr-cit-10',
    },
    {
      id: 'prb-iso-04',
      code: 'PRB-2026-9004',
      title: 'Stray animal carcass removal request',
      desc: 'Dead bovine carcass on bypass service road shoulder near Kolar culvert requires urgent municipal carcass disposal vehicle.',
      cat: 'SANITATION',
      lat: 23.1600,
      lon: 77.4100,
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      sub: 'usr-cit-07',
    },
  ];

  for (const p of isolatedProblems) {
    const existing = await prisma.problem.findFirst({
      where: {
        OR: [{ id: p.id }, { code: p.code }],
      },
    });

    if (existing) {
      await prisma.problem.update({
        where: { id: existing.id },
        data: {
          code: p.code,
          title: p.title,
          description: p.desc,
          category: p.cat,
          status: 'SUBMITTED',
          aiSeverity: 'MODERATE',
          govSeverity: 'MODERATE',
          aiPriority: 'LOW',
          govPriority: 'LOW',
          aiAffectedPopulation: 45,
          populationStatus: 'KNOWN',
          populationProvenance: 'Direct Citizen Observation',
          latitude: p.lat,
          longitude: p.lon,
          district: p.district,
          state: p.state,
          submitterId: p.sub,
        },
      });
    } else {
      await prisma.problem.create({
        data: {
          id: p.id,
          code: p.code,
          title: p.title,
          description: p.desc,
          category: p.cat,
          status: 'SUBMITTED',
          aiSeverity: 'MODERATE',
          govSeverity: 'MODERATE',
          aiPriority: 'LOW',
          govPriority: 'LOW',
          aiAffectedPopulation: 45,
          populationStatus: 'KNOWN',
          populationProvenance: 'Direct Citizen Observation',
          latitude: p.lat,
          longitude: p.lon,
          district: p.district,
          state: p.state,
          submitterId: p.sub,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. UNIVERSITY MATCHES & MULTIDISCIPLINARY TEAMS
  // --------------------------------------------------------------------------
  console.log('\n[5/10] Seeding University Matches & Multidisciplinary Teams...');

  // GLA accepted Challenge 1 (Mathura Drainage)
  await prisma.universityMatch.upsert({
    where: { id: 'match-gla-mathura' },
    create: {
      id: 'match-gla-mathura',
      challengeId: chalMathura.id,
      universityOrgId: gla.id,
      matchScore: 96.5,
      matchReasons: [
        'Geographic proximity within municipal boundary (< 12 km)',
        'Faculty expertise in urban hydrology and sedimentation (Dr. Arun Sharma)',
        'Active LoRaWAN smart sensing lab capabilities (Dr. Meenakshi Sundaram)',
        'Active student researcher cohort in Civil & IoT departments',
      ],
      status: 'ACCEPTED',
    },
    update: { status: 'ACCEPTED' },
  });

  // Multidisciplinary Team for Mathura
  const teamMathura = await prisma.multidisciplinaryTeam.upsert({
    where: { id: 'team-gla-smartdrainage' },
    create: {
      id: 'team-gla-smartdrainage',
      name: 'GLA Smart Drainage & Silt Mitigation Consortium',
      challengeId: chalMathura.id,
      leadFacultyId: 'usr-fac-gla-01', // Dr. Arun Sharma
    },
    update: {},
  });

  // Team members: Lead Faculty, Co-Faculty, Students
  const mathuraTeamMembers = [
    { userId: 'usr-fac-gla-01', role: 'LEAD_FACULTY' },
    { userId: 'usr-fac-gla-02', role: 'CO_FACULTY' },
    { userId: 'usr-std-gla-01', role: 'STUDENT_RESEARCHER' },
    { userId: 'usr-std-gla-02', role: 'STUDENT_RESEARCHER' },
    { userId: 'usr-std-gla-03', role: 'STUDENT_RESEARCHER' },
  ];

  for (const tm of mathuraTeamMembers) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teamMathura.id, userId: tm.userId } },
      create: {
        teamId: teamMathura.id,
        userId: tm.userId,
        roleInTeam: tm.role as any,
        invitationStatus: 'ACCEPTED',
      },
      update: {},
    });
  }

  // IIT Bombay accepted Challenge 3 (Indrayani River)
  await prisma.universityMatch.upsert({
    where: { id: 'match-iitb-indrayani' },
    create: {
      id: 'match-iitb-indrayani',
      challengeId: chalIndrayani.id,
      universityOrgId: iitb.id,
      matchScore: 98.0,
      matchReasons: [
        'National premier Centre for Environmental Science and Engineering (CESE)',
        'Prof. Sunita Rao research in industrial surfactant forensics',
        'Demonstrated deployment record in MPCB river basin monitoring',
      ],
      status: 'ACCEPTED',
    },
    update: { status: 'ACCEPTED' },
  });

  const teamIndrayani = await prisma.multidisciplinaryTeam.upsert({
    where: { id: 'team-iitb-riverforensics' },
    create: {
      id: 'team-iitb-riverforensics',
      name: 'IITB Environmental River Forensics Taskforce',
      challengeId: chalIndrayani.id,
      leadFacultyId: 'usr-fac-iitb-02', // Prof. Sunita Rao
    },
    update: {},
  });

  const indrayaniTeamMembers = [
    { userId: 'usr-fac-iitb-02', role: 'LEAD_FACULTY' },
    { userId: 'usr-std-iitb-02', role: 'STUDENT_RESEARCHER' },
    { userId: 'usr-std-iitb-03', role: 'STUDENT_RESEARCHER' },
    { userId: 'usr-std-iitb-05', role: 'STUDENT_RESEARCHER' },
  ];

  for (const tm of indrayaniTeamMembers) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teamIndrayani.id, userId: tm.userId } },
      create: {
        teamId: teamIndrayani.id,
        userId: tm.userId,
        roleInTeam: tm.role as any,
        invitationStatus: 'ACCEPTED',
      },
      update: {},
    });
  }

  // IIT Bombay offered Challenge 2 (Bhopal Roads)
  await prisma.universityMatch.upsert({
    where: { id: 'match-iitb-bhopal' },
    create: {
      id: 'match-iitb-bhopal',
      challengeId: chalBhopal.id,
      universityOrgId: iitb.id,
      matchScore: 92.0,
      matchReasons: [
        'Prof. Rajesh Kulkarni expertise in monsoon subgrade pavement mechanics',
        'State-of-the-art heavy cyclic loading laboratory',
      ],
      status: 'OFFERED',
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 5. PROJECTS & 8-STAGE LIFECYCLE PROGRESSION
  // --------------------------------------------------------------------------
  console.log('\n[6/10] Seeding Projects Across Lifecycle Stages...');

  // Project 1: Mathura Smart Drainage Pilot (IN_PILOT)
  const projMathura = await prisma.project.upsert({
    where: { id: 'proj-mathura-siltbarrier' },
    create: {
      id: 'proj-mathura-siltbarrier',
      challengeId: chalMathura.id,
      teamId: teamMathura.id,
      title: 'Smart Gravity-Feed Silt Barrier & Ultrasonic Level Telemetry Pilot',
      description: 'Engineering deployment of 4 precast modular silt traps with integrated solar-powered ultrasonic liquid level sensors to prevent stormwater culvert choking during peak monsoon runoff.',
      status: 'PILOT',
      budget: 1250000,
      leadingOrgId: gla.id,
      activatedAt: new Date(Date.now() - 90 * 86400000),
    },
    update: { status: 'PILOT' },
  });

  // Project Milestones for Mathura Pilot
  const mathuraMilestones = [
    { title: 'Culvert Cross-Section & Hydraulic Gradient Survey', status: 'APPROVED', pct: 100 },
    { title: 'Precast Silt Barrier Fabrication & Mechanical Fitment', status: 'APPROVED', pct: 100 },
    { title: 'LoRaWAN Ultrasonic Water Level Sensor Calibration', status: 'APPROVED', pct: 100 },
    { title: 'Monsoon Runoff Stress Testing & Desiltation Cycle Logging', status: 'IN_PROGRESS', pct: 65 },
    { title: 'Municipal Handover & Final Operational SLA Audit', status: 'PENDING', pct: 0 },
  ];

  for (let i = 0; i < mathuraMilestones.length; i++) {
    const m = mathuraMilestones[i];
    await prisma.projectMilestone.upsert({
      where: { id: `m-mathura-${i + 1}` },
      create: {
        id: `m-mathura-${i + 1}`,
        projectId: projMathura.id,
        title: m.title,
        description: `Deliverable milestone: ${m.title}`,
        orderNumber: i + 1,
        status: m.status as any,
        deadline: new Date(Date.now() + (i - 2) * 30 * 86400000),
        progressPct: m.pct,
      },
      update: {},
    });
  }

  // Project 2: Indrayani River Sentinel Deployment (DEPLOYMENT -> OUTCOME_VERIFIED)
  const projIndrayani = await prisma.project.upsert({
    where: { id: 'proj-indrayani-sentinels' },
    create: {
      id: 'proj-indrayani-sentinels',
      challengeId: chalIndrayani.id,
      teamId: teamIndrayani.id,
      title: 'Autonomous Spectrophotometric Water Quality Sentinel Nodes',
      description: 'Continuous solar-powered buoy telemetry measuring optical absorption, dissolved oxygen, and chemical surfactant spikes in real-time, interfaced with MPCB command center for automated industrial gate enforcement.',
      status: 'COMPLETED',
      budget: 3200000,
      leadingOrgId: iitb.id,
      activatedAt: new Date(Date.now() - 180 * 86400000),
    },
    update: { status: 'COMPLETED' },
  });

  // --------------------------------------------------------------------------
  // 6. INDUSTRY COLLABORATIONS & CSR FUNDING
  // --------------------------------------------------------------------------
  console.log('\n[7/10] Seeding Industry Partnerships & CSR Grants...');

  // CleanGrid partnered on Indrayani Project
  const partCleanGrid = await prisma.industryPartnership.upsert({
    where: { id: 'part-cleangrid-indrayani' },
    create: {
      id: 'part-cleangrid-indrayani',
      projectId: projIndrayani.id,
      partnerOrgId: cleanGrid.id,
      partnershipType: 'CSR',
      status: 'CONFIRMED',
      fundingOffered: 2500000,
      equipmentOffered: '6 optical spectrophotometric water quality sensor buoys along Dehu-Alandi ghat. Deployment technician support and cloud telemetry server infrastructure.',
    },
    update: {},
  });

  // Mahindra MSME partnered on Mathura Drainage Project
  await prisma.industryPartnership.upsert({
    where: { id: 'part-mahindra-mathura' },
    create: {
      id: 'part-mahindra-mathura',
      projectId: projMathura.id,
      partnerOrgId: mahindraMsme.id,
      partnershipType: 'PROTOTYPE_SUPPORT',
      status: 'CONFIRMED',
      fundingOffered: 650000,
      equipmentOffered: 'Fabrication and supply of 12 precast self-cleaning culvert inserts with ultrasonic sensor mounting bays.',
    },
    update: {},
  });

  // --------------------------------------------------------------------------
  // 7. VERIFIED OUTCOMES & TWO-LEVEL SOLUTION MEMORY
  // --------------------------------------------------------------------------
  console.log('\n[8/10] Seeding Verified Outcomes & Two-Level Solution Memory...');

  // Verified Outcome for Indrayani
  await prisma.innovationOutcome.upsert({
    where: { id: 'outcome-indrayani-verified' },
    create: {
      id: 'outcome-indrayani-verified',
      challengeId: chalIndrayani.id,
      projectId: projIndrayani.id,
      title: '42% Reduction in Chemical Frothing and Surfactant Ingress along Dehu-Alandi Ghat',
      description: 'Automated 15-minute optical sensor telemetry detected 3 illicit nighttime industrial discharges within 10 days of deployment. Immediate MPCB regulatory sealing of illegal bypass lines resulted in dissolved oxygen recovery from 0.8 mg/L to 4.9 mg/L and elimination of hazardous surface frothing.',
      outcomeType: 'SOCIAL_IMPACT',
      measurableImpactSummary: 'Dissolved oxygen improved from 0.8 to 4.9 mg/L; 42% reduction in chemical frothing; 6 sensor nodes operational.',
      verifiedBeneficiaries: 18000,
      responsibleOrg: 'IIT Bombay CESE & MPCB',
      isVerified: true,
      verifiedById: officerMumbai.id,
      verifiedAt: new Date(Date.now() - 8 * 86400000),
    },
    update: {},
  });

  // Precedents in Solution Memory (8 Records across categories)
  const solutionMemories = [
    {
      id: 'mem-01',
      title: 'Gravity-Feed Hydrodynamic Silt Trap in Semi-Urban Culverts',
      cat: 'SANITATION',
      class: 'PREVIOUSLY_WORKED',
      solClass: 'HIGHLY_REUSABLE',
      interv: 'Installation of precast sediment baffle chambers upstream of box culverts to drop suspended solids before entering main drainage channels.',
      evidence: 'Mathura Western Sector Municipal Pilot — 78% reduction in downstream culvert blockage frequency over 12 months.',
      whatWorked: 'Baffle chambers trapped 90% of coarse sand and solid debris. Semi-annual municipal vac-truck suction cleared traps in 20 minutes.',
      whatFailed: 'Fine clay particles still pass through without secondary flocculant mats.',
      limits: 'Requires minimum 0.8% hydraulic gradient to prevent upstream back-pooling.',
      cost: 450000,
    },
    {
      id: 'mem-02',
      title: 'Continuous Autonomous Optical Telemetry for River Effluent Compliance',
      cat: 'WATER_SUPPLY',
      class: 'PREVIOUSLY_WORKED',
      solClass: 'HIGHLY_REUSABLE',
      interv: 'Deployment of solar-powered floating spectrophotometric sensors sending real-time BOD/COD telemetry to pollution control authorities.',
      evidence: 'Indrayani River Pilgrim Corridor Deployment — automated alert dispatch led to sealing of 3 illegal industrial bypass lines.',
      whatWorked: 'Nighttime illegal discharge window eliminated due to 24/7 automated timestamped optical logs.',
      whatFailed: 'Sensor glass requires automated wiper or ultrasonic transducer to prevent organic biofouling.',
      limits: 'Requires cellular 4G/NB-IoT network coverage along river bank.',
      cost: 1800000,
    },
    {
      id: 'mem-03',
      title: 'Cold-Mix Bitumen Patching During Active Monsoon Conditions',
      cat: 'ROAD_TRANSPORT',
      class: 'NOT_WORKED',
      solClass: 'NOT_RECOMMENDED',
      interv: 'Emergency filling of road craters with commercial cold-mix asphalt during continuous rain without edge tack coating.',
      evidence: 'Bhopal Kolar Road Pilot 2024 — 82% of cold patches dislodged and disintegrated within 9 days of vehicle passage.',
      whatWorked: 'Immediate traffic calming for first 48 hours.',
      whatFailed: 'Water trapped in unsealed pavement voids hydrostatic stripping of bitumen under heavy truck tire impact.',
      limits: 'Do NOT use cold patches in standing water without pneumatic water evacuation and cationic rapid-setting tack emulsion.',
      cost: 320000,
    },
    {
      id: 'mem-04',
      title: 'Geosynthetic Biaxial Geogrid Reinforcement over Weak Expansive Subgrade',
      cat: 'ROAD_TRANSPORT',
      class: 'PREVIOUSLY_WORKED',
      solClass: 'HIGHLY_REUSABLE',
      interv: 'Laying biaxial polypropylene geogrid over compacted black-cotton soil subgrade with non-woven geotextile separation layer.',
      evidence: 'Bhopal Bypass Arterial Paving — zero subgrade rutting observed across 2 monsoon seasons.',
      whatWorked: 'Interlocking of crushed aggregate in geogrid apertures eliminated lateral spreading and subgrade intrusion.',
      whatFailed: 'Requires strict trench compaction standards before grid laying.',
      limits: 'Initial capital cost 22% higher than standard granular sub-base.',
      cost: 2400000,
    },
    {
      id: 'mem-05',
      title: 'Dry Anti-Smog Fog Cannon Misting at Transit Terminals',
      cat: 'ENVIRONMENT',
      class: 'MIXED_OUTCOME',
      solClass: 'CONDITIONALLY_REUSABLE',
      interv: 'Truck-mounted high-pressure mist cannons spraying fine water droplets into air over unpaved transit terminal bays.',
      evidence: 'Anand Vihar ISBT Trials — PM10 dropped by 38% for 45 minutes, but rebounded rapidly once ground dried.',
      whatWorked: 'Substantial immediate dust knockdown in direct line of mist nozzle.',
      whatFailed: 'Heavy water consumption (12,000 L/hr); unpaved mud track turned into slippery sludge when oversprayed.',
      limits: 'Must be combined with permanent bitumen paving or chemical dust-binding crust sealants (calcium chloride).',
      cost: 650000,
    },
    {
      id: 'mem-06',
      title: 'Acoustic Pipe Correlator Leak Inspection on Intermittent Gravity Networks',
      cat: 'WATER_SUPPLY',
      class: 'PREVIOUSLY_WORKED',
      solClass: 'HIGHLY_REUSABLE',
      interv: 'Deploying dual-sensor acoustic leak listening correlators on hydrants and valves during midnight pressurization cycles.',
      evidence: 'Mathura Old City Jal Sansthan Inspection — successfully pinpointed 7 underground pipe fissures within 0.5m accuracy.',
      whatWorked: 'Non-destructive acoustic listening eliminated arbitrary road trenching.',
      whatFailed: 'Cannot detect leaks during non-supply depressurized hours.',
      limits: 'Requires network to be maintained at minimum 1.5 bar pressure during listening window.',
      cost: 280000,
    },
    {
      id: 'mem-07',
      title: 'Manual Cleaning of Silt Reservoirs Without Gradient Correction',
      cat: 'SANITATION',
      class: 'NOT_WORKED',
      solClass: 'NOT_RECOMMENDED',
      interv: 'Annual municipal manual shovel desilting of culvert without addressing reverse slope invert gradient.',
      evidence: 'Mathura Ward 18 Municipal Desiltation 2024 — drain re-silted completely within 22 days of first monsoon spell.',
      whatWorked: 'Temporary 3-week relief.',
      whatFailed: 'Hydraulic velocity remained below self-cleansing speed (0.6 m/s), guaranteeing immediate re-sedimentation.',
      limits: 'Desilting without hydraulic slope correction or silt baffle traps is an unsustainable recurring waste of municipal funds.',
      cost: 180000,
    },
    {
      id: 'mem-08',
      title: 'Low-Pressure Sodium Mist Neutralization for Industrial Odor Control',
      cat: 'ENVIRONMENT',
      class: 'MIXED_OUTCOME',
      solClass: 'CONDITIONALLY_REUSABLE',
      interv: 'Atomized alkaline mist barrier around perimeter of open municipal drainage nullah to neutralize hydrogen sulfide odor.',
      evidence: 'Pune Dehu Nullah Trail — 60% odor reduction within 50m radius, negligible effect on water contamination.',
      whatWorked: 'Effective temporary masking of organic mercaptans during religious festival gatherings.',
      whatFailed: 'Zero effect on underlying chemical water toxicity or river BOD.',
      limits: 'Cosmetic odor masking must not replace upstream industrial effluent interception.',
      cost: 380000,
    },
  ];

  for (const m of solutionMemories) {
    await prisma.solutionMemory.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        title: m.title,
        summary: m.interv,
        challengeCategory: m.cat,
        problemSummary: m.evidence,
        rootCause: 'Systemic infrastructure deficiency and operational limitations',
        technicalApproach: m.interv,
        lessonsLearned: `${m.whatWorked}. ${m.whatFailed}`,
        status: 'PUBLISHED',
        outcomeStatus: m.class === 'PREVIOUSLY_WORKED' ? 'SUCCESSFUL' : m.class === 'NOT_WORKED' ? 'FAILED' : 'PARTIAL_SUCCESS',
        reusabilityClass: m.solClass as any,
        whatWorked: m.whatWorked,
        whatFailed: m.whatFailed,
        limitations: m.limits,
      },
      update: {},
    });

    // Also link to GroupSolutionMemory for the primary groups
    if (m.cat === 'SANITATION') {
      await prisma.groupSolutionMemory.upsert({
        where: { id: `grp-mem-${m.id}` },
        create: {
          id: `grp-mem-${m.id}`,
          groupId: grpMathura1.id,
          title: m.title,
          intervention: m.interv,
          classification: m.class as any,
          evidenceSource: m.evidence,
        },
        update: {},
      });
    }
  }

  // --------------------------------------------------------------------------
  // 8. CLARIFICATION THREADS (GROUP-LEVEL & PROBLEM-LEVEL)
  // --------------------------------------------------------------------------
  console.log('\n[9/10] Seeding Group & Problem Clarification Threads...');

  // Group-Level Clarification in Mathura Challenge
  const reqGroupMathura = await prisma.clarificationRequest.upsert({
    where: { id: 'clar-grp-mathura-01' },
    create: {
      id: 'clar-grp-mathura-01',
      challengeId: chalMathura.id,
      groupId: grpMathura1.id,
      targetScope: 'GROUP',
      requestedById: officerMathura.id,
      question: 'Please specify the exact time of day when the drain overflow reaches peak height, and whether it overflows even during dry non-rainy days.',
      status: 'RESPONDED',
    },
    update: { status: 'RESPONDED' },
  });

  // Citizen Responses to Group Clarification
  await prisma.clarificationResponse.upsert({
    where: { id: 'resp-mathura-cit01' },
    create: {
      id: 'resp-mathura-cit01',
      requestId: reqGroupMathura.id,
      problemId: problemIdMap.get('prb-mathura-01') || 'prb-mathura-01',
      citizenId: 'usr-cit-01',
      response: 'Peak overflow occurs every morning between 7:00 AM and 9:30 AM, and again around 7:00 PM when residential households discharge domestic water. It overflows heavily even on completely dry sunny days.',
    },
    update: {},
  });

  await prisma.clarificationResponse.upsert({
    where: { id: 'resp-mathura-cit02' },
    create: {
      id: 'resp-mathura-cit02',
      requestId: reqGroupMathura.id,
      problemId: problemIdMap.get('prb-mathura-02') || 'prb-mathura-02',
      citizenId: 'usr-cit-02',
      response: 'The gutter overflows continuously without stopping. During dry weather it forms a 2-inch deep stream across the road; during rain it completely drowns the sidewalk within 10 minutes.',
    },
    update: {},
  });

  // Problem-Level Clarification in Bhopal Challenge
  const reqProbBhopal = await prisma.clarificationRequest.upsert({
    where: { id: 'clar-prb-bhopal-01' },
    create: {
      id: 'clar-prb-bhopal-01',
      challengeId: chalBhopal.id,
      groupId: grpBhopal1.id,
      problemId: problemIdMap.get('prb-bhopal-02') || 'prb-bhopal-02',
      targetScope: 'PROBLEM',
      requestedById: officerBhopal.id,
      question: 'Can you confirm which gas utility contractor excavated the trench, and whether any temporary barricading or warning signage was provided before the monsoon?',
      status: 'RESPONDED',
    },
    update: { status: 'RESPONDED' },
  });

  await prisma.clarificationResponse.upsert({
    where: { id: 'resp-bhopal-cit06' },
    create: {
      id: 'resp-bhopal-cit06',
      requestId: reqProbBhopal.id,
      problemId: problemIdMap.get('prb-bhopal-02') || 'prb-bhopal-02',
      citizenId: 'usr-cit-06',
      response: 'The trench was dug by Avantika Gas Limited sub-contractor in mid-March. No danger boards or yellow tapes were placed. They simply dumped loose soil and left before rain started.',
    },
    update: {},
  });

  // Seed Photographic and Statutory Field Evidence for Seeded Challenges
  const seededEvidenceRecords = [
    {
      id: 'ev-mathura-01',
      challengeId: chalMathura.id,
      fileKey: 'mathura_drainage_culvert_silt_obstruction.jpg',
      originalName: 'Mathura_Culvert_Inlet_Silt_Accumulation.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1845000,
      uploadedById: officerMathura.id,
    },
    {
      id: 'ev-mathura-02',
      challengeId: chalMathura.id,
      fileKey: 'mathura_monsoon_backflow_waterlogging.jpg',
      originalName: 'Ward18_Pilgrim_Corridor_Waterlogging_FieldRecord.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2420000,
      uploadedById: officerMathura.id,
    },
    {
      id: 'ev-bhopal-01',
      challengeId: chalBhopal.id,
      fileKey: 'bhopal_kolar_road_subgrade_cavitation.jpg',
      originalName: 'Kolar_Road_Crater_Subgrade_Failure_CorePhoto.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3120000,
      uploadedById: officerBhopal.id,
    },
    {
      id: 'ev-bhopal-02',
      challengeId: chalBhopal.id,
      fileKey: 'bhopal_utility_trench_uncompacted_settlement.jpg',
      originalName: 'Avantika_Gas_Trench_Settlement_Audit.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1980000,
      uploadedById: officerBhopal.id,
    },
  ];

  for (const ev of seededEvidenceRecords) {
    await prisma.challengeEvidence.upsert({
      where: { id: ev.id },
      create: {
        id: ev.id,
        challengeId: ev.challengeId,
        fileKey: ev.fileKey,
        originalName: ev.originalName,
        mimeType: ev.mimeType,
        sizeBytes: ev.sizeBytes,
        storageBucket: 'challenge-evidence',
        uploadedById: ev.uploadedById,
      },
      update: {},
    });
  }

  // --------------------------------------------------------------------------
  // 9. ROLE-SCOPED NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('\n[10/10] Seeding Role-Scoped Contextual Notifications...');

  const notificationSeeds = [
    // Citizen Notifications
    {
      recipientId: 'usr-cit-01',
      role: 'CITIZEN',
      portal: 'citizen',
      title: 'Problem Joined to Governed Challenge',
      msg: 'Your civic grievance "drainage issue in my locality" has been clustered into Challenge CHAL-MATHURA: "Urban Drainage Stagnation in Mathura Western Sector".',
      type: 'CHALLENGE_MERGED',
      url: '/my-challenges',
    },
    {
      recipientId: 'usr-cit-01',
      role: 'CITIZEN',
      portal: 'citizen',
      title: 'Official Clarification Requested',
      msg: 'Municipal Officer Er. Rakesh Verma requested clarification regarding peak overflow hours on your reported drainage issue.',
      type: 'CLARIFICATION_REQUEST',
      url: '/my-challenges',
    },
    {
      recipientId: 'usr-cit-08',
      role: 'CITIZEN',
      portal: 'citizen',
      title: 'Intervention Deployed & Verified',
      msg: 'Your report on Indrayani river chemical foaming has reached verified resolution. Sensor telemetry confirmed 42% effluent reduction.',
      type: 'OUTCOME_VERIFIED',
      url: '/my-challenges',
    },
    // Government Officer Notifications
    {
      recipientId: officerMathura.id,
      role: 'GOVERNMENT_OFFICER',
      portal: 'government',
      title: 'Citizen Clarification Submitted',
      msg: 'Citizen Anil Kumar Tiwari provided details on peak overflow hours for Mathura Western Drainage Cluster.',
      type: 'CLARIFICATION_RESPONSE',
      url: `/challenges/${chalMathura.id}`,
    },
    {
      recipientId: officerMathura.id,
      role: 'GOVERNMENT_OFFICER',
      portal: 'government',
      title: 'University Accepted Challenge Assignment',
      msg: 'GLA University Mathura officially accepted Challenge CHAL-MATHURA. Multidisciplinary R&D team formed.',
      type: 'UNIVERSITY_ACCEPTED',
      url: `/challenges/${chalMathura.id}`,
    },
    {
      recipientId: officerBhopal.id,
      role: 'GOVERNMENT_OFFICER',
      portal: 'government',
      title: 'Challenge Verified — University Routing Open',
      msg: 'Kolar Road Pavement Degradation verified by technical inspection. IIT Bombay recommended for structural geogrid design.',
      type: 'CHALLENGE_VERIFIED',
      url: `/challenges/${chalBhopal.id}`,
    },
    // University Admin Notifications
    {
      recipientId: glaAdmin.id,
      role: 'UNIVERSITY_ADMIN',
      portal: 'university',
      organizationId: gla.id,
      title: 'New Member Registration Awaiting Approval',
      msg: 'Mohit Rawat has registered as Student (Civil Engineering). Review registration to grant platform access.',
      type: 'REGISTRATION_PENDING',
      url: '/university?tab=registrations',
    },
    {
      recipientId: glaAdmin.id,
      role: 'UNIVERSITY_ADMIN',
      portal: 'university',
      organizationId: gla.id,
      title: 'Faculty Registration Awaiting Approval',
      msg: 'Dr. Kavita Nair has registered as Faculty (Environmental Engineering). Review qualifications to approve account.',
      type: 'REGISTRATION_PENDING',
      url: '/university?tab=registrations',
    },
    {
      recipientId: glaAdmin.id,
      role: 'UNIVERSITY_ADMIN',
      portal: 'university',
      organizationId: gla.id,
      title: 'Government Challenge Assignment Received',
      msg: 'Mathura Nagar Nigam routed Challenge "Urban Drainage Stagnation" to GLA University. Match score: 96.5%.',
      type: 'CHALLENGE_ROUTED',
      url: '/university?tab=assigned',
    },
    // Faculty Notifications
    {
      recipientId: 'usr-fac-gla-01',
      role: 'FACULTY',
      portal: 'university',
      organizationId: gla.id,
      title: 'Appointed Lead Faculty for Multidisciplinary Team',
      msg: 'You have been designated Lead Faculty for the GLA Smart Drainage & Silt Mitigation Consortium.',
      type: 'TEAM_ASSIGNMENT',
      url: '/university?tab=teams',
    },
    {
      recipientId: 'usr-fac-iitb-02',
      role: 'FACULTY',
      portal: 'university',
      organizationId: iitb.id,
      title: 'Project Outcome Formally Verified by Government',
      msg: 'MMRDA and MPCB verified the telemetry outcome report for Indrayani River Sentinel Nodes. Published to Solution Memory.',
      type: 'OUTCOME_VERIFIED',
      url: '/solutions',
    },
    // Student Notifications
    {
      recipientId: 'usr-std-gla-01',
      role: 'STUDENT',
      portal: 'university',
      organizationId: gla.id,
      title: 'Added to Multidisciplinary Research Team',
      msg: 'Dr. Arun Sharma added you to the GLA Smart Drainage Consortium as Student Researcher (Civil Modeling).',
      type: 'TEAM_INVITATION',
      url: '/university?tab=teams',
    },
    {
      recipientId: 'usr-std-gla-02',
      role: 'STUDENT',
      portal: 'university',
      organizationId: gla.id,
      title: 'Milestone In-Progress: LoRaWAN Telemetry Setup',
      msg: 'Ultrasonic sensor calibration milestone is currently active. Coordinate with Dr. Meenakshi Sundaram.',
      type: 'PROJECT_MILESTONE',
      url: '/university?tab=teams',
    },
    // Industry Notifications
    {
      recipientId: 'usr-ind-cleangrid',
      role: 'INDUSTRY_PARTNER',
      portal: 'industry',
      organizationId: cleanGrid.id,
      title: 'CSR Partnership Milestone Achieved',
      msg: 'Indrayani River sensor network successfully completed deployment. Telemetry data confirmed target impact metrics.',
      type: 'PARTNERSHIP_UPDATE',
      url: '/industry?tab=COLLABORATION',
    },
    {
      recipientId: 'usr-ind-mahindra',
      role: 'INDUSTRY_PARTNER',
      portal: 'industry',
      organizationId: mahindraMsme.id,
      title: 'Prototype Supply Order Confirmed',
      msg: 'GLA Smart Drainage Pilot confirmed receipt of 12 precast self-cleaning culvert inserts in Mathura Ward 18.',
      type: 'PROTOTYPE_UPDATE',
      url: '/industry?tab=COLLABORATION',
    },
  ];

  for (let i = 0; i < notificationSeeds.length; i++) {
    const notif = notificationSeeds[i];
    await prisma.notification.upsert({
      where: { id: `notif-seed-${i + 1}` },
      create: {
        id: `notif-seed-${i + 1}`,
        recipientId: notif.recipientId,
        recipientRole: notif.role,
        portal: notif.portal,
        organizationId: notif.organizationId || null,
        title: notif.title,
        message: notif.msg,
        type: notif.type,
        actionUrl: notif.url,
        isRead: false,
      },
      update: {},
    });
  }

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  const counts = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    facultyProfiles: await prisma.facultyProfile.count(),
    studentProfiles: await prisma.studentProfile.count(),
    challenges: await prisma.challenge.count(),
    problemGroups: await prisma.problemGroup.count(),
    problems: await prisma.problem.count(),
    universityMatches: await prisma.universityMatch.count(),
    teams: await prisma.multidisciplinaryTeam.count(),
    teamMembers: await prisma.teamMember.count(),
    partnerships: await prisma.industryPartnership.count(),
    projects: await prisma.project.count(),
    milestones: await prisma.projectMilestone.count(),
    outcomes: await prisma.innovationOutcome.count(),
    solutionMemories: await prisma.solutionMemory.count(),
    clarificationRequests: await prisma.clarificationRequest.count(),
    clarificationResponses: await prisma.clarificationResponse.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('\n====================================================');
  console.log('SICP PLATFORM UNIVERSE SEED COMPLETE (IDEMPOTENT)');
  console.log('====================================================');
  console.table(counts);

  return counts;
}

// Allow direct CLI execution
if (require.main === module) {
  seedPlatformUniverse()
    .then(() => {
      console.log('Seeding script finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding script encountered fatal error:', err);
      process.exit(1);
    });
}
