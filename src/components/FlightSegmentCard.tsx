import { FC } from "react";
import { NormalizedSegment } from "../types/BestDeal";
import { formatDateWithTimezone } from "../utils/formatDateWithTimezone";

interface Props {
  segment: NormalizedSegment;
}

const Strong: FC<{ children: string }> = ({ children }) => (
  <span className="font-bold">{children}</span>
)

const FlightSegmentCard: FC<Props> = ({
  segment,
}) => {
  return (
    <li key={segment.flightNumber} className="border p-4 rounded">
      <p><Strong>Airline:</Strong> {segment.airline?.commonName}</p>

      <p><Strong>Airline Code:</Strong> {segment.airline?.iataCode}</p>

      <p><Strong>Flight Number:</Strong> {segment.flightNumber}</p>

      <p><Strong>Flight Duration:</Strong> {segment.flightDuration}</p>

      <p><Strong>Departure Airport</Strong> {segment.departureAirport}</p>

      <p><Strong>Departure Time</Strong> {formatDateWithTimezone(segment.departureTime)}</p>

      <p><Strong>Arrival Airport</Strong> {segment.arrivalAirport}</p>

      <p><Strong>Arrival Time</Strong> {formatDateWithTimezone(segment.arrivalTime)}</p>
    </li>
  )
}

export default FlightSegmentCard;
