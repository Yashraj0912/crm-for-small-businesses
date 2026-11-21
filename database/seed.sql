-- Demo data for the FIRST organization. Register in the app first, then run this once in Neon > SQL Editor.
do $$
declare o int; u int;
begin
  select id into o from organizations order by id limit 1;
  if o is null then raise exception 'Create your account in the app first, then run this seed.'; end if;
  select id into u from users where org_id = o and role = 'admin' order by id limit 1;

  insert into customers (org_id,name,email,phone,company,job_title,category,tags,notes,owner_id,created_at) values
  (o,'Maya Hoffman','maya@brightpath.example','+1 555 0101','BrightPath Dental','Practice Manager','Customer','{dental,retainer}','Prefers email. Renews every January.',u,now()-interval '80 days'),
  (o,'Daniel Okafor','daniel@okaforlogistics.example','+1 555 0102','Okafor Logistics','Owner','Customer','{logistics}','Wants quarterly reviews.',u,now()-interval '62 days'),
  (o,'Priya Raman','priya@greenleafcafe.example','+1 555 0103','Greenleaf Cafe','Co-founder','Customer','{hospitality,referral}',null,u,now()-interval '45 days'),
  (o,'Tom Becker','tom@becker-build.example','+1 555 0104','Becker Building Co.','Director','Prospect','{construction}','Met at the trade show.',u,now()-interval '30 days'),
  (o,'Lena Fischer','lena@fischerlaw.example','+1 555 0105','Fischer & Partners','Office Manager','Customer','{legal}',null,u,now()-interval '21 days'),
  (o,'Marcus Reed','marcus@reedfitness.example','+1 555 0106','Reed Fitness','Owner','Prospect','{fitness,website}',null,u,now()-interval '14 days'),
  (o,'Aisha Khan','aisha@khanbakery.example','+1 555 0107','Khan Bakery','Owner','Customer','{food}',null,u,now()-interval '9 days'),
  (o,'Julien Moreau','julien@moreaudesign.example','+1 555 0108','Moreau Design','Principal','Partner','{design,partner}','Refers clients to us.',u,now()-interval '6 days'),
  (o,'Sofia Alvarez','sofia@alvarezclinic.example','+1 555 0109','Alvarez Clinic','Administrator','Prospect','{health}',null,u,now()-interval '3 days'),
  (o,'Ethan Walsh','ethan@walshplumbing.example','+1 555 0110','Walsh Plumbing','Owner','Customer','{trades}',null,u,now()-interval '1 day');

  insert into leads (org_id,name,email,phone,company,source,status,assigned_to,follow_up_date,notes,created_at) values
  (o,'Hannah Cole','hannah@colestudio.example','+1 555 0201','Cole Studio','Website','new',u,current_date+1,'Asked for pricing.',now()-interval '2 days'),
  (o,'Victor Ng','victor@ngimports.example','+1 555 0202','Ng Imports','Referral','contacted',u,current_date+3,null,now()-interval '5 days'),
  (o,'Rosa Delgado','rosa@delgadotax.example','+1 555 0203','Delgado Tax','Event','qualified',u,current_date-1,'Ready for a proposal.',now()-interval '9 days'),
  (o,'Omar Haddad','omar@haddadcars.example','+1 555 0204','Haddad Motors','Cold outreach','contacted',u,current_date+7,null,now()-interval '12 days'),
  (o,'Grace Liu','grace@liupharmacy.example','+1 555 0205','Liu Pharmacy','Social media','new',u,null,null,now()-interval '1 day'),
  (o,'Ben Archer','ben@archerroofing.example','+1 555 0206','Archer Roofing','Website','unqualified',u,null,'Out of service area.',now()-interval '20 days'),
  (o,'Nina Petrova','nina@petrovaflowers.example','+1 555 0207','Petrova Flowers','Referral','qualified',u,current_date+2,null,now()-interval '6 days'),
  (o,'Sam Turner','sam@turnerit.example','+1 555 0208','Turner IT','Email campaign','new',u,current_date+5,null,now()-interval '3 days');

  insert into deals (org_id,title,value,stage,expected_close,customer_id,owner_id,closed_at,created_at) values
  (o,'Annual retainer renewal',12000,'won',null,(select id from customers where org_id=o and name='Maya Hoffman'),u,now()-interval '150 days',now()-interval '170 days'),
  (o,'Fleet tracking setup',8500,'won',null,(select id from customers where org_id=o and name='Daniel Okafor'),u,now()-interval '110 days',now()-interval '130 days'),
  (o,'Cafe loyalty program',3200,'won',null,(select id from customers where org_id=o and name='Priya Raman'),u,now()-interval '75 days',now()-interval '90 days'),
  (o,'Contract review package',4800,'won',null,(select id from customers where org_id=o and name='Lena Fischer'),u,now()-interval '40 days',now()-interval '55 days'),
  (o,'Bakery online ordering',2600,'won',null,(select id from customers where org_id=o and name='Aisha Khan'),u,now()-interval '12 days',now()-interval '25 days'),
  (o,'Site management software',18000,'negotiation',current_date+14,(select id from customers where org_id=o and name='Tom Becker'),u,null,now()-interval '20 days'),
  (o,'Gym membership portal',6400,'proposal',current_date+21,(select id from customers where org_id=o and name='Marcus Reed'),u,null,now()-interval '10 days'),
  (o,'Clinic scheduling rollout',9800,'qualified',current_date+35,(select id from customers where org_id=o and name='Sofia Alvarez'),u,null,now()-interval '4 days'),
  (o,'Brand refresh partnership',5000,'new',current_date+45,(select id from customers where org_id=o and name='Julien Moreau'),u,null,now()-interval '2 days'),
  (o,'Service dispatch app',7200,'lost',null,(select id from customers where org_id=o and name='Ethan Walsh'),u,now()-interval '18 days',now()-interval '40 days');

  insert into tasks (org_id,title,description,due_date,priority,status,assigned_to,customer_id,completed_at) values
  (o,'Send proposal to Marcus Reed','Include the portal timeline.',current_date+1,'high','pending',u,(select id from customers where org_id=o and name='Marcus Reed'),null),
  (o,'Call Tom Becker about contract terms',null,current_date,'high','pending',u,(select id from customers where org_id=o and name='Tom Becker'),null),
  (o,'Follow up with Rosa Delgado',null,current_date-1,'medium','pending',u,null,null),
  (o,'Prepare Q1 review for Okafor Logistics',null,current_date+10,'low','pending',u,(select id from customers where org_id=o and name='Daniel Okafor'),null),
  (o,'Send welcome pack to Ethan Walsh',null,current_date+2,'medium','pending',u,(select id from customers where org_id=o and name='Ethan Walsh'),null),
  (o,'Update pricing sheet',null,current_date+6,'low','pending',u,null,null),
  (o,'Invoice Khan Bakery',null,current_date-4,'medium','done',u,(select id from customers where org_id=o and name='Aisha Khan'),now()-interval '3 days'),
  (o,'Book demo with Sofia Alvarez',null,current_date-6,'high','done',u,(select id from customers where org_id=o and name='Sofia Alvarez'),now()-interval '5 days');

  insert into activities (org_id,type,subject,body,customer_id,user_id,created_at) values
  (o,'call','Intro call','Discussed their scheduling pain points.',(select id from customers where org_id=o and name='Sofia Alvarez'),u,now()-interval '3 days'),
  (o,'email','Sent pricing overview',null,(select id from customers where org_id=o and name='Marcus Reed'),u,now()-interval '2 days'),
  (o,'meeting','Contract walkthrough','Legal review requested two changes.',(select id from customers where org_id=o and name='Tom Becker'),u,now()-interval '1 day'),
  (o,'note','Prefers morning calls',null,(select id from customers where org_id=o and name='Maya Hoffman'),u,now()-interval '20 days'),
  (o,'call','Quarterly check-in','All good. Interested in extra seats.',(select id from customers where org_id=o and name='Daniel Okafor'),u,now()-interval '8 days'),
  (o,'email','Onboarding instructions',null,(select id from customers where org_id=o and name='Ethan Walsh'),u,now()-interval '1 day'),
  (o,'meeting','Kickoff meeting','Agreed on a three-week plan.',(select id from customers where org_id=o and name='Aisha Khan'),u,now()-interval '12 days'),
  (o,'note','Referral source: Moreau Design',null,(select id from customers where org_id=o and name='Priya Raman'),u,now()-interval '40 days'),
  (o,'call','Left voicemail',null,(select id from customers where org_id=o and name='Lena Fischer'),u,now()-interval '5 hours'),
  (o,'email','Proposal sent','Awaiting feedback.',(select id from customers where org_id=o and name='Julien Moreau'),u,now()-interval '2 hours');
end $$;
