/* ---------- helpers ---------- */
const company=()=>{const h=$('header h1');return h?h.textContent.trim():'Com'};
const letterhead=(title,sub='')=>`<div class="ph"><img src="pictures/logo.jpg" class="plogo" onerror="this.style.display='none'"><div><div class="cname">${esc(company())}</div><h2>${title}</h2>${sub?`<small>${sub}</small>`:''}</div></div>`;
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const mins=t=>{const[h,m]=t.split(':');return+h*60+ +m};
const peso=n=>'₱'+(+n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const t12=t=>{if(!t)return '-';const[h,m,s]=t.split(':'),H=+h;return `${H%12||12}:${m}:${s||'00'} ${H<12?'AM':'PM'}`};
const fdt=iso=>new Date(iso).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AV='data:image/svg+xml;utf8,'+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect width='10' height='10' fill='#ccd'/><circle cx='5' cy='4' r='2' fill='#fff'/><path d='M1 10a4 4 0 018 0z' fill='#fff'/></svg>");
const DEPTS=['Operations','Finance','IT','Sales','HR'];
/* reg = regular holiday, spl = special non-working. Edit yearly per DOLE proclamation. */
const HOL={'2026-01-01':'reg','2026-04-02':'reg','2026-04-03':'reg','2026-04-09':'reg','2026-05-01':'reg','2026-06-12':'reg','2026-08-31':'reg','2026-11-30':'reg','2026-12-25':'reg','2026-12-30':'reg','2026-02-17':'spl','2026-04-04':'spl','2026-08-21':'spl','2026-11-01':'spl','2026-12-08':'spl','2026-12-24':'spl','2026-12-31':'spl'};
/* office 8:00 AM - 5:00 PM, unpaid lunch 12:00 - 1:00 PM (minutes after midnight), 8 paid hours/day */
const WORK_IN=480,WORK_OUT=1020,BRK_S=720,BRK_E=780,STD=8;

if(!load('emps',null))save('emps',[
 {code:'EMP001',pass:'1234',name:'Juan Dela Cruz',position:'Staff Accountant',dept:'Finance',hourly:125,contact:'0917-000-0001',email:'juan@company.com',address:'Quezon City',hired:'2025-01-15',sss:'00-0000001-1',tin:'111-111-111',philhealth:'01-000000001-1',pagibig:'1111-1111-1111',status:'active',photo:''},
 {code:'EMP002',pass:'1234',name:'Maria Santos',position:'IT Support',dept:'IT',hourly:156.25,contact:'0917-000-0002',email:'maria@company.com',address:'Pasig City',hired:dstr(new Date()),sss:'00-0000002-2',tin:'222-222-222',philhealth:'01-000000002-2',pagibig:'2222-2222-2222',status:'active',photo:''}]);
/* convert older data (monthly salary / daily rate) to hourly rate */
(()=>{const E=load('emps',[]);let ch=false;
 E.forEach(e=>{if(e.hourly===undefined){const d=e.daily!==undefined?e.daily:(e.salary||0)/26;e.hourly=Math.round(d/STD*100)/100;delete e.daily;delete e.salary;ch=true}});
 if(ch)save('emps',E)})();

 let me=null,selKey=null,aKey=null,tab='',hq='',xp=null,amo=dstr(new Date()).slice(0,7);
 const emps=()=>load('emps',[]);
function show(id){$$('.view').forEach(v=>v.hidden=v.id!==id);if(id==='login')$('#user').focus()}
function go(t){tab=t;xp=null;render()}

/* ---------- pay periods (semi-monthly) ---------- */
const lastDay=(y,m)=>new Date(y,m,0).getDate();
function period(key){ // 'YYYY-MM-1' or 'YYYY-MM-2'
 const[Y,M,h]=key.split('-').map(Number),month=`${Y}-${pad(M)}`;
 const from=month+(h===1?'-01':'-16'),to=month+'-'+pad(h===1?15:lastDay(Y,M));
 return{key,Y,M,h,month,from,to,label:`${h===1?'1st':'2nd'} cutoff (${from} to ${to})`};
}
function curKey(){const n=new Date();return`${n.getFullYear()}-${pad(n.getMonth()+1)}-${n.getDate()<=15?1:2}`}
function periodList(n){let[y,m,h]=curKey().split('-').map(Number),out=[];
 for(let i=0;i<n;i++){out.push(`${y}-${pad(m)}-${h}`);if(h===2)h=1;else{h=2;m--;if(m===0){m=12;y--}}}return out}
const periodSelect=(sel,fn)=>`<select onchange="${fn}(this.value)">${periodList(12).map(k=>`<option value="${k}" ${k===sel?'selected':''}>${period(k).label}</option>`).join('')}</select>`;

/* ---------- leave helpers ---------- */
function leaveDates(l){ // working dates covered by a leave (Sundays skipped)
 const out=[],d=new Date(l.from+'T00:00');
 if(l.to){const t=new Date(l.to+'T00:00');for(;d<=t;d.setDate(d.getDate()+1))if(d.getDay()!==0)out.push(dstr(d))}
 else for(let i=0;i<l.days;){if(d.getDay()!==0){out.push(dstr(d));i++}d.setDate(d.getDate()+1)}
 return out}
const lvRange=l=>l.from+(l.to&&l.to!==l.from?' to '+l.to:'');

/* ---------- HOURLY-RATE computation (DOLE-based) ---------- */
const taxf=t=>t<=20833?0:t<=33333?(t-20833)*.15:t<=66667?1875+(t-33333)*.2:t<=166667?8541.8+(t-66667)*.25:t<=666667?33541.8+(t-166667)*.3:183541.8+(t-666667)*.35;
const ov=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));

function part(e,from,to){ // day-by-day pay for a date range
 const hr=e.hourly,y=new Date();y.setDate(y.getDate()-1);const ys=dstr(y);
 const logs={};load('logs',[]).filter(l=>l.code===e.code&&l.out).forEach(l=>logs[l.date]=l);
 const lv=new Set();
 load('leaves',[]).filter(l=>l.code===e.code&&l.status==='Approved').forEach(l=>leaveDates(l).forEach(x=>lv.add(x)));
 let worked=0,hrs=0,ot=0,hdays=0,leaveDays=0,absent=0,late=0,under=0,otPay=0,hol=0,rest=0,basicWorked=0;
 const st=from>e.hired?from:e.hired;
 for(let d=new Date(st+'T00:00');dstr(d)<=to;d.setDate(d.getDate()+1)){
  const ds=dstr(d),dow=d.getDay(),h=HOL[ds],l=logs[ds];
  if(l){ // worked this day: paid per hour
   const i=mins(l.in),o=mins(l.out);
   const reg=Math.min(STD,(ov(i,o,WORK_IN,WORK_OUT)-ov(i,o,BRK_S,BRK_E))/60),otH=Math.max(0,o-WORK_OUT)/60,pr=reg*hr;
   worked++;hrs+=reg;ot+=otH;basicWorked+=pr;
   late+=Math.max(0,i-WORK_IN);under+=Math.max(0,WORK_OUT-o);
   if(h==='reg'){hol+=pr;otPay+=otH*hr*2.6}            // regular holiday 200%, OT 260%
   else if(h==='spl'){hol+=pr*.3;otPay+=otH*hr*1.69}   // special holiday 130%, OT 169%
   else if(dow===0){rest+=pr*.3;otPay+=otH*hr*1.69}    // rest day 130%, OT 169%
   else otPay+=otH*hr*1.25;                            // ordinary day OT 125%
  }else if(ds<=ys){ // did not work
   if(h==='reg')hdays++;                  // regular holiday paid even if unworked (8 hrs)
   else if(h||dow===0){}                  // special holiday / Sunday: no work, no pay
   else if(lv.has(ds))leaveDays++;        // approved paid leave (8 hrs)
   else absent++;                         // absent: no work, no pay
  }
 }
 const basicHol=hdays*STD*hr,basicLeave=leaveDays*STD*hr,basic=basicWorked+basicHol+basicLeave;
 return{hr,worked,hrs,ot,hdays,leaveDays,absent,late,under,basicWorked,basicHol,basicLeave,basic,otPay,hol,rest,gross:basic+otPay+hol+rest};
}
function calc(e,key){
 const P=period(key),a=part(e,P.from,P.to);
 let sss=0,ph=0,pi=0,tax=0;
 if(P.h===2){ // contributions + tax deducted ONCE a month, on the month's actual earnings
  const f=part(e,P.month+'-01',P.month+'-15'),m=f.gross+a.gross;
  if(m>0){
   sss=Math.min(Math.max(Math.round(m/500)*500,5000),35000)*.05;
   ph=Math.min(Math.max(m,10000),100000)*.025;
   pi=Math.min(m,10000)*.02;
   tax=taxf(m-sss-ph-pi);
  }
 }
 const ded=sss+ph+pi+tax;
 return{...a,P,sss,ph,pi,tax,ded,net:a.gross-ded};
}

