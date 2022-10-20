import { format, zonedTimeToUtc } from 'date-fns-tz';

export const formatDateWithTimezone = (date: string | undefined) => {
  const dateFormat = 'M/d/yyyy h:mm a (z)';

  return date
    ? format(zonedTimeToUtc(new Date(date), 'America/Chicago'), dateFormat, {
        timeZone: 'America/Chicago',
      })
    : '';
};
