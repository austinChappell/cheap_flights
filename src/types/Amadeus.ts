// To parse this data:
//
//   import { Convert } from "./file";
//
//   const offersResponse = Convert.toOffersResponse(json);

export interface FullOffersResponse {
  result: {
    data: OffersResponse[];
  };
}

export interface OffersResponse {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: Date;
  numberOfBookableSeats: number;
  itineraries: Itinerary[];
  price: OffersResponsePrice;
  pricingOptions: PricingOptions;
  validatingAirlineCodes: string[];
  travelerPricings: TravelerPricing[];
}

export interface Itinerary {
  duration: string;
  segments: Segment[];
}

export interface Segment {
  departure: Arrival;
  arrival: Arrival;
  carrierCode: string;
  number: string;
  aircraft: Aircraft;
  operating?: Operating;
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface Aircraft {
  code: string;
}

export interface Arrival {
  iataCode: string;
  terminal?: string;
  at: string;
}

export interface Operating {
  carrierCode: string;
}

export interface OffersResponsePrice {
  currency: string;
  total: string;
  base: string;
  fees: Fee[];
  grandTotal: string;
}

export interface Fee {
  amount: string;
  type: string;
}

export interface PricingOptions {
  fareType: string[];
  includedCheckedBagsOnly: boolean;
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string;
  travelerType: string;
  price: TravelerPricingPrice;
  fareDetailsBySegment: FareDetailsBySegment[];
}

export interface FareDetailsBySegment {
  segmentId: string;
  cabin: string;
  fareBasis: string;
  brandedFare?: string;
  class: string;
  includedCheckedBags: IncludedCheckedBags;
  sliceDiceIndicator?: string;
}

export interface IncludedCheckedBags {
  quantity: number;
}

export interface TravelerPricingPrice {
  currency: string;
  total: string;
  base: string;
}

export type PossibleDatesArgument = [departureDate: string, returnDate: string];

export interface Airline {
  businessName: string;
  commonName: string;
  iataCode: string;
  type: string;
}
