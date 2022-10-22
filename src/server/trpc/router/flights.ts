import subDays from 'date-fns/subDays';
import addDays from 'date-fns/addDays';
import format from 'date-fns/format';
import colors from 'colors/safe';

import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { BestDeal, FindDealArgs, NormalizedSegment, ReducedItinerary } from "../../../types/BestDeal";
import { FlightsResponse } from "../../../types/FlightsResponse";
import { filterAirlines } from "../../../utils/filterAirlines";
import { sortByPrice } from "../../../utils/sortByPrice";
import { mapItineraries } from "../../../utils/mapItineraries";
import { formatMoney } from "../../../utils/formatMoney";
import axios from "axios";
import { getOffers } from "../../../services/amadeus";
import { OffersResponse, Segment } from "../../../types/Amadeus";
import { convertStringDuration } from "../../../utils/convertNumberToTimeString";

export interface CheapestFlightArgs {
  airlinesToExclude: string[];
  arrivalAirports: string[];
  datePairs: [departureDate: string, returnDate: string][];
  departureAirports: string[];
  flexDate: number;
  numOfAdults: number;
  numOfChildren: number;
}

const cheapestFlightPayload = z.object({
  airlinesToExclude: z.array(z.string().length(2)),
  arrivalAirports: z.array(z.string().length(3)).min(1).max(2),
  datePairs: z.array(z.tuple([
    z.string(),
    z.string()
  ])).min(1).max(6),
  departureAirports: z.array(z.string().length(3)).min(1).max(2),
  flexDate: z.number().min(0).max(7),
  numOfAdults: z.number().min(0),
  numOfChildren: z.number().min(0),
});

const getBookingUrl = ({
  arrivalAirport,
  departureAirport,
  departureDate,
  numberOfAdults,
  numberOfChildren,
  returnDate,
}: {
  arrivalAirport: string;
  departureAirport: string;
  departureDate: string;
  numberOfAdults: string;
  numberOfChildren: string;
  returnDate: string;
}) =>
  `https://skiplagged.com/flights/${departureAirport}/${arrivalAirport}/${departureDate}/${returnDate}?adults=${numberOfAdults}&children=${numberOfChildren}`

export const flightsRouter = router({
  cheapestFlight: publicProcedure
    .input(cheapestFlightPayload)
    .mutation(async ({ input }) => {
      const cheapestFlight = await findCheapestFlight(input);

      return cheapestFlight;
    })
    // .query(({ input }) => {
    //   return {
    //     greeting: `Hello ${input?.text ?? "world"}`,
    //   };
    // }),
});

const getWebsiteUrl = ({
                         fromAirport,
                         toAirport,
                         departureDate,
                         returnDate,
                         numOfAdults,
                         numOfChildren,
                       }: FindDealArgs) => {
  const queryString = `from=${fromAirport}&to=${toAirport}&depart=${departureDate}&return=${returnDate}&format=v3&counts%5Badults%5D=${numOfAdults}&counts%5Bchildren%5D=${numOfChildren}`;
  const url = `https://skiplagged.com/api/search.php?${queryString}`;

  return url;
};

const findBestDeal = async (args: FindDealArgs): Promise<BestDeal | null> => {
  const url = getWebsiteUrl(args);

  const response = await axios(url);

  const data: FlightsResponse = response.data;

  // const airlinesToExclude = [
  //   'B6', // jetblue
  //   'F9', // frontier
  //   'NK', // spirit
  // ];

  const outboundItineraries = filterAirlines({
    airlinesToExclude: args.airlinesToExclude ?? [],
    flights: data.flights,
    itineraries: data.itineraries.outbound,
  }).sort(sortByPrice);
  const inboundItineraries = filterAirlines({
    airlinesToExclude: args.airlinesToExclude ?? [],
    flights: data.flights,
    itineraries: data.itineraries.inbound,
  }).sort(sortByPrice);

  const enhancedOutboundItineraries: ReducedItinerary[] =
    outboundItineraries.map(
      mapItineraries({
        airlines: data.airlines,
        airports: data.airports,
        arrivalAirportCode: 'BOS',
        departureAirportCode: 'DFW',
        flights: data.flights,
      }),
    );

  const enhancedInboundItineraries: ReducedItinerary[] = inboundItineraries.map(
    mapItineraries({
      airlines: data.airlines,
      airports: data.airports,
      arrivalAirportCode: 'DFW',
      departureAirportCode: 'BOS',
      flights: data.flights,
    }),
  );

  const bestOutbound = enhancedOutboundItineraries[0];
  const bestInbound = enhancedInboundItineraries[0];

  if (!bestOutbound || !bestInbound) {
    return null;
  }

  const bestInboundPrice = bestInbound.summary.oneWayPriceInCents ?? Infinity;
  const bestOutboundPrice = bestOutbound.summary.oneWayPriceInCents ?? Infinity;

  const oneWayTotalInCents = bestInboundPrice + bestOutboundPrice;

  const bestOverallPrice = Math.min(
    oneWayTotalInCents,
    bestOutbound.summary.minRoundTripPriceInCents +
    bestInbound.summary.oneWayPriceInCents,
  );

  return {
    bookingUrl: getBookingUrl({
      arrivalAirport: args.toAirport,
      departureAirport: args.fromAirport,
      departureDate: args.departureDate,
      numberOfAdults: `${args.numOfAdults ?? 0}`,
      numberOfChildren: `${args.numOfChildren ?? 0}`,
      returnDate: args.returnDate,
    }),
    id: `${bestInbound.id}-${bestOutbound.id}`,
    price: formatMoney({ amountInCents: bestOverallPrice }),
    priceInCents: bestOverallPrice,
    outboundItinerary: bestOutbound,
    inboundItinerary: bestInbound,
  };
};

