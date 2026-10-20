import {evaluateVacancy} from '../worker/calibration-model.mjs';
import {evaluateV53,withEmployerIntelligence} from '../worker/calibration-v53.mjs';

// Reproduces the V4 scoreJob calculation, without browser/UI dependencies.
const dimensions=[
  {weight:25,terms:['training','learning','course','seminar','workshop','l&d','accreditation','facilitator','trainer','lms']},
  {weight:20,terms:['programme','program','project','pmo','coordinat','schedule','logistics','planning','delivery']},
  {weight:15,terms:['administrat','records','documentation','compliance','governance','minutes','policy','audit']},
  {weight:15,terms:['report','excel','power bi','dashboard','data quality','analysis','metrics','kpi']},
  {weight:15,terms:['stakeholder','customer','client','participant','communication','liaison','relationship']},
  {weight:10,terms:['commercial','supplier','procurement','purchas','quote','pricing','contract']}
];
const cv=`Learning operations and programme support professional with more than 20 years of experience in financial services, professional education and regulated organisations.
AJW Group Commercial Transformation Executive. Developed and maintained Excel and Power Query reporting that consolidated quoting, ordering, invoicing, supplier and repair information. Checked and reconciled data from multiple sources. Documented reporting processes and supported data quality improvements.
Moody's Analytics Assistant Director Programme Manager Banking OU PMO. Coordinated governance and reporting routines across five banking software product teams. Consolidated KPIs, roadmaps, risks, actions and dependencies. Produced structured management updates and maintained templates and documentation.
Moody's Analytics Training and Development Manager. Coordinated global learning operations across EMEA, APAC and the Americas, supporting more than 200 seminars and 340 delivery days annually. Managed schedules, instructors, suppliers, venues, learning materials, participant administration, client queries and operational reporting across multiple regions. Supported virtual learning using Adobe Connect and Zoom. Produced guidance and process documentation.
Moody's Analytics EMEA Senior Training Coordinator. Coordinated seminar scheduling, contractors, venues, materials, registrations and participant communications. Supported finance administration, invoices, sales enquiries and client support. Maintained programme data through Cvent and Salesforce.
Hellenic Bank Association Executive Assistant Regulatory Affairs. Prepared committee papers, confidential correspondence, meeting records and stakeholder updates. Supported compliance and governance activities.
Hellenic Banking Institute Training Administrator. Coordinated training programmes for more than 20 banking institutions. Administered schedules, instructors, participants, materials, records and reporting. Standardised procedures.
Systems: Excel, Power Query, Power BI, SharePoint, Cvent, Salesforce, Jira, Confluence, Adobe Connect, Zoom. MBA, AgilePM Foundation, Certificate in Compliance.`;
function v4(job){const d=(job.title+' '+job.description).toLowerCase();const active=dimensions.filter(x=>x.terms.some(t=>d.includes(t)));const total=active.reduce((n,x)=>n+x.weight,0);return total?Math.round(100*active.filter(x=>x.terms.some(t=>cv.toLowerCase().includes(t))).reduce((n,x)=>n+x.weight,0)/total):null;}