/* ---------- salary release records ---------- */
const paidAll=()=>Object.fromEntries(Object.entries(load('paid',{})).filter(([k,v])=>v&&v.c&&v.c.hrs!==undefined));
const pk=(c,k)=>c+'|'+k;
function release(code,key){
 const e=emps().find(x=>x.code===code),p=load('paid',{});if(paidAll()[pk(code,key)])return;
 const c=calc(e,key);delete c.P;p[pk(code,key)]={at:new Date().toISOString(),net:c.net,c};save('paid',p)}
function history(code){ // newest first
 return Object.entries(paidAll()).filter(([k])=>k.startsWith(code+'|'))
  .map(([k,v])=>({key:k.split('|')[1],...v})).sort((a,b)=>b.at.localeCompare(a.at))}

function slipHtml(e,key){
 const rec=paidAll()[pk(e.code,key)],c=rec?{...rec.c,P:period(key)}:calc(e,key),P=c.P;
 const r=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
 return`<h3>Payslip - ${P.label}</h3>
 <p>${esc(e.name)} (${e.code}) · ${esc(e.position)}, ${esc(e.dept)}<br>
 Salary status: ${rec?`<b class="ok">✔ Received - released ${fdt(rec.at)}</b>`:`<b class="bad">Not yet released</b> (estimate) · scheduled pay date ${P.to}`}</p>
 <table>
 ${r('Hourly rate',peso(c.hr))}
 ${r('Regular hours worked ('+c.hrs.toFixed(2)+' hrs × '+peso(c.hr)+')',peso(c.basicWorked))}
 ${r('Regular holiday not worked ('+c.hdays+' day/s × 8 hrs)',peso(c.basicHol))}
 ${r('Paid leave ('+c.leaveDays+' day/s × 8 hrs)',peso(c.basicLeave))}
 ${r('Overtime ('+c.ot.toFixed(2)+' hrs)','+ '+peso(c.otPay))}
 ${r('Holiday premium worked (reg +100% / special +30%)','+ '+peso(c.hol))}
 ${r('Rest day premium worked (+30%)','+ '+peso(c.rest))}
 ${r('<b>Gross pay</b>','<b>'+peso(c.gross)+'</b>')}
 ${r('Late / Undertime ('+c.late+' / '+c.under+' min)','Not paid (only hours worked are paid)')}
 ${r('Absences ('+c.absent+' day/s)','No work, no pay')}
 ${P.h===2?r('SSS / PhilHealth / Pag-IBIG (monthly)','− '+peso(c.sss)+' / '+peso(c.ph)+' / '+peso(c.pi))+r('Withholding tax (once a month)','− '+peso(c.tax))
  :r('Tax & contributions','Deducted on the 2nd cutoff (once a month)')}
 ${r('<b>NET PAY</b>','<b>'+peso(c.net)+'</b>')}</table>`}
function printHtml(html){
 let s=$('#slip');if(!s){s=document.createElement('div');s.id='slip';document.body.appendChild(s)}
 s.innerHTML=html;window.print()}

function printSlip(code,key){
 const e=emps().find(x=>x.code===code);
 printHtml(letterhead('PAYSLIP')+slipHtml(e,key))}

/* ---------- attendance kiosk ---------- */
let clk;
function openAtt(){show('att');tick();clearInterval(clk);clk=setInterval(tick,1000);$('#code').focus();todayLogs()}
function tick(){const n=new Date();$('#clock').textContent=n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});$('#date').textContent=n.toDateString()}
function punch(){
 const code=$('#code').value.trim().toUpperCase(),e=emps().find(x=>x.code===code&&x.status==='active'),m=$('#msg');
 $('#code').value='';$('#code').focus();
 if(!e){m.className='msg bad';m.textContent='Invalid code.';return}
 const n=new Date(),d=dstr(n),t=n.toTimeString().slice(0,8),logs=load('logs',[]);
 let r=logs.find(l=>l.code===code&&l.date===d);
 if(!r){logs.push({code,date:d,in:t,out:'',ts:+n});m.textContent=`✔ ${e.name} - TIME IN at ${t12(t)}`}
 else if(!r.out){
  if(+n-r.ts<60000){m.className='msg bad';m.textContent='Already timed in a moment ago.';return}
  r.out=t;m.textContent=`✔ ${e.name} - TIME OUT at ${t12(t)}`}
 else{m.className='msg bad';m.textContent='Attendance already completed today.';return}
 m.className='msg ok';save('logs',logs);todayLogs();
}
function todayLogs(){
 const E=emps(),l=load('logs',[]).filter(x=>x.date===dstr(new Date())).reverse().slice(0,8);
 $('#todayLogs').innerHTML=l.map(x=>`<div>${esc((E.find(e=>e.code===x.code)||{}).name)} - IN ${t12(x.in)} ${x.out?'| OUT '+t12(x.out):''}</div>`).join('')||'<small>No logs yet.</small>'}

/* ---------- login / navigation ---------- */
function login(ev){ev.preventDefault();const u=$('#user').value.trim(),p=$('#pass').value;me=null;
 if(u==='admin'&&p==='admin123')me={role:'admin'};
 else if(u==='hr'&&p==='hr123')me={role:'hr'};
 else{const x=emps().find(z=>z.code.toLowerCase()===u.toLowerCase()&&z.pass===p&&z.status==='active');if(x)me={role:'employee',code:x.code}}
 if(!me){$('#err').textContent='Invalid username or password.';return}
 $('#err').textContent='';ev.target.reset();selKey=aKey=curKey();hq='';
 tab=me.role==='employee'?'dash':me.role==='hr'?'ov':'pay';render()}
function logout(){me=null;xp=null;closeEmp();show('home')}
 function render(){me.role==='employee'?rEmp():me.role==='hr'?rHR():rAdmin()}
function dash(who,tabs,html){
 show('dash');
 $('#dash').innerHTML=`<nav class="nav">${tabs.map(([id,l])=>`<a class="${id===tab?'on':''}" onclick="go('${id}')">${l}</a>`).join('')}
 <span class="sp"></span><span class="who">👤 ${esc(who)}</span><button class="red sm" onclick="logout()">Log out</button></nav>${html}`}
function img(f,cb){if(!f)return;const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=150;const s=Math.min(i.width,i.height);c.getContext('2d').drawImage(i,(i.width-s)/2,(i.height-s)/2,s,s,0,0,150,150);cb(c.toDataURL('image/jpeg',.7))};i.src=r.result};r.readAsDataURL(f)}

