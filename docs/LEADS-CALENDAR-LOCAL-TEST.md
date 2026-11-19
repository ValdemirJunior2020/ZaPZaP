# Calendar inside Leads & Chats — local review release
The calendar is integrated into **Leads & Chats** (not a separate sidebar module).
Switch using "Leads & Chats" / "Calendar / Agenda" inside the existing panel.

Includes month/week/day view, navigation to today, assigned employee filter, requests awaiting an exact date, appointment creation from a saved lead, reschedule, status confirmation/cancellation/completion, server-side tenant scoping and PostgreSQL overlap exclusion. Client times use the local browser timezone, stored as UTC ISO.

An appointment request saved by the public form is only a lead until the owner sets an exact date/time in the calendar. Merely changing a lead status to Booked does not insert an appointment. The system does not send automatic WhatsApp messages, booking confirmation emails, or guarantee that any appointment is accepted by the customer.

The existing nx_appointments, nx_calendar_staff and nx_calendar_services structures were discovered in the connected Supabase database. The additive bridge migration has already been applied there. The migration makes staff/service nullable for new lead-linked bookings while preserving legacy records, adds nx_employees relationship, RLS and no-overlap constraints. User must not apply this file twice blindly to another database.

LOCAL: pull the review branch, run npm test and npm start, open http://127.0.0.1:8788, sign in, then Leads & Chats > Calendar / Agenda. Test an existing appointment-request lead: Agendar > select time and employee > save requested > confirm > reschedule > cancel. Use a test lead and avoid promising real appointments. Verify other businesses cannot access bookings. No Vercel or PayPal changes.