// 25 independently found advertisements, Oct 20 2026. The short descriptions
// faithfully reflect listing summaries, NOT complete employer requirements.
const rows=[
 ['Deutsche Bank','Training Coordinator','full','priority',null,`Coordinate Data Management training and change activities, milestones, actions, dependencies and delivery risks. Coordinate training operations: scheduling, participant communications, registrations, attendance, surveys and follow-up. Work with stakeholders and subject matter experts. Produce meeting records, presentation materials, auditable evidence and governance documentation. Strong project coordination, analytical reporting and problem-solving. Proven ability to leverage AI tools ethically.`],
 ['Triple Point','Administration Coordinator - Clean Heat','full','priority',null,`Maintain project records in programme trackers, document management systems, reconcile data across systems and investigate gaps. Collate and quality-check management information reporting, prepare Excel dashboards, forecasts and cashflow. Support team governance, meeting documentation, deadline follow-up, audit trail and compliance. Essential strong administration, organisational skills, report writing and Excel SharePoint. Desirable Power Query and Power BI.`],
 ['Tripadvisor','Project Operations Coordinator','full','review',null,`Lead operational reporting and executive updates on support analytics and AI bot performance. Track AI customer support implementations and project timelines across Support Engineering Product and Supply. Essential hands-on experience with modern AI-driven customer service platforms such as Zendesk AI, Intercom, Salesforce and automation. Experience in travel tech CX and customer operations. Preferred travel marketplace experience and deploying generative AI chat systems.`],
 ['HSBC','Global Programme Coordinator Training and Accreditation - Private Bank','full','closed',null,`Coordinate global learning programme deployment and quarterly calendar milestones dependencies risks and actions. Coordinate training sessions accreditation scheduling records materials assessments and reports. Support programme governance and stakeholders. Coordinate suppliers, content review, instructor events, registrations and communications. Essential coordinating complex programmes across markets and Excel PowerPoint. Desirable Degreed LMS and private banking. Closing date 15 October 2026.`],
 ['Presidents Summit','Event Operations Coordinator','full','review',null,`Plan conference logistics, venues, supplier relationships and contract negotiation. Coordinate events and inventory spreadsheets. Hire train and manage 40 volunteers. Responsibilities include on-site support at conferences, budget review, sponsored VIP events, attendee experiences, researching and comparing suppliers and maintaining positive supplier relationships. Events are in-person at London Victoria; salary not disclosed.`],
 ['Management Recruitment Group','Programme Co-Ordinator','short','investigate',47871,'Permanent hybrid programme co-ordinator London, salary £47,871.'],
 ['Office Angels','Senior Programme Officer','short','investigate',50000,'Contract hybrid senior programme officer London salary £50,000 to £55,000.'],
 ['Involved Solutions','Senior PMO Analyst','short','investigate',null,'Six month senior PMO analyst contract London £300 to £350 per day.'],
 ['YourRecruit','STEM Programme Manager','short','investigate',35000,'Permanent on-site STEM programme manager Caterham £35,000 to £38,000.'],
 ['Isio','Pensions Project Support Administrator','short','investigate',null,'Permanent hybrid pension project support administrator Croydon competitive salary.'],
 ['Reed','Programme Coordinator','short','investigate',null,'Temporary on-site programme coordinator City of London £136.81 to £158.37 per day.'],
 ['Covent Garden Recruitment','Senior Programme Support','short','investigate',null,'Temporary full time senior programme support London £20 per hour.'],
 ['Seymour John','Programme Co-Ordinator','short','investigate',null,'Remote contract programme co-ordinator London competitive salary.'],
 ['rated traders ltd','Project Support Officer','short','investigate',null,'Contract on-site project support officer London £20 to £21 per hour.'],
 ['ICAEW','Senior Business Partner Programme Management Office','short','stretch',61000,'Permanent hybrid senior business partner programme management office London £61,000 to £69,000.'],
 ['Venn Group','Programme Manager','short','investigate',null,'Contract hybrid programme manager London £41.67 per hour.'],
 ['Gedu','Program Manager – Finance','short','low',null,'Permanent on-site finance program manager London, salary negotiable.'],
 ['Adecco','Programme Officer','short','low',null,'Temporary on-site programme officer London £19 per hour.'],
 ['Windsor Forest Colleges Group','Programme Manager - IT and Business','short','low',39291,'Permanent on-site IT and Business programme manager Langley, £39,291 to £46,966.'],
 ['Hays','Programme Manager PMO','short','low',50000,'Permanent hybrid programme manager PMO Uxbridge £50,000.'],
 ['Southwark Council','Public Health Policy and Programme Officer','short','low',51831,'Permanent on-site public health policy and programme officer London £51,831 to £59,394.'],
 ['NFP People','Programme Officer','short','exclude',27953,'Permanent remote programme officer London £27,953 to £33,130.'],
 ['TechUK','Programme Team Assistant for Public Sector Markets','short','exclude',27000,'Permanent programme team assistant London £27,000 to £31,000.'],
 ['Harnham','Senior Programme Officer','short','review',null,'Hybrid contract senior programme officer £450 to £500 per day London.'],
 ['IDA Recruitment','Head of Programmes','short','low',48000,'Permanent hybrid head of programmes London £48,000 to £55,000.']
].map(([company,title,depth,manual,salary_min,description])=>({company,title,depth,manual,salary_min,description}));

// Context is a dated, source-specific snapshot: only five of 25 employers had
// usable company-specific public evidence in this quick scan. The remaining
// 20 must receive zero adjustment, not invented or industry-average scores.
const intelligence={
 'Deutsche Bank':{employee_reviews:{rating:3.8,count:13005,scope:'global',source:'https://www.glassdoor.com/Reviews/Deutsche-Bank-Reviews-E3150.htm'},business_evidence:{status:'reported_positive',note:'2025 audited net revenues €32.1bn, up 7%',source:'https://www.deutschenbank.com/news/detail/20260312-deutsche-bank-publishes-2025-annual-report-and-confirms-outlook-for-2026?language_id=1'}},
 'Triple Point':{employee_reviews:{rating:3.5,count:32,scope:'global',source:'https://www.glassdoor.co.uk/Reviews/Triple-Point-Reviews-E2578044.htm?sort.sortType=RD'}},
 'Tripadvisor':{employee_reviews:{rating:3.4,count:115,scope:'office',source:'https://static.glassdoor.com/Reviews/Tripadvisor-London-Reviews-EI_IE15276.0%2C11_IL.12%2C18_IC2671300.htm'},business_evidence:{status:'reported_positive',note:'2025 company revenue about $1.9bn',source:'https://www.sec.gov/Archives/edgar/data/1526520/000119312526047622/trip-ex99_1.htm'}},
 'HSBC':{employee_reviews:{rating:3.8,count:28623,scope:'global',source:'https://www.glassdoor.co.uk/Reviews/HSBC-Reviews-E3482.htm'}},
 'Presidents Summit':{} // Only 2 historical employee reviews: below sample-size threshold.
};
console.log('Company | Role | Evidence depth | Human triage | V4 | V5.2 | V5.3 | V5.3 + intel | Delta | Decision');
for(const j of rows){const r=evaluateVacancy(cv,j,{salaryFloor:35000,minContractMonths:6});const v53=evaluateV53(cv,j,{salaryFloor:35000,minContractMonths:6});const contextual=withEmployerIntelligence(v53,intelligence[j.company]);console.log([j.company,j.title,j.depth,j.manual,v4(j)??'N/A',r.fit_score??'N/A',v53.fit_score??'N/A',contextual.priority_score??'N/A',contextual.priority_adjustment,v53.decision].join(' | '));}
const full=rows.filter(r=>r.depth==='full').map(j=>({title:j.title,v4:v4(j),v52:evaluateVacancy(cv,j,{salaryFloor:35000,minContractMonths:6}).fit_score}));
console.log('\nFull-description subset:',JSON.stringify(full));
