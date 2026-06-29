/**
 * Compiles template strings by replacing double curly braces placeholders (e.g. {{user.name}} or {{jobTitle}})
 * with actual values from the data context object.
 * 
 * @param {string} templateStr - The template template string
 * @param {Object} data - Context data containing keys for placeholders
 * @returns {string} The compiled string
 */
export function compile(templateStr, data = {}) {
  if (!templateStr) return '';
  
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}/g, (match, path) => {
    const value = path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : null;
    }, data);

    return value !== null && value !== undefined ? String(value) : '';
  });
}

export default { compile };
