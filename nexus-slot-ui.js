// Progressive enhancement for the existing public SmartStore contact form.
// Never confirms an appointment or stores visitor data until the visitor submits the existing inquiry form.
(function () {
 'use strict';
 const form = document.getElementById('contactForm');
 const type = document.getElementById('requestType');
 const legacy = document.getElementById('preferredTime');
 const wrap = document.getElementById('preferredTimeWrap');
 if (!form || !type || !legacy || !wrap) return;
 const block = document.createElement('div');
 block.id = 'nxSlotTool';
 block.className = 'hidden';
 block.style.cssText = 'padding:13px;margin:8px 0 13px;border:1px solid #cfe5d9;border-radius:14px;background:#f7fcf9';
 block.innerHTML = '<label id="nxSlotLabel" for="nxSlotDate">Preferred date and time / Data e horário</label>' +
 '<input type="datetime-local" id="nxSlotDate" style="display:block;width:100%;margin:8px 0;padding:11px;border:1px solid #c9ded1;border-radius:9px" />' +
 '<label id="nxSlotDurationLabel" for="nxSlotDuration">Duration / Duração</label>' +
 '<select id="nxSlotDuration" style="margin:8px 0;padding:10px;border:1px solid #c9ded1;border-radius:9px"><option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option></select>' +
 '<button type="button" id="nxSlotCheck" class="btn" style="display:block;margin:8px 0">Check tentative time / Verificar horário</button>' +
 '<p id="nxSlotStatus" role="status" aria-live="polite" style="font-size:12px;line-height:1.6;margin:8px 0 0"></p>';
 wrap.insertAdjacentElement('afterend', block);
 const date = document.getElementById('nxSlotDate');
 const duration = document.getElementById('nxSlotDuration');
 const status = document.getElementById('nxSlotStatus');
 const check = document.getElementById('nxSlotCheck');
 const text = (en, pt) => document.documentElement.lang.toLowerCase().startsWith('pt') ? pt : en;
 const update = () => block.classList.toggle('hidden', type.value !== 'appointment');
 type.addEventListener('change', update);
 update();
 const sourceCode = new URLSearchParams(location.search).get('src') || '';
 const slugMatch = location.pathname.match(/^\/s\/([a-z0-9-]+)/i);
 const slug = slugMatch ? slugMatch[1] : (new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('s') || '');
 const encode = value => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
 const invalidate = () => { status.textContent = ''; };
 date.addEventListener('input', invalidate);
 duration.addEventListener('change', invalidate);
 check.addEventListener('click', async () => {
  if (!slug || !date.value) { status.textContent = text('Choose a date and time.','Escolha uma data e um horário.'); return; }
  const startAt = encode(date.value);
  if (!startAt) { status.textContent = text('Invalid date or time.','Data ou horário inválido.'); return; }
  check.disabled = true;
  status.textContent = text('Checking existing appointments…','Verificando compromissos existentes…');
  try {
   const r = await fetch('/.netlify/functions/store-inquiry', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({action:'check_slot',slug, sourceCode, startAt, durationMinutes: Number(duration.value)}),
    signal: AbortSignal.timeout(9000)
   });
   const data = await r.json().catch(() => ({}));
   if (!r.ok) throw new Error(data.error || 'Check unavailable');
   status.textContent = data.availableForRequest
    ? text('This time falls within business hours with no known conflict. Submit your request; the business must confirm.',
           'Esse horário está dentro do expediente sem conflito conhecido. Envie sua solicitação; a empresa precisa confirmar.')
    : data.code === 'HOURS_UNCONFIGURED' ? text('Business hours not configured yet. Send your request for manual review.', 'A empresa ainda não configurou os horários. Envie o pedido para análise manual.')
    : text('The selected time is unavailable for automatic request. Choose another time or ask the business.', 'Este horário não está disponível para solicitação automática. Escolha outro ou consulte a empresa.');
  } catch (_) {
   status.textContent = text('Automatic check unavailable. You may still send a request for confirmation.',
                             'Verificação indisponível. Você ainda pode enviar a solicitação para confirmação.');
  } finally { check.disabled = false; }
 });
 // Execute before the existing submitInquiry handler; it owns all data submission and consent.
 form.addEventListener('submit', () => {
  if (type.value === 'appointment' && date.value) {
   const iso = encode(date.value);
   if (iso) legacy.value = `${date.value} (${Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'}) | ${duration.value} min | ${iso}`.slice(0, 120);
  }
 }, true);
})();