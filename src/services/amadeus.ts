import Amadeus from "amadeus";
import format from "date-fns/format";
import subDays from "date-fns/subDays";
import addDays from "date-fns/addDays";
import { FullOffersResponse, OffersResponse, PossibleDatesArgument } from "../types/Amadeus";

import colors from 'colors/safe';
import { parseDateString } from "../utils/parseDateString";

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
});

interface GetOffersArgs {
  numberOfAdults: number;
  numberOfChildren: number;
  possibleDates: PossibleDatesArgument[];
  possibleDestinationLocations: string[];
  possibleOriginLocations: string[];
}

export const getOffers = async (args: GetOffersArgs) => {
  try {
    const possibleDateOptions: [departureDate: string, returnDate: string][] =
      [];

    const attemptToAddDateRange = (datePair: PossibleDatesArgument) => {
      const firstDate = parseDateString(datePair[0]);
      const secondDate = parseDateString(datePair[1]);
      const now = new Date();

      if (firstDate < secondDate && firstDate > now) {
        possibleDateOptions.push(datePair);
      }
    };

    args.possibleDates.forEach(([departureDate, returnDate]) => {
      attemptToAddDateRange([departureDate, returnDate]);

      const earlyDepartureDate = format(
        subDays(parseDateString(departureDate), 1),
        'yyyy-MM-dd',
      );

      const lateReturnDate = format(
        addDays(parseDateString(returnDate), 1),
        'yyyy-MM-dd',
      );

      attemptToAddDateRange([earlyDepartureDate, returnDate]);
      attemptToAddDateRange([departureDate, lateReturnDate]);
    });

    const airportPairs: [
      departureAirportCode: string,
      arrivalAirportCode: string,
    ][] = [];

    args.possibleOriginLocations.forEach((departureAirportCode) => {
      args.possibleDestinationLocations.forEach((arrivalAirportCode) => {
        airportPairs.push([departureAirportCode, arrivalAirportCode]);
      });
    });

    const allOptions: {
      airports: [departureAirportCode: string, arrivalAirportCode: string];
      dates: PossibleDatesArgument;
    }[] = [];

    airportPairs.forEach((airportPair) => {
      possibleDateOptions.forEach((datePair) => {
        allOptions.push({
          airports: airportPair,
          dates: datePair,
        });
      });
    });

    let bestDeal: OffersResponse | null = null;

    for (const option of allOptions) {
      const dates = colors.cyan(option.dates.join(' to '));
      const airports = colors.green(option.airports.join(' => '));

      console.log(`searching flights for ${airports} from ${dates}`);

      // DOCS: https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search/api-reference
      const response: FullOffersResponse =
        await amadeus.shopping.flightOffersSearch.get({
          adults: args.numberOfAdults,
          children: args.numberOfChildren,
          currencyCode: 'USD',
          departureDate: option.dates[0],
          destinationLocationCode: option.airports[1],
          max: 5,
          originLocationCode: option.airports[0],
          returnDate: option.dates[1],
        });

      const offers = response.result.data;

      const bestOffer = offers[0];

      if (
        !bestDeal ||
        Number(bestOffer?.price.base || Infinity) < Number(bestDeal.price.base)
      ) {
        bestDeal = bestOffer ?? null;

        console.log(
          `\n${colors.bgMagenta('NEW BEST DEAL!!!')}
           price: $${colors.magenta(bestDeal?.price.total ?? '')}
           airports: ${colors.green(airports)}
           dates: ${colors.cyan(dates)},`,
        );
      }
    }

    console.log('done searching flights');

    return bestDeal;
  } catch (error) {
    console.log('amadeus error : ', error);
  }
};
