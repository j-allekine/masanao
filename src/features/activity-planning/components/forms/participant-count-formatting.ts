const participantCountPattern = /^-?\d[\d,]*$/;

export type ParticipantCountSelection = {
  start: number;
  end: number;
};

export type ParticipantCountInputResult = {
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
};

function isGroupableParticipantCount(value: string) {
  return participantCountPattern.test(value);
}

function formatDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatParticipantCount(value: string) {
  if (!isGroupableParticipantCount(value)) return value;

  const sign = value.startsWith("-") ? "-" : "";
  const digits = value.slice(sign.length).replaceAll(",", "");

  return `${sign}${formatDigits(digits)}`;
}

export function normalizeParticipantCount(value: string) {
  return value.replaceAll(",", "");
}

function mapSelectionPosition(
  rawValue: string,
  formattedValue: string,
  position: number,
) {
  const clampedPosition = Math.max(0, Math.min(position, rawValue.length));
  const signLength = rawValue.startsWith("-") ? 1 : 0;

  if (clampedPosition <= signLength) return clampedPosition;

  const digitsBeforePosition = rawValue
    .slice(signLength, clampedPosition)
    .replaceAll(",", "").length;
  let formattedPosition = signLength;
  let digitsSeen = 0;

  while (
    formattedPosition < formattedValue.length &&
    digitsSeen < digitsBeforePosition
  ) {
    if (formattedValue[formattedPosition] !== ",") digitsSeen += 1;
    formattedPosition += 1;
  }

  return formattedPosition;
}

export function formatParticipantCountInput(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null = selectionStart,
): ParticipantCountInputResult {
  const formattedValue = formatParticipantCount(value);

  if (formattedValue === value) {
    return { value, selectionStart, selectionEnd };
  }

  return {
    value: formattedValue,
    selectionStart:
      selectionStart === null
        ? null
        : mapSelectionPosition(value, formattedValue, selectionStart),
    selectionEnd:
      selectionEnd === null
        ? null
        : mapSelectionPosition(value, formattedValue, selectionEnd),
  };
}