/* ---------- EMPLOYEE ---------- */
function rEmp(){
 const e=emps().find(x=>x.code===me.code),
  tabs=[['dash','🏠 Dashboard'],['pay','💰 Payslip & History'],['att','🕘 Attendance'],['leave','📝 Leave']],
  lv=load('leaves',[]).filter(l=>l.code===e.code),used=lv.filter(l=>l.status==='Approved').reduce((a,l)=>a+l.days,0);
 let html='';
 if(tab==='dash'){
  const c=calc(e,curKey()),h=history(e.code),last=h[0],prev=h[1],cur=paidAll()[pk(e.code,curKey())];
  html=`<div class="card pro"><img src="${e.photo||AV}"><div><h3>${esc(e.name)}</h3>${esc(e.position)} - ${esc(e.dept)}<br>Code: ${e.code}<br>
   <label>Change profile picture<input type="file" accept="image/*" onchange="setPhoto(this.files[0])"></label></div></div>
  <div class="stats">
   <div class="stat">Hourly Rate<b>${peso(e.hourly)}</b></div>
   <div class="stat">Last Salary Received<b>${last?peso(last.net):'-'}</b><small>${last?fdt(last.at)+' · '+period(last.key).label:'None yet'}</small></div>
   <div class="stat">Previous Salary<b>${prev?peso(prev.net):'-'}</b><small>${prev?fdt(prev.at)+' · '+period(prev.key).label:'None yet'}</small></div>
   <div class="stat">Current Cutoff Salary<b class="${cur?'ok':'bad'}">${cur?'✔ Received':'Not yet released'}</b><small>${cur?fdt(cur.at):'Scheduled '+period(curKey()).to}</small></div>
   <div class="stat">Hours Worked (this cutoff)<b>${c.hrs.toFixed(2)}</b></div>
   <div class="stat">Days Present (this cutoff)<b>${c.worked}</b></div>
   <div class="stat">Absences (this cutoff)<b>${c.absent}</b></div>
   <div class="stat">Net Pay (this cutoff, estimate)<b>${peso(c.net)}</b></div>
   <div class="stat">Leave Credits Left<b>${Math.max(0,5-used)} / 5</b></div></div>`;
 }else if(tab==='pay'){
  const h=history(e.code);
  html=`<div class="card scroll">Pay period: ${periodSelect(selKey,'setSel')} <button onclick="printSlip('${e.code}','${selKey}')">🖨 Print payslip</button>${slipHtml(e,selKey)}</div>
  <div class="card scroll"><h3>Salary History</h3><table><tr><th>Period</th><th>Released</th><th>Net pay</th><th>Status</th><th></th></tr>
  ${h.map(x=>`<tr><td>${period(x.key).label}</td><td>${fdt(x.at)}</td><td>${peso(x.net)}</td><td class="ok">✔ Received</td><td><button class="sm" onclick="printSlip('${e.code}','${x.key}')">Print</button></td></tr>`).join('')||'<tr><td colspan="5">No salary released yet.</td></tr>'}</table></div>`;
 }else if(tab==='att'){
  const logs=load('logs',[]).filter(l=>l.code===e.code).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,31);
  html=`<div class="card scroll"><h3>My Attendance (latest 31 days)</h3><table><tr><th>Date</th><th>Time In</th><th>Time Out</th></tr>
  ${logs.map(l=>`<tr><td>${l.date}</td><td>${t12(l.in)}</td><td>${t12(l.out)}</td></tr>`).join('')||'<tr><td colspan="3">No attendance yet.</td></tr>'}</table></div>`;
 }else{
  html=`<div class="card"><h3>File a Leave</h3>
  <div class="grid"><label>From<input type="date" id="lf" onchange="lvPrev()"></label><label>To<input type="date" id="lt" onchange="lvPrev()"></label>
  <label>Reason for leave<input id="lr" placeholder="e.g. sick, family emergency"></label></div>
  <p>Number of days: <b id="ldays">0</b> <small>(Sundays are not counted) · Leave credits left: ${Math.max(0,5-used)} / 5</small></p>
  <button onclick="fileLeave()">Submit Request</button></div>
  <div class="card scroll"><h3>My Leave Requests</h3><table><tr><th>Date</th><th>Days</th><th>Reason</th><th>Status</th></tr>
  ${lv.map(l=>`<tr><td>${lvRange(l)}</td><td>${l.days}</td><td>${esc(l.reason)||'-'}</td><td><span class="tag">${l.status}</span></td></tr>`).join('')||'<tr><td colspan="4">No leave requests.</td></tr>'}</table></div>`;
 }
 dash(e.name,tabs,html)}
function setSel(k){selKey=k;rEmp()}
function setPhoto(f){img(f,d=>{const E=emps();E.find(x=>x.code===me.code).photo=d;save('emps',E);rEmp()})}
function lvPrev(){const f=$('#lf'),t=$('#lt');
 if(f.value&&(!t.value||t.value<f.value))t.value=f.value;t.min=f.value;
 $('#ldays').textContent=f.value&&t.value?leaveDates({from:f.value,to:t.value}).length:0}
function fileLeave(){const f=$('#lf').value,t=$('#lt').value,r=$('#lr').value.trim();
 if(!f||!t||!r)return alert('Please fill in From, To, and Reason.');
 if(t<f)return alert('The "To" date cannot be earlier than the "From" date.');
 const d=leaveDates({from:f,to:t}).length;if(!d)return alert('The selected dates only include Sundays.');
 const L=load('leaves',[]);L.push({id:Date.now(),code:me.code,from:f,to:t,days:d,reason:r,status:'Pending'});save('leaves',L);render()}

/* ---------- HR ---------- */
function empList(){const q=hq.trim().toLowerCase();
 return emps().filter(e=>e.status==='active'&&(!q||[e.name,e.code,e.position,e.dept,e.email,e.contact].join(' ').toLowerCase().includes(q)))}
function empRows(l){
 return l.map(e=>`<tr><td><img src="${e.photo||AV}" class="click" onclick="showEmp('${e.code}')"></td><td>${e.code}</td>
  <td><a class="link" onclick="showEmp('${e.code}')">${esc(e.name)}</a></td><td>${esc(e.position)}</td>
  <td><select onchange="setDept('${e.code}',this.value)">${DEPTS.map(d=>`<option ${d===e.dept?'selected':''}>${d}</option>`).join('')}</select></td>
  <td>${peso(e.hourly)}</td><td>${esc(e.contact)}<br>${esc(e.email)}<br>${esc(e.address)}</td><td>${e.hired}</td>
  <td>${esc(e.sss)}<br>${esc(e.tin)}<br>${esc(e.philhealth)}<br>${esc(e.pagibig)}</td>
  <td><button class="red sm" onclick="resign('${e.code}')">Resign</button></td></tr>`).join('')||'<tr><td colspan="10">No employee found.</td></tr>'}
function srch(v){hq=v;const l=empList();$('#empBody').innerHTML=empRows(l);$('#qc').textContent=`Showing ${l.length} of ${emps().filter(e=>e.status==='active').length} employees`}

