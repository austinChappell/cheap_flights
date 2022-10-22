export const parseDateString = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);

  if (year === undefined || month === undefined) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};
