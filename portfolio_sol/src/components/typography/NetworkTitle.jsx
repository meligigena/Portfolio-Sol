import { DisplayHeading } from "./DisplayHeading";

export function NetworkTitle({
  as: Heading = "h2",
  children,
  className = "",
  text,
  ...headingProps
}) {
  return (
    <DisplayHeading
      {...headingProps}
      as={Heading}
      className={["network-title", className].filter(Boolean).join(" ")}
      text={text}
    >
      {children}
    </DisplayHeading>
  );
}
