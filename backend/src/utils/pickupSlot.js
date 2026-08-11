// Derive a machine-readable deadline (Date) from a pickup slot label so the
// queue can be ordered by "who needs it soonest". Labels look like:
//   "Within 30 min (10:00 AM–10:30 AM)"
//   "Within 1 hour (10:00 AM–11:00 AM)"
//   "Within 1.5 hours (10:00 AM–11:30 AM)"
//   "Custom pickup 14:00–14:30"
//   "Custom pickup 2:00 PM–2:30 PM"
//   "Quick pickup (ASAP)"
export const pickupSlotDeadline = (pickupSlot, now = new Date()) => {
  const slot = pickupSlot || '';

  let m = slot.match(/Within\s+(\d+)\s+min/i);
  if (m) return new Date(now.getTime() + Number(m[1]) * 60000);

  m = slot.match(/Within\s+([\d.]+)\s+hours?/i);
  if (m) return new Date(now.getTime() + Math.round(Number(m[1]) * 60) * 60000);

  m = slot.match(/Custom pickup\s+(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[\u2013-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (m) {
    const toMin = (h, mer) => {
      let hour = parseInt(h, 10);
      const pm = /pm/i.test(mer || '');
      if (hour === 12) hour = pm ? 12 : 0;
      else if (pm) hour += 12;
      return hour * 60;
    };
    const end = new Date(now);
    end.setHours(Math.floor(toMin(m[4], m[6]) / 60), Number(m[5]), 0, 0);
    return end;
  }

  if (/ASAP/i.test(slot)) return new Date(now.getTime());

  return null;
};
