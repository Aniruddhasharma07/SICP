const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PREMIER_UNIVERSITIES = [
  {
    name: 'GLA University, Mathura',
    slug: 'gla-mathura',
    adminEmail: 'sharmaaniruddha64@gmail.com',
    adminName: 'Prof. Aniruddha Sharma',
    district: 'Mathura',
    state: 'Uttar Pradesh',
    aisheCode: 'U-0512',
    naacGrade: 'A+',
    category: 'STATE_PRIVATE_UNIVERSITY',
    domains: ['Water Resources', 'Environmental Engineering', 'Civil Infrastructure', 'AI IoT Monitoring'],
    departments: ['Civil Engineering', 'Computer Science & Engineering', 'Biotechnology', 'Environmental Sciences'],
    facilities: ['Advanced Water Testing Lab', 'Soil & Concrete Testing Facility', 'IoT Sensors Prototyping Center'],
    ratingScore: 94.5,
  },
  {
    name: 'Indian Institute of Technology Bombay (IIT Bombay)',
    slug: 'iit-bombay',
    adminEmail: 'university@sicp.gov.in',
    adminName: 'Prof. Ananya Sen',
    district: 'Mumbai',
    state: 'Maharashtra',
    aisheCode: 'U-0001',
    naacGrade: 'A++',
    category: 'INSTITUTE_OF_NATIONAL_IMPORTANCE',
    domains: ['Structural Engineering', 'Urban Hydrology', 'Smart Municipal Systems', 'Clean Energy'],
    departments: ['Civil Engineering', 'Earth Sciences', 'Centre for Technology Alternatives for Rural Areas'],
    facilities: ['Hydraulics & River Engineering Lab', 'Environmental Nanotechnology Center', 'Remote Sensing Lab'],
    ratingScore: 98.0,
  },
  {
    name: 'Indian Institute of Technology Delhi (IIT Delhi)',
    slug: 'iit-delhi',
    adminEmail: 'vc.iitd@sicp.gov.in',
    adminName: 'Prof. S. N. Bose',
    district: 'New Delhi',
    state: 'Delhi',
    aisheCode: 'U-0002',
    naacGrade: 'A++',
    category: 'INSTITUTE_OF_NATIONAL_IMPORTANCE',
    domains: ['Transportation Engineering', 'Pavement Materials', 'Pollution Mitigation', 'Waste Valorization'],
    departments: ['Civil Engineering', 'Chemical Engineering', 'Centre for Rural Development and Technology'],
    facilities: ['Pavement Materials Characterization Lab', 'Atmospheric Pollution Testing Lab'],
    ratingScore: 97.2,
  },
  {
    name: 'Indian Institute of Science (IISc Bangalore)',
    slug: 'iisc-bangalore',
    adminEmail: 'dean.iisc@sicp.gov.in',
    adminName: 'Prof. G. N. Ramachandran',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    aisheCode: 'U-0003',
    naacGrade: 'A++',
    category: 'INSTITUTE_OF_NATIONAL_IMPORTANCE',
    domains: ['Atmospheric Sciences', 'Deep-Tech Sensors', 'Ecological Modeling', 'Water Security'],
    departments: ['Centre for Sustainable Technologies', 'Department of Civil Engineering', 'Chemical Sciences'],
    facilities: ['Water & Climate Modeling Lab', 'Advanced Sensor Fabrications Center'],
    ratingScore: 99.1,
  },
];

async function main() {
  console.log('Seeding / verifying premier registered universities...');
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  for (const uni of PREMIER_UNIVERSITIES) {
    // 1. Find or create Organization
    let org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: uni.slug },
          { name: uni.name }
        ]
      }
    });

    const metadata = {
      district: uni.district,
      state: uni.state,
      aisheCode: uni.aisheCode,
      naacGrade: uni.naacGrade,
      category: uni.category,
      researchDomains: uni.domains,
      departments: uni.departments,
      facilities: uni.facilities,
      currentRatingScore: uni.ratingScore,
      ratingCount: 5,
      deanEmail: uni.adminEmail,
      representativeTitle: 'Dean of Research & Innovation',
    };

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: uni.name,
          slug: uni.slug,
          type: 'UNIVERSITY',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          verificationDetails: {
            verifiedBy: 'Ministry of Education & Urban Affairs',
            verifiedAt: new Date().toISOString(),
            confidence: 1.0,
            notes: 'Nationally accredited premier institution under SICP National Innovation Framework.',
          },
          metadata,
        }
      });
      console.log(`Created university org: ${uni.name} (${org.id})`);
    } else {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: {
          name: uni.name,
          type: 'UNIVERSITY',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          metadata: {
            ...(org.metadata || {}),
            ...metadata,
          }
        }
      });
      console.log(`Updated university org: ${uni.name} (${org.id})`);
    }

    // 2. Find or create Administrator User
    let user = await prisma.user.findUnique({
      where: { email: uni.adminEmail }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: uni.adminEmail,
          fullName: uni.adminName,
          passwordHash: defaultPasswordHash,
          role: 'UNIVERSITY_ADMIN',
          organizationId: org.id,
          isActive: true,
        }
      });
      console.log(`Created admin user: ${uni.adminEmail} for ${uni.name}`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: org.id,
          role: 'UNIVERSITY_ADMIN',
          fullName: uni.adminName,
          passwordHash: defaultPasswordHash,
          isActive: true,
        }
      });
      console.log(`Updated admin user: ${uni.adminEmail} linked to ${uni.name}`);
    }

    // 3. Ensure membership in OrganizationMember
    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, userId: user.id }
    });

    if (!member) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'ADMIN',
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
