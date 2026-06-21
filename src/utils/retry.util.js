/**
 * Retries an asynchronous function with exponential backoff.
 * @param {Function} fn - The asynchronous function to execute.
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5).
 * @param {number} baseDelayMs - Base delay in milliseconds (default: 1000).
 * @returns {Promise<any>} - The result of the function.
 */
const withExponentialBackoff = async (fn, maxRetries = 5, baseDelayMs = 1000) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      // Calculate delay: 1000ms, 2000ms, 4000ms, 8000ms, 16000ms (1s, 2s, 4s, 8s, 16s)
      // Math.pow(2, attempt - 1) * baseDelayMs
      const delay = Math.pow(2, attempt - 1) * baseDelayMs;
      console.warn(`[Retry Helper] Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  withExponentialBackoff,
};
