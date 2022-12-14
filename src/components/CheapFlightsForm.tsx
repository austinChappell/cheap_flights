import { FC, FormEvent, useCallback } from "react";
import { TRPCClientErrorLike } from "@trpc/client";
import { CheapestFlightArgs } from "../server/trpc/router/flights";
import Label from "./Label";
import Input from "./Input";

type FormElements = Record<keyof CheapestFlightArgs, { value: string }>

const maybeRenderErrorMessage = (errors: TRPCClientErrorLike<any> | null, key: string) => {
  const item = JSON.parse(errors?.message ?? '[]')?.find((e: any) => e.path?.[0] === key);

  if (item?.message) {
    return (
      <div className="bg-red-100 border-t-4 border-red-500 rounded-b text-teal-900 px-4 py-3 shadow-md mt-1 mb-4" role="alert">
        <div className="flex">
          <div className="py-1">
            <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 20 20">
              <path
                d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm">{item.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return null;
}

interface Props {
  error: TRPCClientErrorLike<any> | null;
  onSubmit: (payload: CheapestFlightArgs) => void;
}

const CheapFlightsForm: FC<Props> = ({
  error,
  onSubmit,
}) => {
  const handleSubmit = useCallback((evt: FormEvent) => {
    evt.preventDefault();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formElements: FormElements = (evt.target as unknown as any).elements;

    const payload: CheapestFlightArgs = {
      airlinesToExclude: formElements.airlinesToExclude.value.split(',').filter(Boolean),
      arrivalAirports: formElements.arrivalAirports.value.split(';'),
      datePairs: formElements.datePairs.value.split(';').map(pair => pair.split(',')) as CheapestFlightArgs['datePairs'],
      departureAirports: formElements.departureAirports.value.split(';'),
      flexDate: formElements.flexDate.value ? Number(formElements.flexDate.value) : 0,
      numOfAdults: formElements.numOfAdults.value ? Number(formElements.numOfAdults.value) : 0,
      numOfChildren: formElements.numOfChildren.value ? Number(formElements.numOfChildren.value) : 0,
    }

    onSubmit(payload);
  }, [onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      <Label htmlFor={"airlinesToExclude"}>
        Airlines to Exclude (comma separated)
      </Label>

      <Input
        name="airlinesToExclude"
        placeholder="AA,AS"
        type="text"
      />

      {maybeRenderErrorMessage(error, 'airlinesToExclude')}

      <p className="text-slate-400 text-xs">
        B6 ??? jetblue
        <br />
        F9 ??? frontier
        <br />
        NK ??? spirit
      </p>

      <Label htmlFor={"departureAirports"}>
        Depart From (choose up to 2, semicolon separated)
      </Label>

      <Input
        name="departureAirports"
        placeholder="DFW;DAL"
        type="text"
      />

      {maybeRenderErrorMessage(error, 'departureAirports')}

      <Label htmlFor="arrivalAirports">
        Arrive At (choose up to 2, semicolon separated)
      </Label>

      <Input
        name="arrivalAirports"
        placeholder="DFW;DAL"
        type="text"
      />

      {maybeRenderErrorMessage(error, 'arrivalAirports')}

      <Label htmlFor="datePairs">
        Date Pairs (up to 6) (pairs semicolon separated, depart return comma separated)
      </Label>

      <Input
        name="datePairs"
        placeholder="2022-11-01,2022-11-07;2022-11-10,2022-11-17"
        type="text"
      />

      {maybeRenderErrorMessage(error, 'datePairs')}

      <Label htmlFor="flexDate">
        Date Flexible?
      </Label>

      <Input
        name="flexDate"
        placeholder="1"
        type="number"
      />

      {maybeRenderErrorMessage(error, 'flexDate')}

      <Label htmlFor="numOfAdults">
        Number of Adults
      </Label>

      <Input
        name="numOfAdults"
        placeholder="Number of Adults"
        type="number"
      />

      {maybeRenderErrorMessage(error, 'numOfAdults')}

      <Label htmlFor="numOfChildren">
        Number of Children
      </Label>

      <Input
        name="numOfChildren"
        placeholder="Number of Children"
        type="number"
      />

      {maybeRenderErrorMessage(error, 'numOfChildren')}

      <button
        className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded mt-6"
        type="submit"
      >
        Search Flights
      </button>
    </form>
  );
};

export default CheapFlightsForm;
