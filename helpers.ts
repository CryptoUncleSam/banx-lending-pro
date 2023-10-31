export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateFee(amount: number, aprPercent: number, days: number): number {
    // Convert the annual percentage rate (APR) to a daily rate
    const dailyRate = (aprPercent / 36500); // Assumes a 365-day year
    
    // Calculate the fee using the formula: amount * dailyRate * days
    const fee = amount * dailyRate * days;
    
    return fee;
}

export function daysSinceTimestamp(pastTimestamp: number): number {
    const now = new Date().getTime() / 1000; // Current timestamp in seconds
    const differenceInSeconds = now - pastTimestamp;
    const secondsInADay = 86400; // Number of seconds in a day (24 hours * 60 minutes * 60 seconds)
    const days = differenceInSeconds / secondsInADay;
  
    return days;
}