function rHR(){
 const E=emps(),act=E.filter(e=>e.status==='active'),res=E.filter(e=>e.status==='resigned'),
  td=dstr(new Date()),logs=load('logs',[]).filter(l=>l.date===td),L=load('leaves',[]),
  lim=new Date();lim.setDate(lim.getDate()-30);
 const nw=act.filter(e=>e.hired>=dstr(lim)),name=c=>esc((E.find(e=>e.code===c)||{}).name),
  tabs=[['ov','📊 Overview'],['emp','👥 Employees'],['add','➕ Add Employee'],['att','🗓 Attendance Report'],['leave','📝 Leave Requests'],['nr','🆕 New / Resigned']];
 let html='';
 if(tab==='ov'){
  html=`<div class="stats"><div class="stat">Active Employees<b>${act.length}</b></div><div class="stat">New Hires (30 days)<b>${nw.length}</b></div>
  <div class="stat">Resigned<b>${res.length}</b></div><div class="stat">Present Today<b>${logs.length}</b></div>
  <div class="stat">Pending Leaves<b>${L.filter(l=>l.status==='Pending').length}</b></div></div>
  <div class="card scroll"><h3>Today's Attendance & Absentees</h3><table><tr><th>Employee</th><th>Department</th><th>Status</th><th>In</th><th>Out</th></tr>
  ${act.map(e=>{const l=logs.find(x=>x.code===e.code);return`<tr><td><a class="link" onclick="showEmp('${e.code}')">${esc(e.name)}</a></td><td>${esc(e.dept)}</td><td class="${l?'ok':'bad'}">${l?'Present':'Absent / Not yet in'}</td><td>${l?t12(l.in):'-'}</td><td>${l?t12(l.out):'-'}</td></tr>`}).join('')}</table></div>`;
 }else if(tab==='emp'){
  const l=empList();
    html=`<div class="card scroll"><h3>All Employees</h3><div class="rbar"><button onclick="printNamesAll()">📋 Print Names List</button></div>
  <input class="search" id="q" placeholder="🔍 Search by name, code, position, department..." value="${esc(hq)}" oninput="srch(this.value)">
  <p><small id="qc">Showing ${l.length} of ${act.length} employees</small></p>
  <table><tr><th>Photo</th><th>Code</th><th>Name</th><th>Position</th><th>Department</th><th>Hourly Rate</th><th>Contact / Email / Address</th><th>Hired</th><th>SSS / TIN / PhilHealth / Pag-IBIG</th><th></th></tr>
  <tbody id="empBody">${empRows(l)}</tbody></table></div>`;
 }else if(tab==='add'){
  html=`<div class="card"><h3>Add New Employee</h3><form onsubmit="addEmp(event)"><div class="grid">
  <input name="name" placeholder="Full name" required><input name="position" placeholder="Position" required>
  <select name="dept">${DEPTS.map(d=>`<option>${d}</option>`).join('')}</select>
  <input name="hourly" type="number" step="0.01" min="0" placeholder="Hourly rate" required><input name="contact" placeholder="Contact no.">
  <input name="email" type="email" placeholder="Email"><input name="address" placeholder="Address">
  <label>Date hired<input name="hired" type="date" value="${td}" required></label>
  <input name="sss" placeholder="SSS no."><input name="tin" placeholder="TIN">
  <input name="philhealth" placeholder="PhilHealth no."><input name="pagibig" placeholder="Pag-IBIG no.">
  <label>Photo<input type="file" accept="image/*" onchange="img(this.files[0],d=>window._ph=d)"></label></div>
  <button>Add Employee</button></form></div>`;
 }else if(tab==='att'){
  html=`<div class="card scroll"><h3>Monthly Attendance Report</h3><div class="rbar">Month: <input type="month" value="${amo}" style="width:auto" onchange="setAmo(this.value)"> <button onclick="printAtt()">🖨 Print Attendance Report</button></div>${attReport(amo)}</div>`;
 }else if(tab==='leave'){
  html=`<div class="card scroll"><h3>Leave Requests</h3><table><tr><th>Employee</th><th>Date</th><th>Days</th><th>Reason</th><th>Status</th><th></th></tr>
  ${L.slice().reverse().map(l=>`<tr><td>${name(l.code)}</td><td>${lvRange(l)}</td><td>${l.days}</td><td>${esc(l.reason)||'-'}</td><td>${l.status}</td>
  <td>${l.status==='Pending'?`<button class="green sm" onclick="setLeave(${l.id},'Approved')">Approve</button> <button class="red sm" onclick="setLeave(${l.id},'Rejected')">Reject</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">No requests.</td></tr>'}</table></div>`;
 }else{
  html=`<div class="card"><h3>New Employees (last 30 days)</h3><div class="rbar"><button onclick="printNew()">🖨 Print New Hired</button> </div>${nw.map(e=>`<div><a class="link" onclick="showEmp('${e.code}')">${esc(e.name)}</a> - ${esc(e.position)}, ${esc(e.dept)} (hired ${e.hired})</div>`).join('')||'None'}</div>
  <div class="card"><h3>Resigned Employees</h3><div class="rbar"><button onclick="printResigned()">🖨 Print Resigned</button> </div>${res.map(e=>`<div><a class="link" onclick="showEmp('${e.code}')">${esc(e.name)}</a> - ${esc(e.position)} (resigned ${e.resigned})</div>`).join('')||'None'}</div>`;
 }
 dash('HR',tabs,html)}
function addEmp(ev){ev.preventDefault();const E=emps(),o=Object.fromEntries(new FormData(ev.target));
 const n=Math.max(0,...E.map(e=>parseInt(e.code.replace(/\D/g,''))||0))+1;
 o.code='EMP'+String(n).padStart(3,'0');o.pass='1234';o.hourly=+o.hourly;o.status='active';o.photo=window._ph||'';window._ph='';
 E.push(o);save('emps',E);alert('Employee added.\nCode: '+o.code+'\nPassword: 1234');tab='emp';render()}
function setDept(c,d){const E=emps();E.find(e=>e.code===c).dept=d;save('emps',E)}
function resign(c){if(!confirm('Mark as resigned?'))return;const E=emps(),e=E.find(x=>x.code===c);e.status='resigned';e.resigned=dstr(new Date());save('emps',E);render()}
function setLeave(id,s){const L=load('leaves',[]);L.find(l=>l.id===id).status=s;save('leaves',L);render()}

/* ---------- employee information sheet (paper) ---------- */
function paperHtml(e){
 const logs=load('logs',[]).filter(l=>l.code===e.code).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10),
  lv=load('leaves',[]).filter(l=>l.code===e.code);
 const f=(a,b)=>`<div class="f"><span>${a}</span><b>${esc(b)||'-'}</b></div>`;
 return`<div class="ph"><img src="pictures/logo.jpg" class="plogo" onerror="this.style.display='none'">
  <div><h2>EMPLOYEE INFORMATION SHEET</h2><small>Confidential - HR Record</small></div></div>
 <div class="pt"><img src="${e.photo||AV}" class="pphoto"><div class="pfields">
  ${f('Employee Code',e.code)}${f('Full Name',e.name)}${f('Position',e.position)}${f('Department',e.dept)}
  ${f('Employment Status',e.status==='active'?'Active':'Resigned'+(e.resigned?' ('+e.resigned+')':''))}
  ${f('Date Hired',e.hired)}${f('Hourly Rate',peso(e.hourly))}</div></div>
 <h4>Contact Details</h4><div class="pgrid">${f('Contact No.',e.contact)}${f('Email',e.email)}${f('Address',e.address)}</div>
 <h4>Government Numbers</h4><div class="pgrid">${f('SSS No.',e.sss)}${f('TIN',e.tin)}${f('PhilHealth No.',e.philhealth)}${f('Pag-IBIG No.',e.pagibig)}</div>
 <h4>Recent Attendance</h4><table><tr><th>Date</th><th>Time In</th><th>Time Out</th></tr>
 ${logs.map(l=>`<tr><td>${l.date}</td><td>${l.in}</td><td>${l.out||'-'}</td></tr>`).join('')||'<tr><td colspan="3">No attendance yet.</td></tr>'}</table>
 <h4>Leave Records</h4><table><tr><th>Date</th><th>Days</th><th>Reason</th><th>Status</th></tr>
 ${lv.map(l=>`<tr><td>${lvRange(l)}</td><td>${l.days}</td><td>${esc(l.reason)||'-'}</td><td>${l.status}</td></tr>`).join('')||'<tr><td colspan="4">No leave records.</td></tr>'}</table>
 <div class="psign"><div>HR Officer<br><small>Signature over printed name</small></div><div>Employee<br><small>Signature over printed name</small></div></div>`}
function showEmp(code){
 const e=emps().find(x=>x.code===code);if(!e)return;
 let o=$('#ov');if(!o){o=document.createElement('div');o.id='ov';o.className='overlay';document.body.appendChild(o)}
 o.innerHTML=`<div class="paper"><div class="pbar"><button class="sm" onclick="printPaper('${code}')">🖨 Print</button> <button class="sm red" onclick="closeEmp()">✕ Close</button></div>${paperHtml(e)}</div>`;
 o.style.display='flex';o.onclick=ev=>{if(ev.target===o)closeEmp()}}
function closeEmp(){const o=$('#ov');if(o)o.style.display='none'}
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeEmp()});
function printPaper(code){printHtml(paperHtml(emps().find(x=>x.code===code)))}

