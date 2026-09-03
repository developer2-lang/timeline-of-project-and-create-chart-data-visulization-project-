import { supabase } from '../lib/supabase';
import type { Holiday } from '../types/timeline';

function toHoliday(r: {
  id: string;
  holiday_date: string;
  holiday_name: string;
}): Holiday {
  return { id: r.id, holidayDate: r.holiday_date, holidayName: r.holiday_name };
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase!
    .from('holidays')
    .select('*')
    .order('holiday_date', { ascending: true });
  if (error) {
    console.warn('Holidays query failed (table may not exist yet):', error.message);
    return [];
  }
  return (data || []).map(toHoliday);
}

export async function createHoliday(h: Holiday): Promise<void> {
  const { error } = await supabase!.from('holidays').insert({
    id: h.id,
    holiday_date: h.holidayDate,
    holiday_name: h.holidayName || 'Holiday',
  });
  if (error) throw error;
}

export async function updateHoliday(id: string, h: Partial<Holiday>): Promise<void> {
  const payload: Record<string, string> = {};
  if (h.holidayDate !== undefined) payload.holiday_date = h.holidayDate;
  if (h.holidayName !== undefined) payload.holiday_name = h.holidayName;
  payload.updated_at = new Date().toISOString();
  const { error } = await supabase!.from('holidays').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase!.from('holidays').delete().eq('id', id);
  if (error) throw error;
}

export async function insertManyHolidays(holidays: Holiday[]): Promise<void> {
  const { error } = await supabase!.from('holidays').insert(
    holidays.map((h) => ({
      id: h.id,
      holiday_date: h.holidayDate,
      holiday_name: h.holidayName,
    }))
  );
  if (error) throw error;
}
