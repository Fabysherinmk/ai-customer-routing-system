import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database tables...');
  await prisma.requestEvent.deleteMany();
  await prisma.note.deleteMany();
  await prisma.classification.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding database...');

  // 1. Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const agentPasswordHash = await bcrypt.hash('agent123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@crrs.com',
      name: 'Elena Rostova',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
  });

  const agent = await prisma.user.create({
    data: {
      email: 'agent@crrs.com',
      name: 'Marcus Vance',
      role: 'AGENT',
      passwordHash: agentPasswordHash,
    },
  });

  console.log('Seeded users:');
  console.log(`- Admin: ${admin.email} (password: admin123)`);
  console.log(`- Agent: ${agent.email} (password: agent123)`);

  // 2. Define Sample Requests
  const requestsData = [
    {
      customerName: 'Alice Johnson',
      email: 'alice@johnson.net',
      channel: 'email',
      message: 'Urgent: Our main dashboard is showing a server down 502 Bad Gateway error. Complete outage!',
      status: 'IN_PROGRESS',
      category: 'Technical Support',
      priority: 'HIGH',
      confidence: 0.95,
      summary: 'Main dashboard showing 502 server down outage',
      reason: 'Contains critical outage and server down keywords. Set category to Technical Support.',
      notes: ['Investigating server logs. Node US-EAST-1 is under load.', 'Restarted worker nodes, connection returning.'],
    },
    {
      customerName: 'Bob Smith',
      email: 'bob@smith-design.com',
      channel: 'webform',
      message: 'I made a payment for the premium plan subscription, but it failed. However, money was deducted from my credit card. Please issue a refund or activate my plan.',
      status: 'IN_PROGRESS',
      category: 'Billing',
      priority: 'MEDIUM',
      confidence: 0.93,
      summary: 'Payment failed but money deducted, request refund/activation',
      reason: 'Contains payment and refund keywords. Categorized as Billing with medium priority.',
      notes: ['Confirmed payment transaction ref TXN-99882. Verifying bank gateway.'],
    },
    {
      customerName: 'Charlie Brown',
      email: 'charlie@peanuts.org',
      channel: 'whatsapp',
      message: 'Hello, looking to get a demo of your CRM integration and a pricing quote for 50 agents.',
      status: 'NEW',
      // No classification yet (will simulate NEW status without preset classification)
    },
    {
      customerName: 'Diana Prince',
      email: 'diana@themiscira.co',
      channel: 'chat',
      message: 'Is there any way to change my email address from the settings page? I do not see the option.',
      status: 'RESOLVED',
      category: 'General Inquiry',
      priority: 'LOW',
      confidence: 0.89,
      summary: 'How to change account email address',
      reason: 'General inquiry on profile settings. No billing or outage terms.',
      notes: ['Provided step-by-step guidance to the customer.', 'Customer confirmed the issue is resolved.'],
    },
    {
      customerName: 'Ethan Hunt',
      email: 'ethan@imf.gov',
      channel: 'email',
      message: 'Security issue: Unrecognized login detected from an IP address in Europe. Please lock my account.',
      status: 'IN_PROGRESS',
      category: 'Technical Support',
      priority: 'HIGH',
      confidence: 0.91,
      summary: 'Unrecognized login - request security account lock',
      reason: 'Detected security keywords. Assured high priority routing.',
      notes: ['Temporarily suspended API keys as a safety measure.', 'Sent password reset link.'],
    },
    {
      customerName: 'Fiona Gallagher',
      email: 'fiona@southside.co',
      channel: 'email',
      message: 'Could you please send over the invoice for May 2026? We need it for tax records.',
      status: 'RESOLVED',
      category: 'Billing',
      priority: 'MEDIUM',
      confidence: 0.96,
      summary: 'Request for May invoice',
      reason: 'Matched invoice keyword. Billing classification with medium priority.',
      notes: ['Emailed PDF invoice. Closed ticket.'],
    },
    {
      customerName: 'George Costanza',
      email: 'george@vandelayindustries.com',
      channel: 'webform',
      message: 'Our corporate account needs pricing details and volume discounts for 200+ employees.',
      status: 'NEW',
    },
    {
      customerName: 'Hal Jordan',
      email: 'greenlantern@oa.org',
      channel: 'whatsapp',
      message: 'The mobile app keeps crashing every time I upload a PDF document. It closes instantly.',
      status: 'IN_PROGRESS',
      category: 'Technical Support',
      priority: 'MEDIUM',
      confidence: 0.94,
      summary: 'Mobile app crash on PDF upload',
      reason: 'Detected crash keyword. Support category with medium priority.',
      notes: ['Replicated bug on iOS simulator. Assigned to core mobile team.'],
    },
    {
      customerName: 'Iris West',
      email: 'iris@centralcitycitizen.com',
      channel: 'chat',
      message: 'Great software! Just wanted to send positive feedback. Very clean design.',
      status: 'CLOSED',
      category: 'General Inquiry',
      priority: 'LOW',
      confidence: 0.82,
      summary: 'Positive software feedback',
      reason: 'General feedback, no support action required.',
      notes: ['Thanked customer for their kind feedback.'],
    },
    {
      customerName: 'John Doe',
      email: 'john@example.com',
      channel: 'email',
      message: 'I got an error code ERR_CONNECTION_REFUSED when connecting to the API endpoints today.',
      status: 'NEW',
    },
    {
      customerName: 'Clark Kent',
      email: 'clark@dailyplanet.com',
      channel: 'email',
      message: 'Urgent: Outage report. The newsroom editor cannot submit files. Web app is completely unresponsive.',
      status: 'IN_PROGRESS',
      category: 'Technical Support',
      priority: 'HIGH',
      confidence: 0.97,
      summary: 'Outage: unresponsive newsroom file submissions',
      reason: 'High priority due to urgent and outage terms.',
      notes: ['Database lockups detected. Clearing active connections.'],
    },
    {
      customerName: 'Bruce Wayne',
      email: 'bruce@waynecorp.com',
      channel: 'webform',
      message: 'Requesting a demo of your automated routing workflow. We want to buy an enterprise license if it fits our stack.',
      status: 'IN_PROGRESS',
      category: 'Sales',
      priority: 'LOW',
      confidence: 0.92,
      summary: 'Enterprise demo and potential purchase query',
      reason: 'Sales keywords matched: buy, demo. Low priority.',
      notes: ['Scheduled sales call for next Tuesday.'],
    },
    {
      customerName: 'Selina Kyle',
      email: 'selina@gothamcats.com',
      channel: 'whatsapp',
      message: 'Why was I charged $49.99 instead of the promotional price of $19.99? Please adjust this invoice.',
      status: 'IN_PROGRESS',
      category: 'Billing',
      priority: 'MEDIUM',
      confidence: 0.94,
      summary: 'Charged incorrect price - query on invoice adjustment',
      reason: 'Billing keywords invoice and charged. Medium priority.',
      notes: ['Reviewing discount code validity in Stripe.'],
    },
    {
      customerName: 'Peter Parker',
      email: 'peter@dailybugle.com',
      channel: 'chat',
      message: 'There is a bug on the image crop tool. It crops the images with weird grey margins.',
      status: 'RESOLVED',
      category: 'Technical Support',
      priority: 'MEDIUM',
      confidence: 0.91,
      summary: 'Bug in image crop tool showing grey margins',
      reason: 'Support category with medium priority due to bug keyword.',
      notes: ['Released patch v2.4.1 which resolves crop buffer margins.'],
    },
    {
      customerName: 'Tony Stark',
      email: 'tony@starkindustries.com',
      channel: 'email',
      message: 'Security alert: Outage on Jarvis auth gateway. Critical credentials might be exposed. Need security patch.',
      status: 'IN_PROGRESS',
      category: 'Technical Support',
      priority: 'HIGH',
      confidence: 0.98,
      summary: 'Auth gateway security outage - credentials exposure threat',
      reason: 'High priority due to critical terms: security, outage.',
      notes: ['Isolated affected server clusters.', 'Initiated rotation of master secrets.'],
    },
    {
      customerName: 'Natasha Romanoff',
      email: 'natasha@shield.gov',
      channel: 'chat',
      message: 'What is the refund policy if we cancel our yearly subscription after 3 months?',
      status: 'RESOLVED',
      category: 'Billing',
      priority: 'LOW',
      confidence: 0.88,
      summary: 'Refund policy inquiries on yearly cancellation',
      reason: 'Billing inquiry with low priority.',
      notes: ['Provided link to standard terms & refund procedures.'],
    },
    {
      customerName: 'Wanda Maximoff',
      email: 'wanda@westview.net',
      channel: 'webform',
      message: 'I am trying to sign up, but the validation code is never arriving in my email mailbox.',
      status: 'NEW',
    },
    {
      customerName: 'Arthur Curry',
      email: 'aquaman@atlantis.gov',
      channel: 'whatsapp',
      message: 'Need quote for adding 15 new phone lines to our support desk. Please contact ASAP.',
      status: 'NEW',
    },
    {
      customerName: 'Barry Allen',
      email: 'barry@star-labs.com',
      channel: 'chat',
      message: 'The loading speed of the dashboard is extremely slow. It takes 15 seconds to load data. Is there a server latency issue?',
      status: 'NEW',
    },
    {
      customerName: 'Victor Stone',
      email: 'cyborg@star-labs.com',
      channel: 'email',
      message: 'API docs error: The endpoint POST /api/requests schema does not match the Swagger specifications.',
      status: 'RESOLVED',
      category: 'Technical Support',
      priority: 'LOW',
      confidence: 0.85,
      summary: 'API Swagger docs schema mismatch',
      reason: 'Support category with low priority.',
      notes: ['Fixed typo in Swagger schema definition.'],
    }
  ];

  for (const [idx, item] of requestsData.entries()) {
    const { category, priority, confidence, summary, reason, notes, ...reqFields } = item;

    // Assign some requests to the agent so they don't see an empty list upon login
    const assignedToId = idx % 3 === 0 ? agent.id : null;

    // Create the Request
    const request = await prisma.request.create({
      data: {
        ...reqFields,
        assignedToId
      },
    });

    // Create CREATED event
    await prisma.requestEvent.create({
      data: {
        requestId: request.id,
        eventType: 'CREATED',
        newStatus: request.status,
        metadata: JSON.stringify({ source: request.channel }),
        createdAt: new Date(request.createdAt.getTime() - 20000), // offset event slightly earlier
      },
    });

    // If request has classification, save it and write events/notes
    if (category) {
      await prisma.classification.create({
        data: {
          requestId: request.id,
          provider: 'mock-keyword-engine',
          category: category as any,
          priority: priority as any,
          confidence: confidence!,
          summary: summary!,
          reason: reason!,
        },
      });

      // Write CLASSIFIED event
      await prisma.requestEvent.create({
        data: {
          requestId: request.id,
          eventType: 'CLASSIFIED',
          oldStatus: 'NEW',
          newStatus: request.status,
          metadata: JSON.stringify({ category, priority, confidence, summary }),
          createdAt: new Date(request.createdAt.getTime() - 10000),
        },
      });

      // Write Notes if any
      if (notes && notes.length > 0) {
        for (const [idx, noteText] of notes.entries()) {
          const authorId = idx % 2 === 0 ? admin.id : agent.id;
          const authorName = idx % 2 === 0 ? admin.name : agent.name;

          const dbNote = await prisma.note.create({
            data: {
              requestId: request.id,
              authorId,
              note: noteText,
              createdAt: new Date(request.createdAt.getTime() + (idx + 1) * 3600000), // spread by hour
            },
          });

          await prisma.requestEvent.create({
            data: {
              requestId: request.id,
              eventType: 'NOTE_ADDED',
              actorId: authorId,
              metadata: JSON.stringify({ authorName, snippet: dbNote.note.substring(0, 30) }),
              createdAt: dbNote.createdAt,
            },
          });
        }
      }
    }
  }

  console.log('Successfully seeded database:');
  console.log('- 2 Users created.');
  console.log('- 20 Requests created.');
  console.log('- Classifications, notes, and audit events populated.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