/* ---------- ADMIN (payroll processing) ---------- */
function rAdmin(){
 const tabs=[['pay','💼 Payroll'],['hist','🧾 Payment History']],E=emps();
 let html='';
 if(tab==='pay'){
  const P=period(aKey),paid=paidAll(),act=E.filter(e=>e.status==='active'),
   rows=act.map(e=>{const rec=paid[pk(e.code,aKey)];return{e,rec,c:rec?{...rec.c,P}:calc(e,aKey)}}),
   sum=f=>peso(rows.reduce((a,r)=>a+f(r.c),0));
  html=`<div class="card">Pay period: ${periodSelect(aKey,'setAKey')}<button onclick="payAll()">Process All</button> <button onclick="printPayroll()">🖨 Print Payroll Status</button>
  <p>Scheduled pay date: <b>${P.to}</b> · Released: <b>${rows.filter(r=>r.rec).length} / ${rows.length}</b> employees${P.h===1?'<br><small>Tax and contributions are deducted only on the 2nd cutoff.</small>':''}</p></div>
  <div class="stats"><div class="stat">Total Gross<b>${sum(c=>c.gross)}</b></div><div class="stat">Total Deductions<b>${sum(c=>c.ded)}</b></div><div class="stat">Total Net Payout<b>${sum(c=>c.net)}</b></div></div>
  <div class="card scroll"><table>
  <tr><th>Employee</th><th>Hourly Rate</th><th>Days</th><th>Reg Hrs</th><th>OT Hrs</th><th>Absent</th><th>Late/UT (min)</th><th>Premiums</th><th>Gross</th><th>SSS/PH/HDMF</th><th>Tax</th><th>Net</th><th>Status</th><th></th></tr>
  ${rows.map(({e,rec,c})=>`<tr><td>${esc(e.name)}<br><small>${e.code}</small></td>
   <td><input type="number" step="0.01" min="0" value="${e.hourly}" style="width:100px" ${rec?'disabled':''} onchange="setRate('${e.code}',this.value)"></td>
   <td>${c.worked}</td><td>${c.hrs.toFixed(2)}</td><td>${c.ot.toFixed(2)}</td><td>${c.absent}</td><td>${c.late}/${c.under}</td><td>${peso(c.hol+c.rest)}</td>
   <td>${peso(c.gross)}</td><td>${peso(c.sss+c.ph+c.pi)}</td><td>${peso(c.tax)}</td><td><b>${peso(c.net)}</b></td>
   <td>${rec?`<span class="ok">✔ Received<br><small>${fdt(rec.at)}</small></span>`:`<button class="green sm" onclick="pay('${e.code}')">Process</button>`}</td>
   <td><button class="sm" onclick="printSlip('${e.code}','${aKey}')">Print</button></td></tr>`).join('')}</table></div>
  <small>Paid by the hour (8 paid hrs/day, unpaid lunch 12-1 PM). OT: ordinary 125%, rest day/special 169%, regular holiday 260%. Rest day/special holiday worked 130%, regular holiday worked 200% (100% if unworked). TRAIN tax table. Verify rates with the latest DOLE/BIR/SSS/PhilHealth issuances.</small>`;
 }else{
  const H=Object.entries(paidAll()).map(([k,v])=>{const[code,key]=k.split('|');return{code,key,...v}}).sort((a,b)=>b.at.localeCompare(a.at)),
   nm=c=>esc((E.find(e=>e.code===c)||{}).name||c);
  html=`<div class="card scroll"><h3>Payment History (all released salaries)</h3><table><tr><th>Employee</th><th>Period</th><th>Released</th><th>Net pay</th><th>Status</th><th></th></tr>
  ${H.map(x=>`<tr><td>${nm(x.code)}<br><small>${x.code}</small></td><td>${period(x.key).label}</td><td>${fdt(x.at)}</td><td>${peso(x.net)}</td><td class="ok">✔ Received</td>
  <td><button class="sm" onclick="printSlip('${x.code}','${x.key}')">Print</button></td></tr>`).join('')||'<tr><td colspan="6">No salary released yet.</td></tr>'}</table></div>`;
 }
 dash('Admin',tabs,html)}
function setAKey(k){aKey=k;rAdmin()}
function setRate(c,v){const E=emps();E.find(e=>e.code===c).hourly=+v;save('emps',E);rAdmin()}
function early(){return period(aKey).to>dstr(new Date())?confirm('This cutoff has not ended yet. Process anyway?'):true}
function pay(c){if(!early())return;release(c,aKey);rAdmin()}
function payAll(){if(!early())return;emps().filter(e=>e.status==='active').forEach(e=>release(e.code,aKey));rAdmin()}

/* ---------- splash screen ---------- */
(()=>{const s=$('#splash');if(!s)return;
 const close=()=>{s.classList.add('hide');setTimeout(()=>s.remove(),700)};
 s.onclick=close;setTimeout(close,2500)})();

/* ---------- printable reports ---------- */
const stamp=()=>'Printed: '+new Date().toLocaleString('en-PH',{dateStyle:'long',timeStyle:'short'});
const LAND='<style>@page{size:landscape;margin:10mm}</style>';

function printList(title,list,resigned){
 const rows=list.map((e,i)=>`<tr><td>${i+1}</td><td>${e.code}</td><td>${esc(e.name)}</td><td>${esc(e.position)}</td><td>${esc(e.dept)}</td><td>${e.hired}</td>${resigned?`<td>${e.resigned||'-'}</td>`:''}<td>${esc(e.contact)}</td><td>${esc(e.email)}</td><td>${esc(e.address)}</td></tr>`).join('')||'<tr><td colspan="10">None</td></tr>';
 printHtml(`${LAND}${letterhead(title,stamp()+' · Total: '+list.length)}<table class="rep"><tr><th>#</th><th>Code</th><th>Name</th><th>Position</th><th>Department</th><th>Date Hired</th>${resigned?'<th>Date Resigned</th>':''}<th>Contact</th><th>Email</th><th>Address</th></tr>${rows}</table>`)}
function printAllEmp(){printList('ALL EMPLOYEES',emps().filter(e=>e.status==='active'))}
function printNew(){const lim=new Date();lim.setDate(lim.getDate()-30);
 printList('NEW HIRED EMPLOYEES (LAST 30 DAYS)',emps().filter(e=>e.status==='active'&&e.hired>=dstr(lim)))}
function printResigned(){printList('RESIGNED EMPLOYEES',emps().filter(e=>e.status==='resigned'),true)}

/* monthly attendance report */
function setAmo(v){if(v){amo=v;render()}}
function attReport(m){
 const[Y,M]=m.split('-').map(Number),n=lastDay(Y,M),td=dstr(new Date()),
  logs=load('logs',[]).filter(l=>l.date.startsWith(m)),
  E=emps().filter(e=>e.status==='active'||logs.some(l=>l.code===e.code)),
  lvs=load('leaves',[]).filter(l=>l.status==='Approved'),
  days=Array.from({length:n},(_,i)=>i+1);
 const rows=E.map(e=>{
  const mine={};logs.filter(l=>l.code===e.code).forEach(l=>mine[l.date]=l);
  const lv=new Set();lvs.filter(l=>l.code===e.code).forEach(l=>leaveDates(l).forEach(x=>lv.add(x)));
  let pr=0,ab=0,lc=0,late=0,und=0,ot=0;
  const cells=days.map(d=>{
   const ds=`${m}-${pad(d)}`,dow=new Date(ds+'T00:00').getDay(),l=mine[ds];
   if(l){pr++;late+=Math.max(0,mins(l.in)-WORK_IN);
    if(l.out){und+=Math.max(0,WORK_OUT-mins(l.out));ot+=Math.max(0,mins(l.out)-WORK_OUT)/60}
    return'<td class="ok"><b>P</b></td>'}
   if(ds<e.hired||ds>=td)return'<td></td>';
   if(HOL[ds])return'<td>H</td>';
   if(dow===0)return'<td>S</td>';
   if(lv.has(ds)){lc++;return'<td>L</td>'}
   ab++;return'<td class="bad"><b>A</b></td>'}).join('');
  return`<tr><td class="nm">${esc(e.name)}<br><small>${e.code}</small></td>${cells}<td>${pr}</td><td>${ab}</td><td>${lc}</td><td>${late}</td><td>${und}</td><td>${ot.toFixed(1)}</td></tr>`}).join('');
 const det=logs.slice().sort((a,b)=>a.code.localeCompare(b.code)||a.date.localeCompare(b.date)).map(l=>{
  const e=emps().find(x=>x.code===l.code)||{},i=mins(l.in),o=l.out?mins(l.out):null;
  return`<tr><td>${esc(e.name)}</td><td>${l.date}</td><td>${t12(l.in)}</td><td>${t12(l.out)}</td>
   <td>${o===null?'-':((o-i-ov(i,o,BRK_S,BRK_E))/60).toFixed(2)}</td><td>${Math.max(0,i-WORK_IN)}</td><td>${o===null?'-':Math.max(0,WORK_OUT-o)}</td></tr>`}).join('');
 return`<table class="gd rep"><tr><th>Employee</th>${days.map(d=>`<th>${d}</th>`).join('')}<th>Present</th><th>Absent</th><th>Leave</th><th>Late (min)</th><th>UT (min)</th><th>OT (hrs)</th></tr>
 ${rows||`<tr><td colspan="${n+7}">No employees.</td></tr>`}</table>
 <p class="legend"><b>P</b> Present · <b>A</b> Absent · <b>L</b> Leave · <b>H</b> Holiday · <b>S</b> Sunday / rest day</p>
 <h3 style="margin-top:18px">Detailed Time Records</h3>
 <table class="rep"><tr><th>Employee</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours Worked</th><th>Late (min)</th><th>Undertime (min)</th></tr>
 ${det||'<tr><td colspan="7">No attendance records for this month.</td></tr>'}</table>`}
function printAtt(){const[Y,M]=amo.split('-').map(Number);
 printHtml(`${LAND}${letterhead('MONTHLY ATTENDANCE REPORT',new Date(Y,M-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})+' · '+stamp())}${attReport(amo)}`)}

