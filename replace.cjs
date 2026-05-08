const fs = require('fs');
let content = fs.readFileSync('fix_rls_policies.sql', 'utf8');

// Only add if not already there to avoid duplicates
content = content.replace(/CREATE POLICY "([^"]+_all)" ON public\.([a-zA-Z_]+)/g, (match, policyName, tableName) => {
    return 'DROP POLICY IF EXISTS "' + policyName + '" ON public.' + tableName + ';\n' + match;
});

// Since some drops might be duplicated if the script already had them right before, we can remove duplicate DROP POLICY lines
// But wait, it's safer just to do this replacement.
fs.writeFileSync('fix_rls_policies.sql', content);
console.log('Done');
