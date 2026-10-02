import { Phase1Pipeline } from '../services/orchestrator/phase1Pipeline.js';

interface TargetJobDef {
  company: string;
  title: string;
  location: string;
  jdText: string;
}

const targetJobs: TargetJobDef[] = [
  {
    company: 'Wise',
    title: 'Senior Product Manager — Checkout & Payment Systems',
    location: 'London, UK / Remote EU',
    jdText: `Senior Product Manager — Checkout & Payment Systems at Wise.
Location: London, UK or Remote (Europe). Visa sponsorship available for UK relocation.
About the role:
Wise is looking for an experienced Senior Product Manager to lead our Checkout and Payment Rails infrastructure squad. You will be responsible for defining the product vision, roadmap, and delivery of multi-currency payment checkout flows, API payment gateways, and reconciliation systems.
Responsibilities:
- Own the end-to-end checkout conversion funnel and multi-currency payment execution.
- Lead a cross-functional squad of 12+ engineers, QA, data analysts, and product designers in Agile/Scrum.
- Architect fallback routing between payment processors and alternative payment methods.
- Monitor payment gateway telemetry, error spikes, and transaction success rates using New Relic and Mixpanel.
- Partner with compliance, legal, and banking partners to maintain PCI-DSS compliance and financial auditing.
Requirements:
- 5+ years of Product Management experience in FinTech, Payments, or SaaS.
- Hands-on experience with payment gateways (Adyen, Stripe, or local rails), split payments, or escrow workflows.
- Strong quantitative acumen: A/B testing, funnel analysis, SQL, and event tracking (Mixpanel/Amplitude).
- Excellent stakeholder communication and track record of working with banking partners.`,
  },
  {
    company: 'Deel',
    title: 'Senior Product Manager — Global Payments & Contractor Payouts',
    location: 'Remote Worldwide',
    jdText: `Senior Product Manager — Global Payments & Contractor Payouts at Deel.
Location: 100% Remote Worldwide (Pakistan / Global B2B Contract). No Visa Sponsorship Required.
About the Role:
As Senior Product Manager for Global Payments at Deel, you will lead the infrastructure powering automated multi-currency contractor payouts, escrow mechanics, and local payment rails across 150+ countries.
Responsibilities:
- Drive the roadmap for global payout rails, local bank transfers, digital wallets, and automated FX conversion.
- Partner with payment gateways and banking partners (Adyen, Stripe, local clearing houses) to optimize transaction authorization rates.
- Manage FinTech integrations including KYC verification (Onfido), digital contract signatures, and payout reconciliation.
- Utilize Mixpanel, New Relic, and SQL data pipelines to identify payment failures and reduce withdrawal latency.
Requirements:
- 6+ years in digital payments, FinTech, or SaaS billing operations.
- Deep hands-on experience with payment gateways, escrow/split payments, webhooks, and REST APIs.
- Strong analytical skills: event instrumentation, funnel conversion, and SLA observability.
- 100% remote asynchronous collaboration across global timezones.`,
  },
  {
    company: 'GitLab',
    title: 'Lead Product Manager — Billing & Revenue SaaS',
    location: 'Remote Worldwide',
    jdText: `Lead Product Manager — Billing, Subscriptions & Revenue SaaS at GitLab.
Location: 100% Remote Worldwide. B2B contract or EOR payroll supported.
About GitLab:
GitLab is the leading DevSecOps platform. We are looking for a Lead Product Manager for our Growth and Monetization division, focusing on self-service subscription upgrades, billing retention, and churn prevention.
Key Responsibilities:
- Lead product strategy for subscription lifecycle management, self-service tier upgrades, and automated retention flows.
- Spearhead churn reduction initiatives, analyzing cohort drop-offs using Mixpanel and product analytics.
- Build automated billing workflows and customer notification webhooks.
- Partner with finance and revenue operations to ensure billing reconciliation and auditability.
Requirements:
- 7+ years of experience in Product Management in B2B SaaS or Marketplaces.
- Proven track record of reducing subscription churn and improving conversion funnels.
- Deep experience in Agile/Scrum delivery, PRD authoring, and cross-functional leadership.
- Technical understanding of REST APIs, webhook architectures, and event-driven systems.`,
  },
  {
    company: 'Personio',
    title: 'Platform Product Manager — Integrations & APIs',
    location: 'Munich, Germany / Amsterdam, Netherlands',
    jdText: `Platform Product Manager — Partner Integrations & APIs at Personio.
Location: Munich or Amsterdam (Hybrid/Remote EU). Full visa sponsorship & relocation package.
Overview:
Personio is Europe's leading HR and payroll software for SMBs. We are searching for a Platform Product Manager to spearhead our external partner API ecosystem, webhook delivery service, and marketplace marketplace connectors.
Responsibilities:
- Define developer experience and architecture for public REST APIs, webhooks, and third-party data exchange.
- Scale automated partner onboarding and technical validation test pipelines.
- Work closely with QA leads to establish automated API testing frameworks and reduce bug escape rates.
- Maintain 99.9% uptime SLA across partner synchronization endpoints.
Requirements:
- 5+ years of Technical Product Management or API platform experience.
- Background in Software Engineering, QA coordination, or API architecture.
- Demonstrated success collaborating with cross-functional engineering teams in Scrum.
- Experience with Postman, Swagger/OpenAPI, and log monitoring tools.`,
  },
  {
    company: 'Deliveroo',
    title: 'Senior Product Operations Manager',
    location: 'London, UK / Remote UK',
    jdText: `Senior Product Operations Manager at Deliveroo.
Location: London, UK. Visa sponsorship available.
The Role:
Deliveroo is scaling its rapid delivery and grocery fulfillment marketplace. We need a Senior Product Operations Manager to bridge product engineering with operations, field fulfillment, delivery slot optimization, and customer support.
Responsibilities:
- Analyze customer support incident trends and build closed-loop feedback mechanisms into product squads.
- Oversee delivery slot capacity planning, automated order escalation, and out-of-stock substitution workflows.
- Lead customer investigations and Jira support escalation workflows to achieve 99% SLA compliance.
- Drive cross-functional alignment between engineering, operations leads, and retail partners.
Requirements:
- 6+ years in Product Operations, Technical Project Management, or Marketplace Delivery.
- Track record of reducing order cancellations, optimizing fulfillment SLAs, and analyzing customer logs.
- Proficiency in SQL, Python, Mixpanel, and observability tools.`,
  },
  {
    company: 'Revolut',
    title: 'Senior Product Manager — Open Banking & Payments',
    location: 'London, UK / Remote Europe',
    jdText: `Senior Product Manager — Open Banking & Payments at Revolut.
Location: London, UK or Remote EU. Relocation assistance and visa sponsorship provided.
About Revolut:
People deserve more from their money. More visibility, more control, more freedom. Revolut is building the world's first global financial super-app.
What you will be doing:
- Own the product vision and execution for Revolut Open Banking payment rails and bank account verification.
- Scale multi-currency checkout, escrow features, and instant bank transfers via Plaid and regulatory APIs.
- Collaborate with FCA and European regulatory bodies to guarantee full compliance (KYC, AML, PCI-DSS).
- Analyze payment funnel conversion and drop-offs to improve first-time user transaction success.
Qualifications:
- 6+ years of Product Management experience in FinTech, Payments, or Neobanking.
- Strong technical background in Open Banking APIs, webhooks, and multi-party payment reconciliation.
- Track record of shipping high-impact features in fast-paced Agile environments.`,
  },
  {
    company: 'Stripe',
    title: 'Product Manager — Connect & Global Payouts',
    location: 'Dublin, Ireland / Remote EU',
    jdText: `Product Manager — Connect, Marketplaces & Global Payouts at Stripe.
Location: Dublin, Ireland or Remote EU. Visa sponsorship supported.
About Stripe Connect:
Stripe Connect is the engine behind marketplaces like Shopify, DoorDash, and Lyft. As PM for Connect Payouts, you will shape how platforms split payments, onboard merchants, and disburse billions in funds globally.
Responsibilities:
- Lead product strategy for marketplace split payments, escrow holding rules, and multi-tender disbursements.
- Work with global engineering squads to design webhook schemas, KYC flows, and automated reconciliation APIs.
- Drive reduction in payout failure rates through proactive log analysis and intelligent retry mechanisms.
- Engage directly with platform partners to gather user feedback and prioritize technical backlogs.
Requirements:
- 5+ years of PM experience building developer platforms, FinTech products, or payment gateways.
- Deep familiarity with Adyen, Mangopay, Stripe, or proprietary payment orchestration systems.
- Strong analytical foundation with SQL, telemetry analysis, and conversion funnel optimization.`,
  },
  {
    company: 'Checkout.com',
    title: 'Senior Product Manager — Alternative Payment Methods',
    location: 'Dubai, UAE / London, UK',
    jdText: `Senior Product Manager — Alternative Payment Methods (APMs) & Wallets at Checkout.com.
Location: Dubai, UAE or London, UK. Local employment / visa transfer available.
The Opportunity:
Checkout.com is a global digital payments company. We are looking for a Senior Product Manager to spearhead our alternative payment methods portfolio across the Middle East and Europe, including Tabby (BNPL), Apple Pay, digital wallets, and local clearing networks.
Key Responsibilities:
- Lead end-to-end integration and lifecycle management of regional payment methods (Tabby, Apple Pay, Etisalat Gateway).
- Partner with merchants to analyze drop-offs at checkout and improve authorization success rates.
- Establish automated testing and QA validation frameworks for new payment gateway adapters.
- Define product metrics, monitor incident resolution SLAs, and report progress to executive leadership.
Experience:
- 6+ years in payments, eCommerce, or FinTech product delivery.
- Proven experience with BNPL (Tabby/Tamara), digital wallets, and POS/eCommerce integrations.
- Background working with cross-functional squads across product, engineering, and partner operations.`,
  },
  {
    company: 'Careem',
    title: 'Staff Product Manager — Super-App Wallets & FinTech',
    location: 'Dubai, UAE / Remote GCC',
    jdText: `Staff Product Manager — Super-App Wallets & Digital Payments at Careem (an Uber company).
Location: Dubai, UAE. Relocation and UAE residency visa provided.
About the Role:
Careem is the everyday super-app of the greater Middle East. In Careem Pay, you will lead the core digital wallet, split payments, and customer loyalty points redemption systems used by tens of millions of customers.
Responsibilities:
- Own the roadmap for Careem Pay digital wallet balance, card-on-file tokenization, and multi-source checkout (wallet + card + loyalty points).
- Architect automated escalation workflows for stuck transactions and customer support refund requests.
- Collaborate with UAE central bank and regional financial regulators on KYC/AML standards.
- Lead a squad of 18+ engineers, product analysts, and UX researchers.
Requirements:
- 7+ years of product experience across FinTech, super-apps, or high-volume marketplace checkouts.
- Direct experience with multi-tender payment orchestration, Adyen, Apple Pay, and webhook events.
- Outstanding analytical skills: Mixpanel, SQL, and cohort retention modeling.`,
  },
  {
    company: 'Adyen',
    title: 'Product Manager — Platforms & Escrow Solutions',
    location: 'Amsterdam, Netherlands',
    jdText: `Product Manager — Platforms, Escrow & Multi-Party Settlements at Adyen.
Location: Amsterdam, Netherlands. Full relocation package and EU visa sponsorship provided.
About Adyen:
Adyen is the financial technology platform of choice for leading companies. We are seeking a Product Manager for our Platforms division, focusing on multi-party marketplace payouts, escrow orchestration, and real-time KYC.
What you will do:
- Design product features for complex marketplace settlement models, including split tender and automated escrow release.
- Work closely with engineering on API specifications, webhook delivery reliability, and data pipelines.
- Analyze platform telemetry with New Relic to prevent integration errors and minimize incident resolution times.
- Drive customer discovery sessions with enterprise marketplace merchants across Europe.
Who you are:
- 5+ years of PM experience in payments, banking, or platform SaaS.
- Hands-on knowledge of escrow, Mangopay/Adyen platform workflows, and Onfido KYC pipelines.
- Bachelor's degree in Software Engineering or equivalent technical experience.`,
  },
  {
    company: 'Booking.com',
    title: 'Senior Product Manager — Partner Payments & Settlements',
    location: 'Amsterdam, Netherlands / Hybrid',
    jdText: `Senior Product Manager — Partner Payments & Settlements at Booking.com.
Location: Amsterdam, Netherlands. Relocation assistance and 30% ruling visa support provided.
The Opportunity:
Booking Holdings is the world's leading online travel marketplace. In Booking FinTech, you will manage partner payout orchestration, multi-currency wallet adjustments, and refund cancellation workflows.
Responsibilities:
- Lead the product roadmap for property partner payout schedules, dynamic fee adjustments, and cancellation policies.
- Reduce partner churn by designing flexible payout pause/resume options and transparent analytics dashboards.
- Partner with machine learning teams to detect fraud signals and optimize transaction routing.
- Lead Agile sprint ceremonies with distributed cross-functional teams.
Requirements:
- 6+ years of Product Management experience in FinTech, travel tech, or marketplaces.
- Strong experience with payment settlement pipelines, cancellation workflows, and root-cause analysis.
- Proven ability to use data (SQL, Mixpanel, Tableau) to drive product decisions.`,
  },
  {
    company: 'Monzo',
    title: 'Product Manager — Customer Experience & Operations',
    location: 'London, UK / Remote UK',
    jdText: `Product Manager — Customer Experience & Operations Automation at Monzo.
Location: London, UK. Visa sponsorship provided.
About Monzo:
Monzo is on a mission to make money work for everyone. We have over 9 million customers and are expanding rapidly.
The Role:
We are looking for a Product Manager to lead our Customer Operations & Automated Incident Response squad. You will be responsible for building internal tools that empower support operations to hit 99% SLA compliance and uncover product defect root causes.
Responsibilities:
- Build automated ticket categorization and intelligent routing tools for high-volume customer inquiries.
- Bridge customer support feedback directly into core banking engineering squads.
- Utilize observability tools (Mezmo, New Relic) to detect user experience issues before customers report them.
- Measure and optimize incident resolution time (MTTR) and customer CSAT.
Requirements:
- 5+ years of experience in Product Management, Product Operations, or Customer Support Engineering.
- Experience with Jira Service Management, ticket classification workflows, and telephony/IVR escalation.
- Strong analytical and problem-solving mindset.`,
  },
];

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 GENERATING TARGET JOB PIPELINE WITH AUTHENTIC CANDIDATE PROFILE');
  console.log('   Candidate: Sana Liaqat (Senior Product Manager)');
  console.log(`   Generating ${targetJobs.length} tailored application packages...`);
  console.log('='.repeat(80));

  const pipeline = new Phase1Pipeline();

  for (let i = 0; i < targetJobs.length; i++) {
    const job = targetJobs[i];
    console.log(`\n[${i + 1}/${targetJobs.length}] Processing: ${job.company} — ${job.title}...`);
    try {
      const result = await pipeline.execute({
        raw_jd_text: job.jdText,
        company_hint: job.company,
        title_hint: job.title,
        location_hint: job.location,
      });

      console.log(`   ✅ Success! Match: ${result.match.overall_score}% (${result.match.tier})`);
      console.log(`   📁 Package: ${result.package_dir}`);
    } catch (err: any) {
      console.error(`   ❌ Failed for ${job.company}: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 ALL APPLICATION PACKAGES GENERATED WITH SANA LIAQAT AUTHENTIC PROFILE!');
  console.log('='.repeat(80));
}

main().catch(console.error);