/* payroll processed / not processed report */
function printPayroll(){
 const P=period(aKey),paid=paidAll(),
  rows=emps().filter(e=>e.status==='active').map(e=>{const rec=paid[pk(e.code,aKey)];return{e,rec,c:rec?{...rec.c,P}:calc(e,aKey)}}),
  done=rows.filter(r=>r.rec).length,sum=f=>peso(rows.reduce((a,r)=>a+f(r.c),0));
 printHtml(`${LAND}${letterhead('PAYROLL STATUS REPORT',P.label+' · '+stamp())}
 <p><b>Processed: ${done} of ${rows.length}</b> · <b>Not yet processed: ${rows.length-done}</b> · Scheduled pay date: ${P.to}</p>
 <table class="rep"><tr><th>#</th><th>Code</th><th>Employee</th><th>Department</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th><th>Date processed</th></tr>
 ${rows.map(({e,rec,c},i)=>`<tr><td>${i+1}</td><td>${e.code}</td><td>${esc(e.name)}</td><td>${esc(e.dept)}</td><td>${peso(c.gross)}</td><td>${peso(c.ded)}</td><td><b>${peso(c.net)}</b></td>
  <td class="${rec?'ok':'bad'}"><b>${rec?'✔ PROCESSED':'✘ NOT YET PROCESSED'}</b></td><td>${rec?fdt(rec.at):'-'}</td></tr>`).join('')}
 <tr><th colspan="4">TOTAL</th><th>${sum(c=>c.gross)}</th><th>${sum(c=>c.ded)}</th><th>${sum(c=>c.net)}</th><th colspan="2"></th></tr></table>`)}

/* ---------- print employee lists ---------- */
function stampText(){return 'Printed: '+new Date().toLocaleString('en-PH',{dateStyle:'long',timeStyle:'short'})}

/* detailed lists (fit 1 short bond paper, landscape) */
function printList(title,list,resigned){
 const z=Math.max(.5,Math.min(1,22/Math.max(1,list.length)));
 const rows=list.map((e,i)=>`<tr><td>${i+1}</td><td>${e.code}</td><td>${esc(e.name)}</td><td>${esc(e.position)}</td><td>${esc(e.dept)}</td><td>${e.hired}</td>${resigned?`<td>${e.resigned||'-'}</td>`:''}<td>${esc(e.contact)}</td><td>${esc(e.email)}</td><td>${esc(e.address)}</td></tr>`).join('')||'<tr><td colspan="10">None</td></tr>';
 printHtml(`<style>@page{size:letter landscape;margin:8mm}</style>${letterhead(title,stampText()+' · Total: '+list.length)}
 <div style="zoom:${z.toFixed(2)}"><table class="rep"><tr><th>#</th><th>Code</th><th>Name</th><th>Position</th><th>Department</th><th>Date Hired</th>${resigned?'<th>Date Resigned</th>':''}<th>Contact</th><th>Email</th><th>Address</th></tr>${rows}</table></div>`)}
function printAllEmp(){printList('ALL EMPLOYEES',emps().filter(e=>e.status==='active'))}
function printNew(){const lim=new Date();lim.setDate(lim.getDate()-30);
 printList('NEW HIRED EMPLOYEES (LAST 30 DAYS)',emps().filter(e=>e.status==='active'&&e.hired>=dstr(lim)))}
function printResigned(){printList('RESIGNED EMPLOYEES',emps().filter(e=>e.status==='resigned'),true)}

/* names-only lists (1 short bond paper, portrait) */
function printNames(title,list){
 const L=list.slice().sort((a,b)=>a.name.localeCompare(b.name)),n=L.length,
  cols=n>80?3:n>40?2:1,z=Math.max(.6,Math.min(1,cols*42/Math.max(1,n)));
 printHtml(`<style>@page{size:letter portrait;margin:12mm}</style>${letterhead(title,stampText()+' · Total: '+n)}
 <div style="zoom:${z.toFixed(2)};column-count:${cols};column-gap:30px;font-size:15px">
 ${L.map((e,i)=>`<div style="padding:3px 0;border-bottom:1px dotted #999;break-inside:avoid">${i+1}. ${esc(e.name)}</div>`).join('')||'None'}</div>`)}
function printNamesAll(){printNames('LIST OF EMPLOYEES',emps().filter(e=>e.status==='active'))}
function printNamesNew(){const lim=new Date();lim.setDate(lim.getDate()-30);
 printNames('LIST OF NEW HIRED EMPLOYEES',emps().filter(e=>e.status==='active'&&e.hired>=dstr(lim)))}
function printNamesResigned(){printNames('LIST OF RESIGNED EMPLOYEES',emps().filter(e=>e.status==='resigned'))}

