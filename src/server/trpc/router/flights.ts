import subDays from 'date-fns/subDays';
import addDays from 'date-fns/addDays';
import format from 'date-fns/format';
import colors from 'colors/safe';

import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { BestDeal, FindDealArgs, ReducedItinerary } from "../../../types/BestDeal";
import { FlightsResponse } from "../../../types/FlightsResponse";
import { filterAirlines } from "../../../utils/filterAirlines";
import { sortByPrice } from "../../../utils/sortByPrice";
import { mapItineraries } from "../../../utils/mapItineraries";
import { formatMoney } from "../../../utils/formatMoney";
import axios from "axios";

export interface CheapestFlightArgs {
  arrivalAirports: string[];
  datePairs: [departureDate: string, returnDate: string][];
  departureAirports: string[];
  flexDate: number;
  numOfAdults: number;
  numOfChildren: number;
}

const cheapestFlightPayload = z.object({
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

const findCheapestFlight = async (args: CheapestFlightArgs) => {
  try {
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
