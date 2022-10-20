import { FC } from "react";
import { NormalizedSegment } from "../types/BestDeal";

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
      <p><Strong>Flight Number:</Strong> {segment.flightNumber}</p>

      <p><Strong>Flight Duration:</Strong> {segment.flightDuration}</p>

      <p><Strong>Departure Airport</Strong> {segment.departureAirport}</p>

      <p><Strong>Departure Time</Strong> {segment.departureTime}</p>

      <p><Strong>Arrival Airport</Strong> {segment.arrivalAirport}</p>

      <p><Strong>Arrival Time</Strong> {segment.arrivalTime}</p>
    </li>
  )
}

export default FlightSegmentCard;
