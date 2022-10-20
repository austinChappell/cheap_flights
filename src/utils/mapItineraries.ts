import { Bound, FlightsResponse } from '../types/FlightsResponse';
import {
  EnhancedSegment,
  ReducedItinerary,
} from '../types/BestDeal';
import { formatMoney } from './formatMoney';
import { formatDateWithTimezone } from './formatDateWithTimezone';
import { convertNumberToTimeString } from './convertNumberToTimeString';

export const mapItineraries =
  (args: {
    airlines: FlightsResponse['airlines'];
    airports: FlightsResponse['airports'];
    arrivalAirportCode: string;
    departureAirportCode: string;
    flights: FlightsResponse['flights'];
  }) =>
  (itinerary: Bound): ReducedItinerary => {
    const flight = args.flights[itinerary.flight];

    const enhancedSegments: EnhancedSegment[] = flight
      ? flight.segments.map<EnhancedSegment>((segment) => {
        return {
          ...segment,
          airlineInfo: args.airlines[segment.airline] ?? {
            name: ''
          },
        };
      })
      : [];

    const firstAirline = enhancedSegments?.[0]?.airlineInfo.name;

    const allAirlinesMatch = enhancedSegments.every(
      (segment) => segment.airlineInfo.name === firstAirline,
    );

    const departureSegment = enhancedSegments.find(
      (segment) => segment.departure.airport === args.departureAirportCode,
    );
    const arrivalSegmentIndex = enhancedSegments.findIndex(
      (segment) => segment.arrival.airport === args.arrivalAirportCode,
    );

    const arrivalSegment = enhancedSegments[arrivalSegmentIndex];

    const segmentsOnItinerary = enhancedSegments.slice(
      0,
      arrivalSegmentIndex + 1,
    );

    const minRoundTripPrice = formatMoney({
      amountInCents: itinerary.min_round_trip_price,
    });

    const oneWayPrice = formatMoney({
      amountInCents: itinerary.one_way_price,
    });

    const departureAirport =
      args.airports[departureSegment?.departure.airport ?? '']?.name ?? '';
    const arrivalAirport =
      args.airports[arrivalSegment?.arrival.airport ?? '']?.name ?? '';
    const airline = allAirlinesMatch ? firstAirline : 'Multiple Airlines';

    return {
      id: itinerary.flight,
      segments: segmentsOnItinerary.map((segment) => ({
        airline: args.airlines[segment.airline]?.name ?? '',
        arrivalAirport: args.airports[segment.arrival.airport]?.name ?? '',
        arrivalTime: formatDateWithTimezone(segment.arrival.time),
        departureAirport: args.airports[segment.departure.airport]?.name ?? '',
        departureTime: formatDateWithTimezone(segment.departure.time),
        flightDuration: convertNumberToTimeString(segment.duration / 100),
        flightNumber: segment.flight_number,
      })),
      summary: {
        airline: airline ?? '',
        arrivalAirport,
        arrivalTime: formatDateWithTimezone(arrivalSegment?.arrival.time),
        bestPriceOverall: '',
        departureAirport,
        departureTime: formatDateWithTimezone(departureSegment?.departure.time),
        minRoundTripPrice,
        minRoundTripPriceInCents: itinerary.min_round_trip_price ?? Infinity,
        oneWayPrice,
        oneWayPriceInCents: itinerary.one_way_price ?? Infinity,
      },
    };
  };
