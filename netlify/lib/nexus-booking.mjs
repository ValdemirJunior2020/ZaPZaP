// NexusSales public appointment pre-check. Does NOT create or confirm appointments.
// Does not assume business hours, staff schedules, or a business timezone.
function parseWindow(startAt, durationMinutes, now = Date.now()) {
  if (typeof startAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(startAt)) return null;
  const start = new Date(startAt);
  const duration = Number(durationMinutes);
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(duration) || duration < 15 || duration > 480) return null;
  if (start.getTime() < now + 5 * 60000 || start.getTime() > now + 90 * 86400000) return null;
  return { startAt: start.toISOString(), endAt: new Date(start.getTime() + duration * 60000).toISOString() };
}
function conflicts(appointments, window, employeeId = null) {
  return (appointments || []).some(a => {
    if (!['requested', 'confirmed'].includes(a.status)) return false;
    const relevant = employeeId ? a.employee_id === employeeId : !a.employee_id && !a.staff_id;
    return relevant && new Date(a.start_at) < new Date(window.endAt) && new Date(a.end_at) > new Date(window.startAt);
  });
}
export { parseWindow, conflicts };