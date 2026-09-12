const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PREMIER_INDUSTRIES = [
  {
    name: 'CleanGrid Tech Innovations',
    slug: 'cleangrid-innovations',
    type: 'CSR',
    adminEmail: 'industry@sicp.gov.in',
    adminName: 'Aditya Birla CSR Lead',
    role: 'CSR_ORGANIZATION',
    district: 'Mumbai',
    state: 'Maharashtra',
    sector: 'Clean Energy & Climate Tech',
    capabilities: ['Funding', 'Technical Expertise', 'Testing', 'CSR Support'],
    technologies: ['IoT Sensors', 'Solar Microgrid', 'AI Environmental Monitoring'],
    fundingCapacity: 5000000,
    csrFocusAreas: ['Renewable Energy', 'Clean Water', 'Rural Electrification'],
    supportedStages: ['PILOT', 'DEPLOYMENT', 'TESTING'],
    geographicCoverage: ['Maharashtra', 'Gujarat', 'Karnataka'],
  },
  {
    name: 'Tata Power Renewable CSR',
    slug: 'tata-power-csr',
    type: 'CSR',
    adminEmail: 'tata.csr@sicp.gov.in',
    adminName: 'Ratan Tata CSR Lead',
    role: 'CSR_ORGANIZATION',
    district: 'Pune',
    state: 'Maharashtra',
    sector: 'Power & Renewable Energy',
    capabilities: ['Funding', 'Equipment', 'Deployment Support', 'CSR Support'],
    technologies: ['Smart Microgrid', 'Solar PV', 'Battery Energy Storage'],
    fundingCapacity: 10000000,
    csrFocusAreas: ['Power Infrastructure', 'Green Energy', 'Water Purification'],
    supportedStages: ['PROTOTYPE', 'PILOT', 'DEPLOYMENT'],
    geographicCoverage: ['National', 'Maharashtra', 'Madhya Pradesh'],
  },
  {
    name: 'Mahindra Rural Mobility MSME',
    slug: 'mahindra-msme',
    type: 'MSME',
    adminEmail: 'mahindra.msme@sicp.gov.in',
    adminName: 'Anand Mahindra MSME Lead',
    role: 'MSME',
    district: 'Pune',
    state: 'Maharashtra',
    sector: 'Rural Infrastructure & Transport',
    capabilities: ['Manufacturing', 'Prototyping', 'Testing Facilities', 'Equipment'],
    technologies: ['EV Retrofitting', 'Agricultural Machinery', 'Robotics Automation'],
    fundingCapacity: 2500000,
    csrFocusAreas: ['Rural Mobility', 'Civic Transportation', 'Farm Technology'],
    supportedStages: ['PROTOTYPE', 'TESTING', 'PILOT'],
    geographicCoverage: ['Maharashtra', 'Uttar Pradesh', 'Rajasthan'],
  },
  {
    name: 'Infosys Foundation Tech & Scale',
    slug: 'infosys-foundation',
    type: 'INDUSTRY',
    adminEmail: 'infosys.foundation@sicp.gov.in',
    adminName: 'Sudha Murthy Foundation Lead',
    role: 'INDUSTRY_PARTNER',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    sector: 'Software & Public Digital Infrastructure',
    capabilities: ['Technical Expertise', 'Mentorship', 'Cloud Infrastructure', 'Tech Transfer'],
    technologies: ['Cloud Platforms', 'Mobile Civic Apps', 'Distributed Data Pipelines'],
    fundingCapacity: 7500000,
    csrFocusAreas: ['Digital Civic Infrastructure', 'Open Source Health', 'Smart Cities'],
    supportedStages: ['PROTOTYPE', 'TESTING', 'PILOT', 'DEPLOYMENT'],
    geographicCoverage: ['Karnataka', 'Tamil Nadu', 'Delhi NCR', 'National'],
  },
];

async function main() {
  console.log('Seeding / verifying premier registered industries in PostgreSQL...');
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  for (const item of PREMIER_INDUSTRIES) {
    let org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: item.slug },
          { name: item.name },
        ],
      },
    });

    const metadata = {
      district: item.district,
      state: item.state,
      sector: item.sector,
      capabilities: item.capabilities,
      technologies: item.technologies,
      fundingCapacity: item.fundingCapacity,
      csrFocusAreas: item.csrFocusAreas,
      supportedStages: item.supportedStages,
      geographicCoverage: item.geographicCoverage,
      officialEmail: item.adminEmail,
      adminContactName: item.adminName,
      adminContactEmail: item.adminEmail,
      verificationNotes: 'Premier verified institutional industry partner for SICP',
    };

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: item.name,
          slug: item.slug,
          type: item.type,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          metadata,
        },
      });
      console.log('Created organization: ' + item.name + ' (' + org.id + ')');
    } else {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: {
          name: item.name,
          type: item.type,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          metadata,
        },
      });
      console.log('Updated organization: ' + item.name + ' (' + org.id + ')');
    }

    await prisma.industryPartnerProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        sector: item.sector,
        capabilities: item.capabilities,
        technologies: item.technologies,
        fundingCapacity: item.fundingCapacity,
        csrFocusAreas: item.csrFocusAreas,
        supportedStages: item.supportedStages,
        geographicCoverage: item.geographicCoverage,
      },
      update: {
        sector: item.sector,
        capabilities: item.capabilities,
        technologies: item.technologies,
        fundingCapacity: item.fundingCapacity,
        csrFocusAreas: item.csrFocusAreas,
        supportedStages: item.supportedStages,
        geographicCoverage: item.geographicCoverage,
      },
    });

    const existingUser = await prisma.user.findUnique({
      where: { email: item.adminEmail.toLowerCase() },
    });

    let user;
    if (!existingUser) {
      user = await prisma.user.create({
        data: {
          email: item.adminEmail.toLowerCase(),
          passwordHash: defaultPasswordHash,
          fullName: item.adminName,
          role: item.role,
          organizationId: org.id,
          isActive: true,
          emailVerified: true,
        },
      });
      console.log('Created user: ' + item.adminEmail + ' (' + item.role + ')');
    } else {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: item.adminName,
          role: item.role,
          organizationId: org.id,
          isActive: true,
          passwordHash: defaultPasswordHash,
        },
      });
      console.log('Updated user: ' + item.adminEmail + ' (' + item.role + ')');
    }

    const member = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: org.id,
      },
    });

    if (!member) {
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'ADMIN',
        },
      });
    }
  }

  console.log('Premier industries seed complete!');
}

main()
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