const normalizeOffer = (offer: OffersResponse): BestDeal => {
  const outboundItinerary = offer.itineraries[0];
  const inboundItinerary = offer.itineraries[1];

  const mapSegment: (segment: Segment) => NormalizedSegment = (segment) => ({
    airline: segment.carrierCode,
    airlineCode: segment.carrierCode,
    arrivalAirport: segment.arrival.iataCode,
    arrivalTime: segment.arrival.at,
    departureAirport: segment.departure.iataCode,
    departureTime: segment.departure.at,
    flightDuration: convertStringDuration(segment.duration),
    flightNumber: segment.number,
  })

  return {
    bookingUrl: '',
    id: offer.id,
    inboundItinerary: {
      id: '',
      segments: inboundItinerary?.segments.map(mapSegment) ?? [],
      // summary: {} as any,
    },
    outboundItinerary: {
      id: '',
      segments: outboundItinerary?.segments.map(mapSegment) ?? [],
      // summary: {
      //
      // },
    },
    price: offer.price.total,
    // priceInCents: 0,
  }
}

const findCheapestFlight = async (args: CheapestFlightArgs) => {
  try {
    // const data = await getOffers({
    //   numberOfAdults: args.numOfAdults,
    //   numberOfChildren: args.numOfChildren,
    //   possibleDates: args.datePairs,
    //   possibleDestinationLocations: args.arrivalAirports,
    //   possibleOriginLocations: args.departureAirports,
    // });

    const data = {"type":"flight-offer","id":"1","source":"GDS","instantTicketingRequired":false,"nonHomogeneous":false,"oneWay":false,"lastTicketingDate":"2022-10-23","numberOfBookableSeats":9,"itineraries":[{"duration":"PT7H36M","segments":[{"departure":{"iataCode":"DFW","terminal":"E","at":"2022-10-31T13:12:00"},"arrival":{"iataCode":"MCO","at":"2022-10-31T16:50:00"},"carrierCode":"NK","number":"1286","aircraft":{"code":"32A"},"operating":{"carrierCode":"NK"},"duration":"PT2H38M","id":"7","numberOfStops":0,"blacklistedInEU":false},{"departure":{"iataCode":"MCO","at":"2022-10-31T18:55:00"},"arrival":{"iataCode":"BOS","terminal":"B","at":"2022-10-31T21:48:00"},"carrierCode":"NK","number":"432","aircraft":{"code":"32A"},"operating":{"carrierCode":"NK"},"duration":"PT2H53M","id":"8","numberOfStops":0,"blacklistedInEU":false}]},{"duration":"PT15H58M","segments":[{"departure":{"iataCode":"BOS","terminal":"B","at":"2022-11-05T20:18:00"},"arrival":{"iataCode":"ATL","terminal":"N","at":"2022-11-05T23:09:00"},"carrierCode":"NK","number":"2909","aircraft":{"code":"319"},"operating":{"carrierCode":"NK"},"duration":"PT2H51M","id":"11","numberOfStops":0,"blacklistedInEU":false},{"departure":{"iataCode":"ATL","terminal":"N","at":"2022-11-06T09:56:00"},"arrival":{"iataCode":"DFW","terminal":"E","at":"2022-11-06T11:16:00"},"carrierCode":"NK","number":"233","aircraft":{"code":"32N"},"operating":{"carrierCode":"NK"},"duration":"PT2H20M","id":"12","numberOfStops":0,"blacklistedInEU":false}]}],"price":{"currency":"USD","total":"726.48","base":"544.08","fees":[{"amount":"0.00","type":"SUPPLIER"},{"amount":"0.00","type":"TICKETING"}],"grandTotal":"726.48"},"pricingOptions":{"fareType":["PUBLISHED"],"includedCheckedBagsOnly":false},"validatingAirlineCodes":["NK"],"travelerPricings":[{"travelerId":"1","fareOption":"STANDARD","travelerType":"ADULT","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R","includedCheckedBags":{"quantity":0}},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U","includedCheckedBags":{"quantity":0}}]},{"travelerId":"2","fareOption":"STANDARD","travelerType":"ADULT","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R","includedCheckedBags":{"quantity":0}},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U","includedCheckedBags":{"quantity":0}}]},{"travelerId":"3","fareOption":"STANDARD","travelerType":"CHILD","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G"},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R"},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G"},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U"}]}]}

    console.log('the data : ', JSON.stringify(data));

    if (data) {
      const bd = normalizeOffer(data as any);

      return bd;
    }

    return null;

    const datePairs = args.datePairs;

    // const datePairs: [departureDate: string, returnDate: string][] = [
    //   ['2022-09-16', '2022-09-19'],
    //   ['2022-09-30', '2022-10-03'],
    //   ['2022-10-07', '2022-10-10'],
    //   ['2022-10-14', '2022-10-17'],
    //   ['2022-10-21', '2022-10-24'],
    // ];

    const possibleDateOptions: [departureDate: string, returnDate: string][] =
      [];

    const parseDateString = (dateString: string) => {
      const [year, month, day] = dateString.split('-').map(Number);

      return new Date(year ?? 2000, (month ?? 1) - 1, day);
    };

    const attemptToAddDateRange = (
      datePair: [departureDate: string, returnDate: string],
    ) => {
      const firstDate = parseDateString(datePair[0]);
      const secondDate = parseDateString(datePair[1]);
      const now = new Date();

      if (firstDate < secondDate && firstDate > now) {
        possibleDateOptions.push(datePair);
      }
    };

    datePairs.forEach(([departureDate, returnDate]) => {
      attemptToAddDateRange([departureDate, returnDate]);

      if (args.flexDate) {
        const earlyDepartureDate = format(
          subDays(parseDateString(departureDate), args.flexDate),
          'yyyy-MM-dd',
        );

        const lateReturnDate = format(
          addDays(parseDateString(returnDate), args.flexDate),
          'yyyy-MM-dd',
        );

        attemptToAddDateRange([earlyDepartureDate, returnDate]);
        attemptToAddDateRange([departureDate, lateReturnDate]);
      }
    });

    const departureAirports: string[] = args.departureAirports;
    const arrivalAirports: string[] = args.arrivalAirports;

    // const departureAirports = ['DAL', 'DFW'];
    // const arrivalAirports = ['MHT', 'BOS'];
    //
    const airportPairs: [
      departureAirportCode: string,
      arrivalAirportCode: string,
    ][] = [];

    departureAirports.forEach((departureAirportCode) => {
      arrivalAirports.forEach((arrivalAirportCode) => {
        airportPairs.push([departureAirportCode, arrivalAirportCode]);
      });
    });

    const allOptions: {
      airports: [departureAirportCode: string, arrivalAirportCode: string];
      dates: [departureDate: string, returnDate: string];
    }[] = [];

    airportPairs.forEach((airportPair) => {
      possibleDateOptions.forEach((datePair) => {
        allOptions.push({
          airports: airportPair,
          dates: datePair,
        });
      });
    });

    let bestDeal: BestDeal | null = null;

    for (const option of allOptions) {
      const airports = option.airports.join(' => ');
      const dates = option.dates.join(' to ');

      console.log(
        `searching flights for ${colors.green(airports)} from ${colors.cyan(
          dates,
        )}`,
      );

      const deal = await findBestDeal({
        airlinesToExclude: args.airlinesToExclude,
        fromAirport: option.airports[0],
        toAirport: option.airports[1],
        departureDate: option.dates[0],
        returnDate: option.dates[1],
        numOfChildren: args.numOfChildren,
        numOfAdults: args.numOfAdults,
      });

      if (deal) {
        console.log(`deal found with price of ${colors.yellow(deal.price)}`);
      } else {
        console.log(colors.red('could not find a deal'));
      }

      if (
        (!bestDeal && deal) ||
        (bestDeal && deal && deal.priceInCents < bestDeal.priceInCents)
      ) {
        bestDeal = deal;

        console.log(
          `\n${colors.bgMagenta('NEW BEST DEAL!!!')}
           price: ${colors.magenta(deal.price ?? '')}
           airports: ${colors.green(airports)}
           dates: ${colors.cyan(dates)},`,
        );
      } else if (deal) {
        console.log('it is not the best deal');
      }

      console.log('');
    }

    console.log('finished searching flights!');

    return bestDeal;
  } catch (error: unknown) {
    console.log(error, (error as Error).message);
  }
}
