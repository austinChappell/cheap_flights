export const convertNumberToTimeString = (minutes: number) => {
  const hours = Math.floor(minutes / 60);

  const minutesRemaining = Math.floor(minutes % 60);

  return `${hours}h ${minutesRemaining.toString().padStart(2, '0')}m`;
};
