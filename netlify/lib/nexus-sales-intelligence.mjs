// NexusSales: explainable operational priority, not an AI probability or credit score.
// Uses only records supplied for the authenticated business by owner-workspace.
const safe = v => String(v ?? '');
const keywords = /\b(buy|purchase|order|book|booking|quote|estimate|price|pricing|available|schedule|appointment|comprar|compra|pedido|orçamento|orcamento|preço|preco|valor|agendar|agendamento|reservar|reserva|disponível|disponivel)\b/i;
const closed = new Set(['Won', 'Lost']);
function qualify(lead, appointments = []) {
  const reasons = [];
  const add = (points, en, pt) => { score += points; reasons.push({ en, pt }); };
  let score = 5;
  const status = safe(lead.status);
  const type = safe(lead.request_type);
  const linked = appointments.filter(a => a.lead_id === lead.id);
  const scheduled = linked.find(a => ['confirmed', 'requested'].includes(a.status));
  if (type === 'appointment') add(32, 'Appointment requested', 'Solicitou agendamento');
  else if (type === 'quote') add(28, 'Quote requested', 'Solicitou orçamento');
  else if (type === 'callback') add(18, 'Callback requested', 'Solicitou retorno');
  if (scheduled?.status === 'confirmed') add(22, 'Appointment confirmed', 'Agendamento confirmado');
  else if (scheduled?.status === 'requested') add(12, 'Appointment scheduled for review', 'Agendamento aguardando confirmação');
  if (safe(lead.preferred_time).trim()) add(8, 'Shared preferred time', 'Informou horário preferido');
  if (lead.employee_id) add(5, 'Assigned salesperson', 'Vendedor atribuído');
  if (lead.source_id) add(5, 'Tracked acquisition source', 'Origem rastreada');
  if (safe(lead.customer_phone).trim() || safe(lead.customer_email).trim()) add(10, 'Contact provided', 'Informou contato');
  if (keywords.test(safe(lead.interest))) add(12, 'Buying-intent language', 'Linguagem de intenção de compra');
  if (status === 'Contacted') add(5, 'Contacted', 'Contato realizado');
  if (status === 'Booked') add(20, 'Lead marked booked', 'Lead marcado como agendado');
  if (closed.has(status)) return { score: status === 'Won' ? 100 : 0, tier: status === 'Won' ? 'won' : 'lost', reasons };
  score = Math.min(100, score);
  return { score, tier: score >= 65 ? 'hot' : score >= 35 ? 'warm' : 'cold', reasons };
}
function summarize(leads = [], appointments = [], employees = [], qrSources = []) {
  const total = leads.length;
  const won = leads.filter(l => l.status === 'Won').length;
  const booked = leads.filter(l => l.status === 'Booked').length;
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const requested = appointments.filter(a => a.status === 'requested').length;
  const lost = leads.filter(l => l.status === 'Lost').length;
  const qualified = leads.map(l => ({ ...l, qualification: qualify(l, appointments) }));
  const byEmployee = employees.map(e => {
    const a = leads.filter(l => l.employee_id === e.id);
    return { id: e.id, name: e.name, leads: a.length, won: a.filter(l => l.status === 'Won').length, booked: a.filter(l => l.status === 'Booked').length };
  });
  const bySource = qrSources.map(s => {
    const a = leads.filter(l => l.source_id === s.id);
    return { id: s.id, name: s.label, leads: a.length, won: a.filter(l => l.status === 'Won').length, scans: Number(s.scan_count || 0) };
  });
  return { total, won, booked, confirmed, requested, lost,
    winRate: total ? (won / total) * 100 : 0,
    bookedRate: total ? (booked / total) * 100 : 0,
    qualified: qualified.sort((a, b) => b.qualification.score - a.qualification.score),
    byEmployee, bySource };
}
export { qualify, summarize };