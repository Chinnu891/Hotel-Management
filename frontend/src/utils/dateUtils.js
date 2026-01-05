/**
 * Date utility functions to avoid timezone issues
 * These functions use local dates instead of UTC to prevent date shifts
 */

/**
 * Format a date to YYYY-MM-DD format using local timezone
 * @param {Date} date - The date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForAPI = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided to formatDateForAPI:', date);
        // Return today's date as fallback
        const today = new Date();
        return formatDateForAPI(today);
    }
    
    // Use local date instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a date to YYYY-MM-DD format for HTML date inputs
 * @param {Date} date - The date to format
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForInput = (date) => {
    return formatDateForAPI(date);
};

/**
 * Create a date from a string in YYYY-MM-DD format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object
 */
export const createDateFromString = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return null;
    }
    
    // Reset time to start of day to avoid timezone issues
    date.setHours(0, 0, 0, 0);
    return date;
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayString = () => {
    return formatDateForAPI(new Date());
};

/**
 * Get tomorrow's date in YYYY-MM-DD format
 * @returns {string} Tomorrow's date in YYYY-MM-DD format
 */
export const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateForAPI(tomorrow);
};

/**
 * Get day after tomorrow's date in YYYY-MM-DD format
 * @returns {string} Day after tomorrow's date in YYYY-MM-DD format
 */
export const getDayAfterTomorrowString = () => {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return formatDateForAPI(dayAfterTomorrow);
};

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if dates are the same day
 */
export const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return formatDateForAPI(date1) === formatDateForAPI(date2);
};

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export const addDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};
