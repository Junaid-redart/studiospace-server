export const validateStudio = (data: unknown): string[] => {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["Invalid studio data"];
  }

  const studio = data as Record<string, unknown>;

  // Required text fields
  const requiredFields = [
    "title",
    "category",
    "location",
    "imageUrl",
    "overview",
  ];

  for (const field of requiredFields) {
    if (
      typeof studio[field] !== "string" ||
      (studio[field] as string).trim() === ""
    ) {
      errors.push(`${field} is required`);
    }
  }

  // Hourly rate
  if (
    typeof studio.hourlyRate !== "number" ||
    !Number.isFinite(studio.hourlyRate) ||
    studio.hourlyRate <= 0
  ) {
    errors.push("Hourly rate must be greater than 0");
  }

  // Security deposit
  if (
    typeof studio.securityDeposit !== "number" ||
    !Number.isFinite(studio.securityDeposit) ||
    studio.securityDeposit < 0
  ) {
    errors.push("Security deposit cannot be negative");
  }

  // Maximum capacity
  if (
    typeof studio.maxCapacity !== "number" ||
    !Number.isInteger(studio.maxCapacity) ||
    studio.maxCapacity < 1
  ) {
    errors.push("Maximum capacity must be a positive integer");
  }

  // Amenities
  if (
    !Array.isArray(studio.amenities) ||
    studio.amenities.some(
      (amenity) =>
        typeof amenity !== "string" || amenity.trim() === ""
    )
  ) {
    errors.push("Amenities must be an array of non-empty strings");
  }

  return errors;
};