/* ---------- individual employee attendance print ---------- */
function empAttHtml(code,m){
 const e=emps().find(x=>x.code===code),[Y,M]=m.split('-').map(Number),n=lastDay(Y,M),td=dstr(new Date());
 const logs={};load('logs',[]).filter(l=>l.code===code&&l.date.startsWith(m)).forEach(l=>logs[l.date]=l);
 const lv=new Set();
 load('leaves',[]).filter(l=>l.code===code&&l.status==='Approved').forEach(l=>leaveDates(l).forEach(x=>lv.add(x)));
 let pr=0,ab=0,lc=0,late=0,und=0,ot=0,hrs=0;
 const rows=Array.from({length:n},(_,i)=>{
  const d=i+1,ds=`${m}-${pad(d)}`,dt=new Date(ds+'T00:00'),dow=dt.getDay(),l=logs[ds],
   day=dt.toLocaleDateString('en-US',{weekday:'short'});
  let tin='-',tout='-',h='-',lt='-',ut='-',rem='';
  if(l){
   pr++;const a=mins(l.in);tin=tm12(l.in);lt=Math.max(0,a-WORK_IN);late+=lt;
   if(l.out){const o=mins(l.out),w=(o-a-ov(a,o,BRK_S,BRK_E))/60;
    tout=tm12(l.out);h=w.toFixed(2);hrs+=w;ut=Math.max(0,WORK_OUT-o);und+=ut;ot+=Math.max(0,o-WORK_OUT)/60;rem='Present'}
   else rem='No time out'
  }else if(ds<e.hired||ds>=td)rem='';
  else if(HOL[ds])rem=HOL[ds]==='reg'?'Regular holiday':'Special holiday';
  else if(dow===0)rem='Sunday / rest day';
  else if(lv.has(ds)){lc++;rem='On leave'}
  else{ab++;rem='ABSENT'}
  return`<tr><td>${d}</td><td>${day}</td><td>${tin}</td><td>${tout}</td><td>${h}</td><td>${lt}</td><td>${ut}</td><td class="${rem==='ABSENT'?'bad':''}">${rem}</td></tr>`}).join('');
 const mname=new Date(Y,M-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
 return`${lhead('EMPLOYEE ATTENDANCE RECORD',mname+' · '+stampText())}
 <p><b>${esc(e.name)}</b> (${e.code}) · ${esc(e.position)}, ${esc(e.dept)}</p>
 <div style="zoom:.85"><table class="rep"><tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Hours Worked</th><th>Late (min)</th><th>Undertime (min)</th><th>Remarks</th></tr>${rows}
 <tr><th colspan="4">TOTAL</th><th>${hrs.toFixed(2)}</th><th>${late}</th><th>${und}</th><th>Present: ${pr} · Absent: ${ab} · Leave: ${lc} · OT: ${ot.toFixed(1)} hrs</th></tr></table></div>
 <div class="psign"><div>Employee<br><small>Signature over printed name</small></div><div>HR Officer<br><small>Signature over printed name</small></div></div>`}
function printEmpAtt(code){doPrint(`<style>@page{size:letter portrait;margin:10mm}</style>${empAttHtml(code,attMonth)}`)}

/* add the buttons automatically */
function addRowPrint(){
 document.querySelectorAll('#dash table.gd td.nm').forEach(td=>{
  const sm=td.querySelector('small');if(!sm||td.querySelector('button'))return;
  const b=document.createElement('button');b.className='sm';b.textContent='🖨 Print';b.title='Print this employee\'s attendance';
  b.onclick=()=>printEmpAtt(sm.textContent.trim());
  td.appendChild(document.createElement('br'));td.appendChild(b)})}
(function(){
 const _rh=rHR;rHR=function(){_rh();addRowPrint()};
 const _er=empRows;
 empRows=function(l){return _er(l).replace(/(<button class="sm" onclick="printPaper\('([^']+)'\)">[^<]*<\/button>)/g,
  '$1 <button class="sm" onclick="printEmpAtt(\'$2\')">🖨 Print Attendance</button>')};
 const _se=showEmp;
 showEmp=function(c){_se(c);const bar=document.querySelector('#ov .pbar');
  if(bar&&!bar.innerHTML.includes('printEmpAtt'))
   bar.insertAdjacentHTML('afterbegin',`<button class="sm" onclick="printEmpAtt('${c}')">🖨 Print Attendance</button> `)};
})();

/* ---------- individual attendance print ---------- */
var attMonth; if(attMonth===undefined)attMonth=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
function tm12(t){if(!t)return '-';const[h,m,s]=t.split(':'),H=+h;return `${H%12||12}:${m}:${s||'00'} ${H<12?'AM':'PM'}`}
function stampText(){return 'Printed: '+new Date().toLocaleString('en-PH',{dateStyle:'long',timeStyle:'short'})}
function lhead(title,sub){const h=document.querySelector('header h1');
 return `<div class="ph"><img src="logo.png" class="plogo" onerror="this.style.display='none'"><div><div class="cname">${esc(h?h.textContent.trim():'Company')}</div>${title?`<h2>${title}</h2>`:''}${sub?`<small>${sub}</small>`:''}</div></div>`}

function empAttHtml(code,m){
 const e=emps().find(x=>x.code===code);
 if(!e)throw new Error('Employee code not found: '+code);
 const[Y,M]=m.split('-').map(Number),n=lastDay(Y,M),today=dstr(new Date());
 const logs={};load('logs',[]).filter(l=>l.code===code&&l.date.startsWith(m)).forEach(l=>logs[l.date]=l);
 const lv=new Set();
 load('leaves',[]).filter(l=>l.code===code&&l.status==='Approved').forEach(l=>leaveDates(l).forEach(x=>lv.add(x)));
 let pr=0,ab=0,lc=0,late=0,und=0,ot=0,hrs=0;
 const rows=Array.from({length:n},(_,i)=>{
  const d=i+1,ds=`${m}-${pad(d)}`,dt=new Date(ds+'T00:00'),dow=dt.getDay(),l=logs[ds],
   day=dt.toLocaleDateString('en-US',{weekday:'short'});
  let tin='-',tout='-',h='-',lt='-',ut='-',rem='';
  if(l){
   pr++;const a=mins(l.in);tin=tm12(l.in);lt=Math.max(0,a-WORK_IN);late+=lt;
   if(l.out){const o=mins(l.out),w=(o-a-ov(a,o,BRK_S,BRK_E))/60;
    tout=tm12(l.out);h=w.toFixed(2);hrs+=w;ut=Math.max(0,WORK_OUT-o);und+=ut;ot+=Math.max(0,o-WORK_OUT)/60;rem='Present'}
   else{rem='No time out'}
  }else if(ds<e.hired||ds>=today){rem=''}
  else if(HOL[ds]){rem=HOL[ds]==='reg'?'Regular holiday':'Special holiday'}
  else if(dow===0){rem='Sunday / rest day'}
  else if(lv.has(ds)){lc++;rem='On leave'}
  else{ab++;rem='ABSENT'}
  return`<tr><td>${d}</td><td>${day}</td><td>${tin}</td><td>${tout}</td><td>${h}</td><td>${lt}</td><td>${ut}</td><td class="${rem==='ABSENT'?'bad':''}">${rem}</td></tr>`}).join('');
 const mname=new Date(Y,M-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
 return`${lhead('EMPLOYEE ATTENDANCE RECORD',mname+' · '+stampText())}
 <p><b>${esc(e.name)}</b> (${e.code}) · ${esc(e.position)}, ${esc(e.dept)}</p>
 <div style="zoom:.85"><table class="rep"><tr><th>Date</th><th>Day</th><th>Time In</th><th>Time Out</th><th>Hours Worked</th><th>Late (min)</th><th>Undertime (min)</th><th>Remarks</th></tr>${rows}
 <tr><th colspan="4">TOTAL</th><th>${hrs.toFixed(2)}</th><th>${late}</th><th>${und}</th><th>Present: ${pr} · Absent: ${ab} · Leave: ${lc} · OT: ${ot.toFixed(1)} hrs</th></tr></table></div>
 <div class="psign"><div>Employee<br><small>Signature over printed name</small></div><div>HR Officer<br><small>Signature over printed name</small></div></div>`}

function printEmpAtt(code){
 try{
  const html=`<style>@page{size:letter portrait;margin:10mm}</style>${empAttHtml(code,attMonth)}`;
  let s=document.getElementById('slip');
  if(!s){s=document.createElement('div');s.id='slip';document.body.appendChild(s)}
  s.innerHTML=html;
  setTimeout(()=>window.print(),300);
 }catch(err){alert('Print error: '+err.message)}
}

/* ---------- photos controlled by HR only ---------- */
function hrPhoto(code){
 const i=document.createElement('input');i.type='file';i.accept='image/*';
 i.onchange=()=>img(i.files[0],d=>{
  const E=emps(),e=E.find(x=>x.code===code);if(!e)return;
  e.photo=d;save('emps',E);
  const ov=document.getElementById('ov'),popup=ov&&ov.style.display==='flex';
  render();if(popup)showEmp(code)});
 i.click()}
(function(){
 /* employees can no longer change their own picture */
 const _re=rEmp;
 rEmp=function(){_re();
  document.querySelectorAll('#dash input[type="file"]').forEach(i=>{const l=i.closest('label');(l||i).remove()})};
 setPhoto=function(){};
 /* "Change Photo" button on the HR employee record (expanded row) */
 const _er=empRows;
 empRows=function(l){return _er(l).replace(/(<button class="sm" onclick="printPaper\('([^']+)'\)">[^<]*<\/button>)/g,
  '$1 <button class="sm" onclick="hrPhoto(\'$2\')">📷 Change Photo</button>')};
 /* ...and on the pop-up record */
 const _se=showEmp;
 showEmp=function(c){_se(c);const bar=document.querySelector('#ov .pbar');
  if(bar&&!bar.innerHTML.includes('hrPhoto'))
   bar.insertAdjacentHTML('afterbegin',`<button class="sm" onclick="hrPhoto('${c}')">📷 Change Photo</button> `)};
})();

/* ---------- emergency contact details ---------- */
const emHtml=e=>{const f=(a,b)=>`<div class="f"><span>${a}</span><b>${esc(b)||'-'}</b></div>`;
 return `<h4>Emergency Contact</h4><div class="pgrid">${f('Contact Person',e.emName)}${f('Relationship',e.emRel)}${f('Contact No.',e.emPhone)}${f('Address',e.emAddr)}</div>`};

function editEmerg(code){
 const e=emps().find(x=>x.code===code);if(!e)return;
 let o=document.getElementById('ov');if(!o){o=document.createElement('div');o.id='ov';o.className='overlay';document.body.appendChild(o)}
 window._emPopup=(o.style.display==='flex');
 o.innerHTML=`<div class="paper emform" style="width:480px"><h3>Emergency Contact - ${esc(e.name)}</h3>
  <label>Contact person (full name)<input id="em1" value="${esc(e.emName||'')}"></label>
  <label>Relationship<input id="em2" value="${esc(e.emRel||'')}" placeholder="e.g. mother, spouse, sibling"></label>
  <label>Contact number<input id="em3" value="${esc(e.emPhone||'')}"></label>
  <label>Address<input id="em4" value="${esc(e.emAddr||'')}"></label>
  <div style="display:flex;gap:8px;margin-top:12px"><button onclick="saveEmerg('${code}')">Save</button><button class="red" onclick="closeEmp()">Cancel</button></div></div>`;
 o.style.display='flex';o.onclick=ev=>{if(ev.target===o)closeEmp()}}
function saveEmerg(code){
 const E=emps(),e=E.find(x=>x.code===code);if(!e)return;
 e.emName=document.getElementById('em1').value.trim();e.emRel=document.getElementById('em2').value.trim();
 e.emPhone=document.getElementById('em3').value.trim();e.emAddr=document.getElementById('em4').value.trim();
 save('emps',E);closeEmp();render();if(window._emPopup)showEmp(code)}

(function(){
 /* show it on the employee record (screen + print) */
 const _p=paperHtml;
 paperHtml=function(e){return _p(e).replace('<h4>Recent Attendance</h4>',()=>emHtml(e)+'<h4>Recent Attendance</h4>')};
 /* edit button on the HR record bars */
 const _er=empRows;
 empRows=function(l){return _er(l).replace(/(<button class="sm" onclick="printPaper\('([^']+)'\)">[^<]*<\/button>)/g,
  '$1 <button class="sm" onclick="editEmerg(\'$2\')">✏ Edit Emergency Contact</button>')};
 const _se=showEmp;
 showEmp=function(c){_se(c);const bar=document.querySelector('#ov .pbar');
  if(bar&&!bar.innerHTML.includes('editEmerg'))
   bar.insertAdjacentHTML('afterbegin',`<button class="sm" onclick="editEmerg('${c}')">✏ Edit Emergency Contact</button> `)};
 /* fields on the Add Employee form */
 const _rh=rHR;
 rHR=function(){_rh();
  const g=document.querySelector('#dash form[onsubmit="addEmp(event)"] .grid');
  if(g&&!g.querySelector('[name="emName"]'))
   g.insertAdjacentHTML('beforeend',`<label style="grid-column:1/-1;margin-top:8px;color:var(--maroon-dark)">Emergency Contact</label>
    <input name="emName" placeholder="Contact person (full name)" required><input name="emRel" placeholder="Relationship (e.g. mother, spouse)">
    <input name="emPhone" placeholder="Contact number" required><input name="emAddr" placeholder="Address">`)};
 /* employee dashboard: view only */
 const _re=rEmp;
 rEmp=function(){_re();
  const pro=document.querySelector('#dash .pro');
  if(pro&&me&&me.role==='employee'){const e=emps().find(x=>x.code===me.code);
   pro.insertAdjacentHTML('afterend',`<div class="card"><h3>Emergency Contact</h3>${emHtml(e).replace('<h4>Emergency Contact</h4>','')}<small>To update these details, please contact HR.</small></div>`)}};
})();

/* ---------- more departments ---------- */
['Administration','Accounting','Marketing','Customer Service','Purchasing','Logistics','Warehouse','Production','Engineering','Quality Assurance','Maintenance','Security','Legal','Research and Development']
 .forEach(d=>{if(!DEPTS.includes(d))DEPTS.push(d)});

 /* ---------- HR: edit employee information ---------- */
function editEmp(code){
 const e=emps().find(x=>x.code===code);if(!e)return;
 let o=document.getElementById('ov');if(!o){o=document.createElement('div');o.id='ov';o.className='overlay';document.body.appendChild(o)}
 window._emPopup=(o.style.display==='flex');
 const inp=(id,label,val,type)=>`<label>${label}<input id="ef_${id}" type="${type||'text'}" value="${esc(val||'')}"></label>`,
  depts=DEPTS.includes(e.dept)?DEPTS:[...DEPTS,e.dept];
 o.innerHTML=`<div class="paper emform" style="width:760px"><h3>Edit Employee - ${e.code}</h3>
  <div class="grid">${inp('name','Full name',e.name)}${inp('position','Position',e.position)}
  <label>Department<select id="ef_dept" style="width:100%">${depts.map(d=>`<option ${d===e.dept?'selected':''}>${esc(d)}</option>`).join('')}</select></label>
  ${inp('hired','Date hired',e.hired,'date')}${inp('contact','Contact no.',e.contact)}${inp('email','Email',e.email,'email')}${inp('address','Address',e.address)}
  ${inp('sss','SSS no.',e.sss)}${inp('tin','TIN',e.tin)}${inp('philhealth','PhilHealth no.',e.philhealth)}${inp('pagibig','Pag-IBIG no.',e.pagibig)}</div>
  <h4>Emergency Contact</h4>
  <div class="grid">${inp('emName','Contact person',e.emName)}${inp('emRel','Relationship',e.emRel)}${inp('emPhone','Contact number',e.emPhone)}${inp('emAddr','Address',e.emAddr)}</div>
  <div style="display:flex;gap:8px;margin-top:14px"><button onclick="saveEmp('${code}')">💾 Save Changes</button><button class="red" onclick="closeEmp()">Cancel</button></div></div>`;
 o.style.display='flex';o.onclick=ev=>{if(ev.target===o)closeEmp()}}
function saveEmp(code){
 const E=emps(),e=E.find(x=>x.code===code);if(!e)return;
 const g=id=>document.getElementById('ef_'+id).value.trim();
 if(!g('name')||!g('position')||!g('hired'))return alert('Full name, position, and date hired are required.');
 ['name','position','dept','hired','contact','email','address','sss','tin','philhealth','pagibig','emName','emRel','emPhone','emAddr'].forEach(k=>e[k]=g(k));
 save('emps',E);closeEmp();render();if(window._emPopup)showEmp(code)}

(function(){
 /* Edit button beside Resign in the Employees table */
 const _er=empRows;
 empRows=function(l){return _er(l).replace(/(<button class="red sm" onclick="resign\('([^']+)'\)">Resign<\/button>)/g,
  '<button class="sm" onclick="editEmp(\'$2\')">✏ Edit</button> $1')};
 /* ...and in the record's top bar (expanded row and pop-up) */
 const _er2=empRows;
 empRows=function(l){return _er2(l).replace(/(<button class="sm" onclick="printPaper\('([^']+)'\)">[^<]*<\/button>)/g,
  '$1 <button class="sm" onclick="editEmp(\'$2\')">✏ Edit Employee</button>')};
 const _se=showEmp;
 showEmp=function(c){_se(c);const bar=document.querySelector('#ov .pbar');
  if(bar&&!bar.innerHTML.includes('editEmp('))
   bar.insertAdjacentHTML('afterbegin',`<button class="sm" onclick="editEmp('${c}')">✏ Edit Employee</button> `)};
})();

/* ---------- separate last / first / middle name ---------- */
function splitName(e){
 if(e.firstName!==undefined||e.lastName!==undefined)return{last:e.lastName||'',first:e.firstName||'',middle:e.middleName||''};
 const t=(e.name||'').trim().split(/\s+/).filter(Boolean);
 if(t.length<=1)return{last:'',first:t[0]||'',middle:''};
 return{last:t[t.length-1],first:t[0],middle:t.slice(1,-1).join(' ')}}

function addEmp(ev){
 ev.preventDefault();
 const E=emps(),o=Object.fromEntries(new FormData(ev.target));
 o.lastName=(o.lastName||'').trim();o.firstName=(o.firstName||'').trim();o.middleName=(o.middleName||'').trim();
 o.name=[o.firstName,o.middleName,o.lastName].filter(Boolean).join(' ');
 const n=Math.max(0,...E.map(e=>parseInt(e.code.replace(/\D/g,''))||0))+1;
 o.code='EMP'+String(n).padStart(3,'0');o.pass='1234';o.hourly=+o.hourly;o.status='active';
 o.photo=window._ph||'';window._ph='';
 E.push(o);save('emps',E);alert('Employee added.\nCode: '+o.code+'\nPassword: 1234');tab='emp';render()}

function saveEmp(code){
 const E=emps(),e=E.find(x=>x.code===code);if(!e)return;
 const g=id=>{const el=document.getElementById('ef_'+id);return el?el.value.trim():(e[id]||'')};
 const last=g('last'),first=g('first'),mid=g('middle');
 if(!last||!first||!g('position')||!g('hired'))return alert('Last name, first name, position, and date hired are required.');
 e.lastName=last;e.firstName=first;e.middleName=mid;e.name=[first,mid,last].filter(Boolean).join(' ');
 ['position','dept','hired','contact','email','address','sss','tin','philhealth','pagibig','emName','emRel','emPhone','emAddr'].forEach(k=>e[k]=g(k));
 save('emps',E);closeEmp();render();if(window._emPopup)showEmp(code)}

(function(){
 /* Add Employee form: replace "Full name" with 3 fields */
 const _rh=rHR;
 rHR=function(){_rh();
  const f=document.querySelector('#dash form[onsubmit="addEmp(event)"]'),old=f&&f.querySelector('input[name="name"]');
  if(old){old.insertAdjacentHTML('beforebegin',`<input name="lastName" placeholder="Last name" required><input name="firstName" placeholder="First name" required><input name="middleName" placeholder="Middle name (leave blank if none)">`);old.remove()}};
 /* Edit form: same */
 if(typeof editEmp==='function'){
  const _ee=editEmp;
  editEmp=function(code){_ee(code);
   const e=emps().find(x=>x.code===code),old=document.getElementById('ef_name'),lab=old&&old.closest('label');
   if(!e||!lab)return;const s=splitName(e);
   lab.insertAdjacentHTML('beforebegin',`<label>Last name<input id="ef_last" value="${esc(s.last)}"></label><label>First name<input id="ef_first" value="${esc(s.first)}"></label><label>Middle name<input id="ef_middle" value="${esc(s.middle)}" placeholder="leave blank if none"></label>`);
   lab.remove()};
 }
})();