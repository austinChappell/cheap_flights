import { Airline } from "./Amadeus";

export interface NormalizedSegment {
  airline: Airline | null;
  arrivalAirport: string;
  arrivalTime: string;
  departureAirport: string;
  departureTime: string;
  flightDuration: string;
  flightNumber: string;
}

export interface ReducedItinerary {
  id: string;
  segments: NormalizedSegment[];
}

export interface BestDeal {
  bookingUrl: string;
  id: string;
  numberOfBookableSeats: number;
  price: string;
  outboundItinerary: ReducedItinerary;
  inboundItinerary: ReducedItinerary;
}
