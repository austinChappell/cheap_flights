import { FC } from "react";

interface Props {
  children: string;
  htmlFor: string;
}

const Label: FC<Props> = ({
  children,
  htmlFor,
}) => {
  return (
    <label className="block text-gray-700 text-sm font-bold mb-2 mt-4" htmlFor={htmlFor}>
      {children}
    </label>
  );
};

export default Label;
