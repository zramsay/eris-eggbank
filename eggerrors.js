/**
 * Error definitions.
 */

exports.NO_ERROR = 0;
exports.RESOURCE_NOT_FOUND = 1001;
exports.RESOURCE_ALREADY_EXISTS = 1002;
exports.ACCESS_DENIED = 2000;
exports.ARRAY_INDEX_OUT_OF_BOUNDS = 3100;

var errors = {};
errors[this.NO_ERROR] = "Successfully";
errors[this.RESOURCE_NOT_FOUND] = "Resource not found";
errors[this.RESOURCE_ALREADY_EXISTS] = "Resource already exists";
errors[this.ACCESS_DENIED] = "Access denied";
errors[this.ARRAY_INDEX_OUT_OF_BOUNDS] = "Index out of bounds";

/**
 * Get error message by error ID.
 * @param {Number} errCode - The code of the error.
 * @returns {string} - The error details.
 */
exports.getErrorMsg = function (errCode) {
    try  {
        return errors[errCode];
    } catch (e) {
        return "Undefined error code (" + errCode + ").";
    }
}



