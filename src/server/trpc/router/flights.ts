import { publicProcedure, router } from "../trpc";
import { z } from "zod";
import { BestDeal, NormalizedSegment } from "../../../types/BestDeal";
import { getAirlines, getOffers } from "../../../services/amadeus";
import { Airline, OffersResponse, Segment } from "../../../types/Amadeus";
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

export const flightsRouter = router({
  cheapestFlight: publicProcedure
    .input(cheapestFlightPayload)
    .mutation(async ({ input }) => {
      return await findCheapestFlight(input);
    })
});

const normalizeOffer = async (offer: OffersResponse): Promise<BestDeal> => {
  const outboundItinerary = offer.itineraries[0];
  const inboundItinerary = offer.itineraries[1];

  const airlineCodes = [
    ...(
      new Set(offer.itineraries
        .flatMap(itinerary => itinerary.segments.map(s => s.carrierCode)))
    )
  ];

  const airlines = airlineCodes.length ? await getAirlines(airlineCodes) : [];

  // const airlines =  [
  //   {
  //     type: 'airline',
  //     iataCode: 'NK',
  //     businessName: 'SPIRIT AIRLINES',
  //     commonName: 'SPIRIT AIRLINES'
  //   },
  //   {
  //     type: 'airline',
  //     iataCode: 'VA',
  //     icaoCode: 'VOZ',
  //     businessName: 'VIRGIN AUSTRALIA INTL',
  //     commonName: 'VIRGIN AUSTRALIA'
  //   }
  // ]

  console.log('airlines : ', airlines);

  const getAirlineNameFromSegment = (segment: Segment): Airline | null =>
    airlines.find(airline => airline.iataCode === segment.carrierCode) ?? null

  const mapSegment: (segment: Segment) => NormalizedSegment = (segment) => ({
    airline: getAirlineNameFromSegment(segment),
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
    numberOfBookableSeats: offer.numberOfBookableSeats,
    outboundItinerary: {
      id: '',
      segments: outboundItinerary?.segments.map(mapSegment) ?? [],
      // summary: {
      //
      // },
    },
    price: `$${offer.price.total}`,
    // priceInCents: 0,
  }
}

const findCheapestFlight = async (args: CheapestFlightArgs) => {
  try {
    const data = await getOffers({
      excludedAirlineCodes: args.airlinesToExclude,
      flexDate: args.flexDate,
      numberOfAdults: args.numOfAdults,
      numberOfChildren: args.numOfChildren,
      possibleDates: args.datePairs,
      possibleDestinationLocations: args.arrivalAirports,
      possibleOriginLocations: args.departureAirports,
    });

    // const data = {"type":"flight-offer","id":"1","source":"GDS","instantTicketingRequired":false,"nonHomogeneous":false,"oneWay":false,"lastTicketingDate":"2022-10-23","numberOfBookableSeats":9,"itineraries":[{"duration":"PT7H36M","segments":[{"departure":{"iataCode":"DFW","terminal":"E","at":"2022-10-31T13:12:00"},"arrival":{"iataCode":"MCO","at":"2022-10-31T16:50:00"},"carrierCode":"NK","number":"1286","aircraft":{"code":"32A"},"operating":{"carrierCode":"NK"},"duration":"PT2H38M","id":"7","numberOfStops":0,"blacklistedInEU":false},{"departure":{"iataCode":"MCO","at":"2022-10-31T18:55:00"},"arrival":{"iataCode":"BOS","terminal":"B","at":"2022-10-31T21:48:00"},"carrierCode":"NK","number":"432","aircraft":{"code":"32A"},"operating":{"carrierCode":"NK"},"duration":"PT2H53M","id":"8","numberOfStops":0,"blacklistedInEU":false}]},{"duration":"PT15H58M","segments":[{"departure":{"iataCode":"BOS","terminal":"B","at":"2022-11-05T20:18:00"},"arrival":{"iataCode":"ATL","terminal":"N","at":"2022-11-05T23:09:00"},"carrierCode":"NK","number":"2909","aircraft":{"code":"319"},"operating":{"carrierCode":"NK"},"duration":"PT2H51M","id":"11","numberOfStops":0,"blacklistedInEU":false},{"departure":{"iataCode":"ATL","terminal":"N","at":"2022-11-06T09:56:00"},"arrival":{"iataCode":"DFW","terminal":"E","at":"2022-11-06T11:16:00"},"carrierCode":"NK","number":"233","aircraft":{"code":"32N"},"operating":{"carrierCode":"NK"},"duration":"PT2H20M","id":"12","numberOfStops":0,"blacklistedInEU":false}]}],"price":{"currency":"USD","total":"726.48","base":"544.08","fees":[{"amount":"0.00","type":"SUPPLIER"},{"amount":"0.00","type":"TICKETING"}],"grandTotal":"726.48"},"pricingOptions":{"fareType":["PUBLISHED"],"includedCheckedBagsOnly":false},"validatingAirlineCodes":["NK"],"travelerPricings":[{"travelerId":"1","fareOption":"STANDARD","travelerType":"ADULT","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R","includedCheckedBags":{"quantity":0}},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U","includedCheckedBags":{"quantity":0}}]},{"travelerId":"2","fareOption":"STANDARD","travelerType":"ADULT","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R","includedCheckedBags":{"quantity":0}},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G","includedCheckedBags":{"quantity":0}},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U","includedCheckedBags":{"quantity":0}}]},{"travelerId":"3","fareOption":"STANDARD","travelerType":"CHILD","price":{"currency":"USD","total":"242.16","base":"181.36"},"fareDetailsBySegment":[{"segmentId":"7","cabin":"ECONOMY","fareBasis":"GA7NR","class":"G"},{"segmentId":"8","cabin":"ECONOMY","fareBasis":"RA7NR","class":"R"},{"segmentId":"11","cabin":"ECONOMY","fareBasis":"GA14Y4","class":"G"},{"segmentId":"12","cabin":"ECONOMY","fareBasis":"UA7NR","class":"U"}]}]}

    if (data) {
      return await normalizeOffer(data);
    }

    return null;
  } catch (error: unknown) {
    console.log(error, (error as Error).message);
  }
}
