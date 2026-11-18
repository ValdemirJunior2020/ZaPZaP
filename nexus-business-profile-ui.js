// NexusSales owner-only bilingual operational profile, embedded in existing My Store.
(function(){
 'use strict';
 const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const days=['mon','tue','wed','thu','fri','sat','sun'];
 const dict={
 pt:{heading:'Dados e horários da empresa',note:'Esses dados ajudam a IA a informar horários e encaminhar pedidos de agendamento. O endereço só será divulgado se você permitir.',name:'Nome da empresa',kind:'O que sua empresa faz?',address:'Endereço',city:'Cidade',region:'Estado / Região',country:'País',phone:'Telefone',website:'Site',tz:'Fuso horário',online:'Atendimento somente online',public:'Permitir divulgação do endereço ao cliente',hours:'Horários de funcionamento',closed:'Feriados / Datas fechadas (AAAA-MM-DD, separados por vírgula)',duration:'Duração padrão do atendimento',notice:'Antecedência mínima (horas)',save:'Salvar dados da empresa',saving:'Salvando…',saved:'Dados salvos.',error:'Falha ao salvar. Verifique a instalação da migração do banco de dados.',labels:['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],closedDay:'Fechado',lang:'Idioma',category:'Tipos de negócio (separados por vírgula)'},
 en:{heading:'Business information and operating hours',note:'These details help AI explain opening hours and handle appointment requests. Your address is only shared if you allow it.',name:'Business name',kind:'What does your business do?',address:'Street address',city:'City',region:'State / Region',country:'Country',phone:'Phone',website:'Website',tz:'Time zone',online:'Online-only business',public:'Allow customers to see the address',hours:'Opening hours',closed:'Holidays / Closed dates (YYYY-MM-DD, comma separated)',duration:'Default appointment duration',notice:'Minimum booking notice (hours)',save:'Save business information',saving:'Saving…',saved:'Information saved.',error:'Could not save. Check database migration setup.',labels:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],closedDay:'Closed',lang:'Language',category:'Business categories (comma separated)'}
 };
 let lang='pt',expanded=false;
 const escVal=(v)=>h(v||'');
 const field=(id,label,value='',type='text')=>`<label>${h(label)}<input id="nxBp${id}" type="${type}" value="${escVal(value)}" maxlength="250"></label>`;
 function activate(workspace,api,refresh){
  const store=workspace?.store;const pane=document.getElementById('viewContent');
  if(!store||!pane||!document.querySelector('[data-view="store"].active'))return;
  document.getElementById('nxBusinessProfile')?.remove();
  const p=workspace.businessProfile||{},t=dict[lang];
  const card=document.createElement('section');card.className='nx-business-profile card';card.id='nxBusinessProfile';
  const ranges=days.map((d,i)=>{const a=p.weekly_hours?.[d]||[];const on=a.length>0;return `<div class="nx-bp-day"><label><input type="checkbox" data-nxbp-day="${d}" ${on?'checked':''}> ${t.labels[i]}</label><input type="time" data-nxbp-start="${d}" value="${h(a[0]?.open||'09:00')}" ${on?'':'disabled'}><input type="time" data-nxbp-end="${d}" value="${h(a[0]?.close||'17:00')}" ${on?'':'disabled'}></div>`}).join('');
  card.innerHTML=`<div class="nx-bp-heading"><div><h2>${t.heading}</h2><p>${t.note}</p></div><select id="nxBpLanguage"><option value="pt" ${lang==='pt'?'selected':''}>Português</option><option value="en" ${lang==='en'?'selected':''}>English</option></select></div>
  <form id="nxBpForm"><div class="nx-bp-grid">${field('Address',t.address,p.address)}${field('City',t.city,p.city)}${field('Region',t.region,p.region)}${field('Country',t.country,p.country)}${field('Phone',t.phone,p.phone,'tel')}${field('Website',t.website,p.website,'url')}</div>
  <div class="nx-bp-grid"><label>${t.tz}<select id="nxBpTimezone"><option value="">Select / Selecionar</option>${[p.timezone,...Intl.supportedValuesOf('timeZone'),'UTC'].filter((x,i,a)=>x&&a.indexOf(x)===i).map(x=>`<option value="${h(x)}" ${x===p.timezone?'selected':''}>${h(x)}</option>`).join('')}</select></label>${field('Categories',t.category,(p.categories||[]).join(', '))}</div>
  <label class="nx-bp-check"><input type="checkbox" id="nxBpOnline" ${p.online_only?'checked':''}> ${t.online}</label>
  <label class="nx-bp-check"><input type="checkbox" id="nxBpPublic" ${p.address_public?'checked':''}> ${t.public}</label>
  <h3>${t.hours}</h3><div class="nx-bp-days">${ranges}</div>
  ${field('Closed',t.closed,(p.closed_dates||[]).join(', '))}
  <div class="nx-bp-grid"><label>${t.duration}<select id="nxBpDuration">${[15,30,45,60,90,120].map(x=>`<option value="${x}" ${x===(p.booking_duration_minutes||30)?'selected':''}>${x} min</option>`).join('')}</select></label><label>${t.notice}<input id="nxBpNotice" type="number" min="0" max="168" value="${Number.isInteger(p.booking_notice_hours)?p.booking_notice_hours:2}"></label></div>
  <button type="submit" class="primary" id="nxBpSave">${t.save}</button><p id="nxBpFeedback" role="status"></p></form>`;
  pane.append(card);
  document.getElementById('nxBpLanguage').onchange=e=>{lang=e.target.value==='en'?'en':'pt';activate(workspace,api,refresh)};
  days.forEach(d=>{card.querySelector(`[data-nxbp-day="${d}"]`).onchange=e=>{for(const key of ['start','end'])card.querySelector(`[data-nxbp-${key}="${d}"]`).disabled=!e.target.checked}});
  card.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const get=id=>String(document.getElementById('nxBp'+id)?.value||'').trim();
   const weekly_hours={};for(const d of days){const on=card.querySelector(`[data-nxbp-day="${d}"]`).checked;weekly_hours[d]=on?[{open:card.querySelector(`[data-nxbp-start="${d}"]`).value,close:card.querySelector(`[data-nxbp-end="${d}"]`).value}]:[]}
   const profile={address:get('Address'),city:get('City'),region:get('Region'),country:get('Country'),phone:get('Phone'),website:get('Website'),timezone:get('Timezone'),categories:get('Categories').split(',').map(s=>s.trim()).filter(Boolean),online_only:document.getElementById('nxBpOnline').checked,address_public:document.getElementById('nxBpPublic').checked,weekly_hours,closed_dates:get('Closed').split(',').map(s=>s.trim()).filter(Boolean),booking_duration_minutes:Number(get('Duration')),booking_notice_hours:Number(get('Notice'))};
   const btn=document.getElementById('nxBpSave'),feedback=document.getElementById('nxBpFeedback');btn.disabled=true;feedback.textContent=t.saving;
   try{await api('save_business_profile',{profile});workspace.businessProfile=profile;feedback.textContent=t.saved;await refresh()}catch(err){feedback.textContent=(err?.message||t.error);btn.disabled=false}
  };
 }
 window.NexusBusinessProfile={activate};
})();