import { Bound } from '../types/FlightsResponse';

export const sortByPrice = (a: Bound, b: Bound) => {
  return (a.min_round_trip_price ?? Infinity) <
    (b.min_round_trip_price ?? Infinity)
    ? -1
    : 1;
};
