import { Airline, Flight, Segment } from './FlightsResponse';

export interface EnhancedFlight extends Flight {
  enhancedSegments: EnhancedSegment[];
}

interface NormalizedSegment {
  airline: string;
  arrivalAirport: string;
  arrivalTime: string;
  departureAirport: string;
  departureTime: string;
  flightDuration: string;
  flightNumber: number;
}

interface ReducedItinerarySummary {
  airline: string;
  arrivalAirport: string;
  arrivalTime: string;
  bestPriceOverall: string;
  departureAirport: string;
  departureTime: string;
  minRoundTripPrice: string;
  minRoundTripPriceInCents: number;
  oneWayPrice: string;
  oneWayPriceInCents: number;
}

export interface ReducedItinerary {
  id: string;
  segments: NormalizedSegment[];
  summary: ReducedItinerarySummary;
}

export interface EnhancedSegment extends Segment {
  airlineInfo: Airline;
}

export interface FindDealArgs {
  airlinesToExclude?: string[];
  departureDate: string;
  flexDate?: number;
  fromAirport: string;
  numOfAdults: number;
  numOfChildren: number;
  returnDate: string;
  toAirport: string;
}

export interface BestDeal {
  id: string;
  price: string;
  priceInCents: number;
  outboundItinerary: ReducedItinerary;
  inboundItinerary: ReducedItinerary;
}