export const isBranchOpen = (operatingHoursStr?: string): boolean => {
  if (!operatingHoursStr) return true;
  const parts = operatingHoursStr.split('-');
  if (parts.length !== 2) return true;
  const startStr = parts[0].trim();
  const endStr = parts[1].trim();

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTimeToMinutes = (timeStr: string) => {
    const timeParts = timeStr.split(':');
    if (timeParts.length < 2) return 0;
    return parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
  };

  const startMinutes = parseTimeToMinutes(startStr);
  const endMinutes = parseTimeToMinutes(endStr);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Over midnight case (e.g. 18:00 - 02:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
};
