// NexusSales Sales / Vendas dashboard. Uses owner-scoped records only.
import {summarize} from './nexus-sales-intelligence.mjs';
let locale='en',selected=false;
const translations={
 es:{heading:'Inteligencia de ventas',subtitle:'Prioridades basadas en los registros del negocio; no predicen probabilidades de compra.',leads:'Clientes potenciales',won:'Ventas registradas',booked:'Marcados como reservados',confirmed:'Citas confirmadas',requested:'Citas solicitadas',conversion:'Tasa de ventas registradas',priority:'Prioridad de seguimiento',customer:'Cliente',score:'Puntos',tier:'Prioridad',reason:'Señales',employees:'Resultados por empleado',source:'Resultados por QR / fuente',scans:'Visitas aproximadas',none:'Aún no hay registros.',high:'Alta',medium:'Media',low:'Baja',note:'Los resultados usan el estado Won, no pagos confirmados. Aquí no se registran ingresos.',language:'Idioma'},
 pt:{heading:'Inteligência de vendas',subtitle:'Prioridades calculadas a partir dos registros da empresa; não representam probabilidade de compra.',leads:'Leads',won:'Ganhos registrados',booked:'Marcados como agendados',confirmed:'Agendamentos confirmados',requested:'Agendamentos solicitados',conversion:'Taxa de ganhos registrados',priority:'Prioridade de atendimento',customer:'Cliente',score:'Pontos',tier:'Prioridade',reason:'Motivos',employees:'Resultados por funcionário',source:'Resultados por QR / origem',scans:'Acessos aproximados',none:'Nenhum registro disponível.',high:'Alta',medium:'Média',low:'Baixa',note:'Ganhos usam o status Won, não pagamentos verificados; valores financeiros e receita não são rastreados aqui.',language:'Idioma'},
 en:{heading:'Sales intelligence',subtitle:'Priorities based on business records, not predictions of purchase probability.',leads:'Leads',won:'Recorded wins',booked:'Marked booked',confirmed:'Confirmed appointments',requested:'Requested appointments',conversion:'Recorded win rate',priority:'Follow-up priority',customer:'Customer',score:'Points',tier:'Priority',reason:'Signals',employees:'Results by employee',source:'QR / source results',scans:'Approximate visits',none:'No records yet.',high:'High',medium:'Medium',low:'Low',note:'Wins are based on the Won status, not verified payments. Financial amounts or revenue are not tracked here.',language:'Language'}
};
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(w){
 const t=translations[locale],s=summarize(w.leads||[],w.appointments||[],w.employees||[],w.qrSources||[]);
 const k=(name,n)=>`<div class="nx-intel-kpi"><small>${h(name)}</small><strong>${h(n)}</strong></div>`;
 const row=(cols)=>'<tr>'+cols.map(c=>'<td>'+h(c)+'</td>').join('')+'</tr>';
 const table=(headers,items)=>`<div class="nx-intel-scroll"><table><thead><tr>${headers.map(c=>'<th>'+h(c)+'</th>').join('')}</tr></thead><tbody>${items.join('')||row([t.none,...headers.slice(1).map(()=>'')])}</tbody></table></div>`;
 const tier=(x)=>({hot:t.high,warm:t.medium,cold:t.low,won:t.won,lost:'Lost'}[x]||x);
 const rank=s.qualified.slice(0,40).map(l=>row([l.customer_name,l.qualification.score,tier(l.qualification.tier),l.qualification.reasons.slice(0,3).map(x=>x[locale]||x.en||'').join(' · ')]));
 const employees=s.byEmployee.map(e=>row([e.name,e.leads,e.booked,e.won]));
 const sources=s.bySource.map(e=>row([e.name,e.leads,e.scans,e.won]));
 return `<section class="nx-intelligence"><header class="nx-intel-header"><div><h2>${h(t.heading)}</h2><p>${h(t.subtitle)}</p></div><label>${h(t.language)}<select id="nxIntelLanguage"><option value="pt" ${locale==='pt'?'selected':''}>Português</option><option value="en" ${locale==='en'?'selected':''}>English</option><option value="es" ${locale==='es'?'selected':''}>Español</option></select></label></header>
 <div class="nx-intel-kpis">${k(t.leads,s.total)}${k(t.won,s.won)}${k(t.booked,s.booked)}${k(t.confirmed,s.confirmed)}${k(t.requested,s.requested)}${k(t.conversion,s.total?(s.winRate.toFixed(1)+'%'):'0%')}</div>
 <article class="nx-intel-panel"><h3>${t.priority}</h3>${table([t.customer,t.score,t.tier,t.reason],rank)}</article>
 <div class="nx-intel-columns"><article class="nx-intel-panel"><h3>${t.employees}</h3>${table([t.employees,t.leads,t.booked,t.won],employees)}</article><article class="nx-intel-panel"><h3>${t.source}</h3>${table([t.source,t.leads,t.scans,t.won],sources)}</article></div>
 <p class="nx-intel-disclaimer">${h(t.note)}</p></section>`;
}
function activate(workspace){
 const tabs=document.querySelector('.nx-lead-tabs');if(!tabs)return;
 let tab=document.getElementById('nxInsightsTab'),pane=document.getElementById('nxInsightsPane');
 if(!tab){tab=document.createElement('button');tab.id='nxInsightsTab';tab.type='button';tab.setAttribute('role','tab');tab.textContent='📊 Sales / Vendas';tabs.append(tab)}
 if(!pane){pane=document.createElement('div');pane.id='nxInsightsPane';pane.className='hidden';tabs.parentElement.append(pane)}
 const original=document.querySelectorAll('[data-lead-pane]');
 function display(){
  pane.innerHTML=render(workspace);pane.classList.remove('hidden');
  document.getElementById('leadListPane')?.classList.add('hidden');document.getElementById('leadCalendarPane')?.classList.add('hidden');
  original.forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')});
  tab.classList.add('active');tab.setAttribute('aria-selected','true');
  pane.querySelector('#nxIntelLanguage').onchange=e=>{locale=['en','pt','es'].includes(e.target.value)?e.target.value:'en';display()}
 }
 tab.onclick=()=>{selected=true;display()};
 original.forEach(b=>b.addEventListener('click',()=>{selected=false;tab.classList.remove('active');tab.setAttribute('aria-selected','false');pane.classList.add('hidden')}));
 if(selected)display();
}
window.NexusInsights={activate};