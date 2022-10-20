import { Bound, FlightsResponse } from '../types/FlightsResponse';

export const filterAirlines = (args: {
  airlinesToExclude: string[];
  flights: FlightsResponse['flights'];
  itineraries: Bound[];
}): Bound[] => {
  return args.itineraries.filter((itinerary) => {
    const flight = args.flights[itinerary.flight];

    if (!flight) {
      return false;
    }

    return flight.segments.every(
      (segment) => !args.airlinesToExclude.includes(segment.airline),
    );
  });
};
