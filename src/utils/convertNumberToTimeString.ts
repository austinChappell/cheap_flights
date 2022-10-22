export const convertNumberToTimeString = (minutes: number) => {
  const hours = Math.floor(minutes / 60);

  const minutesRemaining = Math.floor(minutes % 60);

  return `${hours}h ${minutesRemaining.toString().padStart(2, '0')}m`;
};

export const convertStringDuration = (duration: string) => {
  // duration PT2H20M
  const splitDuration = duration
    .split(/PT|H|M/)
    .filter(Boolean)
    .map(Number);

  const [hours, minutes] = splitDuration;

  const totalInMinutes = (hours ?? 0) * 60 + (minutes ?? 0)

  return convertNumberToTimeString(totalInMinutes)
}
