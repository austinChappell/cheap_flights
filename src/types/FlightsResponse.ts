// To parse this data:
//
//   import { Convert, FlightsResponse } from "./file";
//
//   const flightsResponse = Convert.toFlightsResponse(json);

export interface FlightsResponse {
  airlines: Record<string, Airline>;
  cities: { [key: string]: City };
  airports: { [key: string]: Airport };
  flights: { [key: string]: Flight };
  itineraries: Itineraries;
  info: Info;
  duration: number;
}

export interface Airlines {
  '3M': Airline;
  AA: Airline;
  AS: Airline;
  B6: Airline;
  DL: Airline;
  F9: Airline;
  NK: Airline;
  UA: Airline;
}

export interface Airport {
  name: string;
}

export interface Airline {
  name: string;
}

export interface City {
  name: string;
}

export interface Flight {
  segments: Segment[];
  duration: number;
  count: number;
  data: string;
}

export interface Segment {
  airline: string;
  flight_number: number;
  departure: Arrival;
  arrival: Arrival;
  duration: number;
}

export interface Arrival {
  time: string;
  airport: string;
}

export interface Info {
  from: From;
  to: From;
}

export interface From {
  city: string;
  state: string;
  airports: string[];
}

export interface Itineraries {
  outbound: Bound[];
  inbound: Bound[];
}

export interface Bound {
  one_way_price?: number;
  data: string;
  flight: string;
  min_round_trip_price?: number;
}
