const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const store={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>Number.isFinite(n)?n.toLocaleString(undefined,{style:'currency',currency:'USD'}):'—';
const baseVehicles=[{id:'sq5',year:2016,make:'Audi',model:'SQ5',trim:'3.0T',vin:'WA1CCAFPXGA011228'},{id:'allroad',year:2015,make:'Audi',model:'Allroad',trim:'2.0T / 3.0T swap project',vin:'WA1TFAFL0FA058819'}];
let vehicles=store.get('ph_vehicles_v4',store.get('ph_vehicles_v3',baseVehicles));
let context=store.get('ph_search_vehicle_v4',vehicles[0]||null);
let saved=store.get('ph_saved_v4',store.get('ph_saved_v3',[]));
let listings=store.get('ph_listings_v4',store.get('ph_listings',[]));
let recent=[], lastQuery='';
// Search history is intentionally session-only. Clear legacy persisted search state on each fresh launch.
localStorage.removeItem('ph_recent_v4');
localStorage.removeItem('ph_last_query_v4');
localStorage.removeItem('ph_last_query');
let serviceNotes=store.get('ph_service_notes_v43',[]), serviceCategory='All';
let torqueSpecs=store.get('ph_torque_specs_v44',[]);

const catalog=[
{id:'8R0853692B',keys:['8r0853692b','grille bracket','grill bracket'],source:'OEM / INTERCHANGE',title:'Front grille support bracket',meta:'OEM 8R0 853 692 B',fit:'Catalog fit is a strong starting point. Verify bumper/grille configuration on modified vehicles.',confidence:'Confirmed catalog'},
{id:'diffuser',keys:['diffuser','rear valance','quad exit','dual exit'],source:'FITMENT RESEARCH',title:'Rear diffuser / valance',meta:'Outlet and attachment geometry vary by bumper family',fit:'Compare mounting tabs, upper edge profile, outer contour, exhaust openings and bumper generation before ordering.',confidence:'Physical fit check'},
{id:'ac',keys:['ac compressor','a/c compressor','air conditioning compressor'],source:'MAINTENANCE',title:'A/C compressor',meta:'Match by vehicle, engine, compressor code and refrigerant specification',fit:'Use VIN or OEM part-number verification. Similar trims can use different revisions.',confidence:'VIN verify'}];
const sources=[
{name:'eBay',tag:'NEW + USED',url:q=>`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`},
{name:'Google Shopping',tag:'BROAD PRICE CHECK',url:q=>`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`},
{name:'RockAuto',tag:'CATALOG',url:q=>`https://www.google.com/search?q=${encodeURIComponent('site:rockauto.com '+q)}`},
{name:'FCP Euro',tag:'EURO / OE',url:q=>`https://www.fcpeuro.com/search?keywords=${encodeURIComponent(q)}`},
{name:'ECS Tuning',tag:'EURO / PERFORMANCE',url:q=>`https://www.ecstuning.com/Search/SiteSearch/${encodeURIComponent(q)}/`},
{name:'PartsGeek',tag:'AFTERMARKET',url:q=>`https://www.google.com/search?q=${encodeURIComponent('site:partsgeek.com '+q)}`},
{name:'AliExpress',tag:'MARKETPLACE',url:q=>`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`},
{name:'Google',tag:'OEM / FORUMS / WEB',url:q=>`https://www.google.com/search?q=${encodeURIComponent(q)}`}
];
function label(v){return v?[v.year,v.make,v.model,v.trim].filter(Boolean).join(' '):''}
function query(raw){return [label(context),raw].filter(Boolean).join(' ').trim()}
function setContext(v){context={...v};store.set('ph_search_vehicle_v4',context);$('#vehicleContextBadge').textContent=label(context).toUpperCase();$('#saveContextBtn').disabled=false;refreshSearch();renderService();renderTorque()}
function renderRecent(){const box=$('#recentSearches');box.innerHTML='';recent.slice(0,5).forEach(q=>{const b=document.createElement('button');b.className='chip';b.textContent=q;b.onclick=()=>{$('#searchInput').value=q;runSearch()};box.appendChild(b)})}
function renderGarage(){const g=$('#garage');g.innerHTML='';if(!vehicles.length){g.innerHTML='<div class="empty-state">Garage is optional. Save frequently used vehicles here.</div>';return}vehicles.forEach(v=>{const c=document.createElement('article');c.className='garage-card card';c.innerHTML=`<div><h4>${esc(v.year)} ${esc(v.make)} ${esc(v.model)}</h4><p>${esc(v.trim||'')}</p><small>${esc(v.vin||'')}</small></div><div class="garage-actions"><button class="use">USE</button><button class="ghost remove">REMOVE</button></div>`;c.querySelector('.use').onclick=()=>{setContext(v);window.scrollTo({top:0,behavior:'smooth'})};c.querySelector('.remove').onclick=()=>{vehicles=vehicles.filter(x=>x.id!==v.id);store.set('ph_vehicles_v4',vehicles);renderGarage()};g.appendChild(c)})}
function renderSources(raw){const g=$('#sourceGrid');g.innerHTML='';if(!raw){g.innerHTML='<div class="empty-state">Select a vehicle and enter a part to build vehicle-specific searches.</div>';$('#queryLabel').textContent='';return}const q=query(raw);$('#queryLabel').textContent=q;sources.forEach(s=>{const b=document.createElement('button');b.className='source-card';b.innerHTML=`<span>${esc(s.tag)}</span><strong>${esc(s.name)}</strong><small>OPEN LIVE SEARCH ↗</small>`;b.onclick=()=>window.open(s.url(q),'_blank','noopener');g.appendChild(b)})}
function matches(raw){const l=raw.toLowerCase(), found=catalog.filter(x=>x.keys.some(k=>l.includes(k)));if(found.length)return found;return[{id:'generic-'+raw,source:'VEHICLE-SPECIFIC SEARCH',title:raw,meta:label(context)||'Vehicle not selected',fit:'Use the live sources above, then verify by VIN, OEM number, manufacturer catalog, dimensions or mounting points before ordering.',confidence:context?'Vehicle context set':'Vehicle required'}]}
function renderResults(items){const wrap=$('#results');wrap.innerHTML='';$('#resultCount').textContent=items.length?`${items.length} MATCH${items.length>1?'ES':''}`:'';if(!items.length){wrap.innerHTML='<div class="empty-state">Search results and fitment notes will appear here.</div>';return}items.forEach(r=>{const n=$('#resultTemplate').content.cloneNode(true);n.querySelector('.source').textContent=r.source;n.querySelector('.title').textContent=r.title;n.querySelector('.confidence').textContent=r.confidence;n.querySelector('.meta').textContent=r.meta;n.querySelector('.fitment').textContent=r.fit;n.querySelector('.price').textContent='COMPARE LIVE SOURCES';n.querySelector('.open-btn').onclick=()=>window.open(`https://www.google.com/search?q=${encodeURIComponent(query(r.title))}`,'_blank','noopener');n.querySelector('.save-btn').onclick=()=>{if(!saved.some(x=>x.title===r.title&&x.vehicle===label(context))){saved.push({...r,vehicle:label(context),savedAt:Date.now()});store.set('ph_saved_v4',saved);renderSaved()}};wrap.appendChild(n)})}
function renderSaved(){const wrap=$('#saved');wrap.innerHTML='';if(!saved.length){wrap.innerHTML='<div class="empty-state">Saved parts will appear here.</div>';return}saved.forEach((r,i)=>{const a=document.createElement('article');a.className='result card';a.innerHTML=`<div class="result-top"><div><div class="source">SAVED PART</div><h4 class="title">${esc(r.title)}</h4></div><span class="confidence">${esc(r.confidence||'')}</span></div><div class="meta">${esc(r.vehicle||'')}</div><p class="fitment">${esc(r.fit||'')}</p><div class="result-bottom"><strong class="price">${esc(r.meta||'')}</strong><div class="actions"><button class="ghost remove">REMOVE</button></div></div>`;a.querySelector('.remove').onclick=()=>{saved.splice(i,1);store.set('ph_saved_v4',saved);renderSaved()};wrap.appendChild(a)})}
function runSearch(){const raw=$('#searchInput').value.trim();if(!raw)return;if(!context){alert('Choose a vehicle first.');return}lastQuery=raw;recent=[raw,...recent.filter(x=>x.toLowerCase()!==raw.toLowerCase())].slice(0,8);renderRecent();renderSources(raw);renderResults(matches(raw))}
function refreshSearch(){if(lastQuery){$('#searchInput').value=lastQuery;renderSources(lastQuery);renderResults(matches(lastQuery))}}
function parseAmt(v){const n=parseFloat(String(v||'').replace(/[$,\s]/g,''));return Number.isFinite(n)?n:0}
function renderListings(){const w=$('#listingTable');w.innerHTML='';if(!listings.length){w.innerHTML='<div class="empty-state">Add promising listings. PartHound ranks item price + shipping.</div>';$('#bestDeal').textContent='Add listings to compare delivered prices.';return}const s=[...listings].sort((a,b)=>a.price+a.shipping-b.price-b.shipping),best=s[0];$('#bestDeal').innerHTML=`BEST DELIVERED: <strong>${money(best.price+best.shipping)}</strong> — ${esc(best.seller)} • ${esc(best.title)}`;s.forEach(x=>{const r=document.createElement('div');r.className='listing-row';r.innerHTML=`<div><strong>${esc(x.seller)}</strong><span>${esc(x.title)}</span><small>${esc(x.confidence)}</small></div><div class="cost"><span>${money(x.price)} + ${money(x.shipping)} ship</span><strong>${money(x.price+x.shipping)}</strong></div><div class="listing-actions">${x.url?'<button class="ghost open">OPEN</button>':''}<button class="ghost remove">×</button></div>`;r.querySelector('.open')?.addEventListener('click',()=>window.open(x.url,'_blank','noopener'));r.querySelector('.remove').onclick=()=>{listings=listings.filter(l=>l.id!==x.id);store.set('ph_listings_v4',listings);renderListings()};w.appendChild(r)})}
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw Error();return r.json()}
function fillYears(sel){const y=new Date().getFullYear()+1;for(let n=y;n>=1981;n--){const o=document.createElement('option');o.value=o.textContent=n;sel.appendChild(o)}}
let allMakes=[];
function makeListFor(input){return document.getElementById(input.getAttribute('list'))}
async function loadMakes(makeInput,modelInput){
  makeInput.disabled=true; modelInput.disabled=true;
  makeInput.placeholder='Loading makes…';
  try{
    if(!allMakes.length){
      const d=await getJSON('https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json');
      allMakes=[...new Set((d.Results||[]).map(x=>x.Make_Name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    }
    const dl=makeListFor(makeInput); dl.innerHTML=allMakes.map(x=>`<option value="${esc(x)}"></option>`).join('');
    makeInput.disabled=false; makeInput.placeholder='Make — type to search';
  }catch{makeInput.placeholder='Connection required'}
}
async function loadModels(yearSel,makeInput,modelInput){
  const year=yearSel.value, make=makeInput.value.trim();
  if(!year||!make){modelInput.disabled=true;modelInput.value='';return}
  modelInput.disabled=true; modelInput.placeholder='Loading models…';
  try{
    const d=await getJSON(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`);
    const list=[...new Set((d.Results||[]).map(x=>x.Model_Name).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const dl=makeListFor(modelInput); dl.innerHTML=list.map(x=>`<option value="${esc(x)}"></option>`).join('');
    modelInput.disabled=false; modelInput.placeholder=list.length?'Model — type to search':'No models found';
  }catch{modelInput.placeholder='Could not load models'}
}
async function decodeInto(vinInput,status,yearSel,makeInput,modelInput,trimInput){
  const vin=vinInput.value.trim().toUpperCase(); status.className='helper';
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)){status.textContent='VIN must be 17 valid characters.';status.classList.add('err');return null}
  status.textContent='Decoding VIN…';
  try{
    const d=await getJSON(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`),r=d.Results?.[0]||{};
    if(!r.Make||!r.Model||!r.ModelYear)throw Error();
    yearSel.value=String(r.ModelYear);
    if(!allMakes.length)await loadMakes(makeInput,modelInput);
    const exact=allMakes.find(x=>x.toLowerCase()===String(r.Make).toLowerCase());
    makeInput.value=exact||r.Make;
    await loadModels(yearSel,makeInput,modelInput);
    modelInput.value=r.Model;
    trimInput.value=[r.Trim,r.Series,r.DisplacementL?`${r.DisplacementL}L`:null,r.EngineConfiguration,r.DriveType].filter(Boolean).join(' • ');
    status.textContent=`Decoded: ${r.ModelYear} ${r.Make} ${r.Model}`;status.classList.add('ok');
    return{year:+r.ModelYear,make:r.Make,model:r.Model,trim:trimInput.value,vin};
  }catch{status.textContent='Could not decode that VIN.';status.classList.add('err');return null}
}
function pickerVehicle(){return{year:+$('#searchYear').value,make:$('#searchMake').value,model:$('#searchModel').value,trim:$('#searchTrim').value.trim(),vin:$('#searchVin').value.trim().toUpperCase()}}
function addToGarage(v){if(!v.year||!v.make||!v.model)return false;if(vehicles.some(x=>x.vin&&v.vin&&x.vin===v.vin))return true;vehicles.push({...v,id:'veh-'+Date.now()});store.set('ph_vehicles_v4',vehicles);renderGarage();return true}
const serviceCategories=['All','Engine','Transmission','Brakes','Suspension','Electrical','HVAC','Fluids & Maintenance','Torque Specs','Body','Other'];
function renderService(){
  const v=context; $('#serviceVehicle').textContent=v?label(v).toUpperCase():'NO VEHICLE SELECTED';
  $('#serviceHeading').textContent=v?`${label(v)} service workspace`:'Vehicle service workspace';
  $('#serviceCats').innerHTML=serviceCategories.map(c=>`<button class="service-cat ${c===serviceCategory?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  $$('.service-cat').forEach(b=>b.onclick=()=>{serviceCategory=b.dataset.cat;renderService()});
  const q=$('#serviceSearch')?.value.trim().toLowerCase()||'';
  const vehicleKey=v?[v.year,v.make,v.model].join('|').toLowerCase():'';
  const rows=serviceNotes.filter(n=>(!vehicleKey||n.vehicleKey===vehicleKey)&&(serviceCategory==='All'||n.category===serviceCategory)&&(!q||[n.title,n.body,n.category,n.source].join(' ').toLowerCase().includes(q)));
  $('#serviceEntries').innerHTML=rows.length?rows.map(n=>`<article class="service-entry"><div><span>${esc(n.category)}</span><h4>${esc(n.title)}</h4><p>${esc(n.body).replace(/\n/g,'<br>')}</p>${n.source?`<small>Source: ${esc(n.source)}</small>`:''}</div><button class="link-btn danger service-delete" data-id="${esc(n.id)}">DELETE</button></article>`).join(''):`<div class="empty-state">No matching service notes yet. Add your own specs or procedure notes, or open Mitchell 1 DIY for the licensed service information.</div>`;
  $$('.service-delete').forEach(b=>b.onclick=()=>{if(confirm('Delete this service note?')){serviceNotes=serviceNotes.filter(n=>n.id!==b.dataset.id);store.set('ph_service_notes_v43',serviceNotes);renderService()}});
}
$('#openMitchellBtn').onclick=()=>window.open('https://diy.eautorepair.net/','_blank','noopener');
$('#addServiceBtn').onclick=()=>{if(!context){alert('Select a vehicle first so the note is saved to the right service manual.');return}$('#serviceDialog').showModal()};
$('#serviceSearch').addEventListener('input',renderService);
$('#serviceForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;if(!context){e.preventDefault();return}serviceNotes.unshift({id:'svc-'+Date.now(),vehicleKey:[context.year,context.make,context.model].join('|').toLowerCase(),vehicle:label(context),category:$('#serviceCategory').value,title:$('#serviceTitle').value.trim(),body:$('#serviceBody').value.trim(),source:$('#serviceSource').value.trim(),createdAt:new Date().toISOString()});store.set('ph_service_notes_v43',serviceNotes);setTimeout(()=>{$('#serviceForm').reset();renderService()},0)});
function torqueVehicleKey(v){return v?[v.year,v.make,v.model].join('|').toLowerCase():''}
function torqueConvert(value,unit){const n=Number(value);if(!Number.isFinite(n))return null;return unit==='nm'?{nm:n,ftlb:n*0.737562149}:{ftlb:n,nm:n*1.355817948}}
function fmtTorque(n){if(!Number.isFinite(n))return '—';return Math.abs(n-Math.round(n))<0.05?String(Math.round(n)):n.toFixed(1)}
function renderTorque(){
  const box=$('#torqueEntries'); if(!box)return;
  const key=torqueVehicleKey(context), q=$('#torqueSearch')?.value.trim().toLowerCase()||'', pref=$('#torqueSystem')?.value||'both';
  const rows=torqueSpecs.filter(t=>(!key||t.vehicleKey===key)&&(!q||[t.component,t.fastener,t.angle,t.source,t.notes].join(' ').toLowerCase().includes(q)));
  box.innerHTML=rows.length?rows.map(t=>{const c=torqueConvert(t.value,t.unit)||{};const f=`${fmtTorque(c.ftlb)} ft-lb`, n=`${fmtTorque(c.nm)} N·m`;const primary=pref==='nm'?n:f;const secondary=pref==='nm'?f:n;return `<article class="torque-entry"><div class="torque-main"><span class="torque-label">${esc(t.component)}</span><h5>${esc(t.fastener||'Fastener')}</h5>${t.angle?`<div class="torque-angle">${esc(t.angle)}</div>`:''}${t.notes?`<p>${esc(t.notes)}</p>`:''}${t.source?`<small>Source: ${esc(t.source)}</small>`:''}</div><div class="torque-value"><strong>${pref==='both'?`${f} <em>/</em> ${n}`:primary}</strong>${pref!=='both'?`<small>${secondary}</small>`:''}<button class="link-btn danger torque-delete" data-id="${esc(t.id)}">DELETE</button></div></article>`}).join(''):`<div class="empty-state">No saved torque specs for this vehicle yet. Add verified values from Mitchell 1 DIY or another trusted source.</div>`;
  $$('.torque-delete').forEach(b=>b.onclick=()=>{if(confirm('Delete this torque spec?')){torqueSpecs=torqueSpecs.filter(t=>t.id!==b.dataset.id);store.set('ph_torque_specs_v44',torqueSpecs);renderTorque()}});
}
$('#addTorqueBtn').onclick=()=>{if(!context){alert('Select a vehicle first so the torque spec is saved to the right vehicle.');return}$('#torqueDialog').showModal()};
$('#torqueSearch').addEventListener('input',renderTorque);
$('#torqueSystem').addEventListener('change',renderTorque);
$('#torqueForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;if(!context){e.preventDefault();return}const value=Number($('#torqueValue').value.trim());if(!Number.isFinite(value)||value<=0){e.preventDefault();alert('Enter a valid torque value.');return}torqueSpecs.unshift({id:'tq-'+Date.now(),vehicleKey:torqueVehicleKey(context),vehicle:label(context),component:$('#torqueComponent').value.trim(),fastener:$('#torqueFastener').value.trim(),value,unit:$('#torqueUnit').value,angle:$('#torqueAngle').value.trim(),source:$('#torqueSource').value.trim(),notes:$('#torqueNotes').value.trim(),createdAt:new Date().toISOString()});store.set('ph_torque_specs_v44',torqueSpecs);setTimeout(()=>{$('#torqueForm').reset();renderTorque()},0)});
function exportData(){const d={app:'PartHound',version:4.4,exportedAt:new Date().toISOString(),vehicles,context,saved,listings,recent,lastQuery,notes:$('#projectNotes').value,serviceNotes,torqueSpecs};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='PartHound-v4-backup.json';a.click();URL.revokeObjectURL(a.href)}
async function importData(f){try{const d=JSON.parse(await f.text());if(d.app!=='PartHound')throw Error();vehicles=d.vehicles||vehicles;context=d.context||context;saved=d.saved||saved;listings=d.listings||listings;recent=[];lastQuery='';serviceNotes=d.serviceNotes||serviceNotes;torqueSpecs=d.torqueSpecs||torqueSpecs;store.set('ph_service_notes_v43',serviceNotes);store.set('ph_torque_specs_v44',torqueSpecs);$('#projectNotes').value=d.notes||'';store.set('ph_vehicles_v4',vehicles);store.set('ph_search_vehicle_v4',context);store.set('ph_saved_v4',saved);store.set('ph_listings_v4',listings);localStorage.removeItem('ph_recent_v4');localStorage.removeItem('ph_last_query_v4');localStorage.setItem('ph_notes',d.notes||'');initRender();alert('Backup imported.')}catch{alert('That is not a valid PartHound backup.')}}
const sy=$('#searchYear'),smk=$('#searchMake'),smd=$('#searchModel'),vy=$('#vehYear'),vmk=$('#vehMake'),vmd=$('#vehModel');
fillYears(sy);fillYears(vy);loadMakes(smk,smd);
function autoLoadModels(year,make,model){let t;make.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{const exact=allMakes.some(x=>x.toLowerCase()===make.value.trim().toLowerCase());if(exact&&year.value)loadModels(year,make,model)},180)});}
autoLoadModels(sy,smk,smd);autoLoadModels(vy,vmk,vmd);
sy.onchange=()=>loadModels(sy,smk,smd);smk.onchange=()=>loadModels(sy,smk,smd);vy.onchange=()=>{if(vmk.disabled)loadMakes(vmk,vmd);else loadModels(vy,vmk,vmd)};vmk.onchange=()=>loadModels(vy,vmk,vmd);
$('#searchVinBtn').onclick=async()=>{const v=await decodeInto($('#searchVin'),$('#searchVinStatus'),sy,smk,smd,$('#searchTrim'));if(v)setContext(v)};
$('#useVehicleBtn').onclick=()=>{const v=pickerVehicle();if(!v.year||!v.make||!v.model){$('#searchVinStatus').textContent='Choose year, make and model, or decode a VIN.';$('#searchVinStatus').className='helper err';return}setContext(v);$('#searchVinStatus').textContent='Vehicle selected for this search.';$('#searchVinStatus').className='helper ok'};
$('#saveContextBtn').onclick=()=>{if(context&&addToGarage(context))alert('Vehicle saved to garage.')};
$('#searchBtn').onclick=runSearch;$('#searchInput').addEventListener('keydown',e=>{if(e.key==='Enter')runSearch()});
$('#addVehicleBtn').onclick=()=>{$('#vehicleDialog').showModal();if(vmk.disabled||!allMakes.length)loadMakes(vmk,vmd)};$('#decodeVinBtn').onclick=()=>decodeInto($('#vehVin'),$('#vinStatus'),vy,vmk,vmd,$('#vehTrim'));
$('#vehicleForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;const v={id:'veh-'+Date.now(),year:+vy.value,make:vmk.value,model:vmd.value,trim:$('#vehTrim').value.trim(),vin:$('#vehVin').value.trim().toUpperCase()};if(!v.year||!v.make||!v.model){e.preventDefault();$('#vinStatus').textContent='Select year, make and model, or decode a VIN.';$('#vinStatus').className='helper err';return}vehicles.push(v);store.set('ph_vehicles_v4',vehicles);setContext(v);setTimeout(()=>{renderGarage();$('#vehicleForm').reset();vmd.disabled=true;vmd.value='';$('#vinStatus').textContent=''},0)});
$$('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#addListingBtn').onclick=()=>{if(lastQuery)$('#listTitle').value=lastQuery;$('#listingDialog').showModal()};$('#listingForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;const price=parseAmt($('#listPrice').value),shipping=parseAmt($('#listShipping').value);if(price<=0){e.preventDefault();return}listings.push({id:'listing-'+Date.now(),seller:$('#listSeller').value.trim(),title:$('#listTitle').value.trim(),price,shipping,url:$('#listUrl').value.trim(),confidence:$('#listConfidence').value});store.set('ph_listings_v4',listings);setTimeout(()=>{$('#listingForm').reset();renderListings()},0)});
$('#clearSavedBtn').onclick=()=>{if(saved.length&&confirm('Clear all saved parts?')){saved=[];store.set('ph_saved_v4',saved);renderSaved()}};
const notes=$('#projectNotes');notes.value=localStorage.getItem('ph_notes')||'';notes.oninput=()=>localStorage.setItem('ph_notes',notes.value);$('#exportBtn').onclick=exportData;$('#importBtn').onclick=()=>$('#importFile').click();$('#importFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''};
function setNetwork(){const on=navigator.onLine;$('#networkBadge').textContent=on?'ONLINE':'OFFLINE';$('#networkBadge').classList.toggle('offline',!on)}window.addEventListener('online',setNetwork);window.addEventListener('offline',setNetwork);setNetwork();
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true};
if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{
      localStorage.removeItem('ph_lock_hash_v42');
      sessionStorage.removeItem('ph_lock_hash_v42');
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const r of regs) await r.unregister();
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('parthound-')).map(k=>caches.delete(k)));
      await navigator.serviceWorker.register('./sw-v443.js?v=443',{scope:'./'});
    }catch(e){console.warn('PartHound cache reset:',e)}
  },{once:true});
}
function initRender(){if(context)$('#vehicleContextBadge').textContent=label(context).toUpperCase();renderGarage();renderSaved();renderListings();renderRecent();renderService();renderTorque();if(lastQuery){$('#searchInput').value=lastQuery;refreshSearch()}else{renderSources('');renderResults([])}}
initRender();
// No app lock. Clear any legacy lock state.
localStorage.removeItem('ph_lock_hash_v42');
sessionStorage.removeItem('ph_lock_hash_v42');
