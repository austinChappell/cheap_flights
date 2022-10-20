export const formatMoney = (args: {
  amountInCents: number | undefined;
}): string => {
  if (typeof args.amountInCents !== 'number') {
    return '';
  }

  // Create our number formatter.
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(args.amountInCents / 100);
};
