import fs from 'fs';

const newStrings = JSON.parse(fs.readFileSync('/Users/taomonlae/Downloads/mrlc-lms/scratch/new_strings.json', 'utf8'));

function shouldExclude(str) {
  // Exclude strings that look like identifiers/calls/types
  if (/^[a-zA-Z0-9_]+$/.test(str)) {
    // Single words that look like camelCase or variables
    if (/[a-z][A-Z]/.test(str)) return true;
    // Common code/developer words or IDs
    if (['apiGet', 'apiSend', 'setStatus', 'statusCode', 'mfa', 'totp', 'lq', 'lms', 'mrlc', 'id', 'en', 'my', 'mnw', 'th', 'km', 'fr', 'es', 'ar', 'xp'].includes(str.toLowerCase())) return true;
    // Technical framework names
    if (['vite', 'prisma', 'postgres', 'postgresql', 'playwright', 'github', 'github', 'wordpos', 'mondictdb', 'gutendex'].includes(str.toLowerCase())) return true;
  }

  // Exclude empty or single/double character strings
  if (str.trim().length <= 2) return true;

  // Exclude strings that contain code symbols or look like code expressions
  if (str.includes('(') && str.includes(')') && (str.includes('await') || str.includes('api') || str.includes('set') || str.includes('get') || str.includes('load'))) return true;
  if (str.includes('${') && str.includes('}') && !str.includes(' ')) return true; // Only variable expression like ${mission.rewardXp}

  return false;
}

const cleaned = newStrings.filter(str => !shouldExclude(str));
console.log(`Cleaned new strings count: ${cleaned.length} (excluded ${newStrings.length - cleaned.length} strings)`);

fs.writeFileSync('/Users/taomonlae/Downloads/mrlc-lms/scratch/cleaned_new_strings.json', JSON.stringify(cleaned, null, 2), 'utf8');
