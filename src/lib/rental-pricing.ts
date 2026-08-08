/** Convert provider USD cost to customer NGN for rentals */
export function rentalPriceNgnFromUsd(costUsd: number): number {
  const rate = Number(process.env.USD_TO_NGN_RATE || 1600);
  const markup = Number(process.env.RENTAL_MARKUP_PERCENTAGE || process.env.MARKUP_PERCENTAGE || 1.6);
  const fixed = Number(process.env.RENTAL_FIXED_NGN_MARKUP || process.env.FIXED_NGN_MARKUP || 500);
  return Math.ceil(costUsd * rate * markup + fixed);
}

/** Default monthly USD when provider does not expose a price on search */
export function defaultRentalUsd(countryCode: string): number {
  return countryCode.toUpperCase() === "US" ? 2.5 : 3.5;
}
