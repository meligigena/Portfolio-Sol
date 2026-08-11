import {
  normalizeDisplayHeadingText,
  repairDisplayHeadingText,
} from "./displayHeadingText";

export function DisplayHeading({
  as: Heading = "h2",
  children,
  text,
  ...headingProps
}) {
  const visualText = normalizeDisplayHeadingText(text);
  const accessibleLabel =
    headingProps["aria-label"] ?? repairDisplayHeadingText(text);
  const renderedTitle =
    typeof children === "function" ? children(visualText) : visualText;

  return (
    <Heading {...headingProps} aria-label={accessibleLabel}>
      {renderedTitle}
    </Heading>
  );
}
