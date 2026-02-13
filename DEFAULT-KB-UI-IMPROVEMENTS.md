# Default Knowledge Base UI Improvements

## Overview
Enhanced the Manager UI to make the "default" knowledge base more prominent and user-friendly.

## Changes Made

### 1. Search Dropdown - Title Case Display
**Location:** Search tab > Knowledge Base dropdown

**Before:**
```html
<option value="{{name}}">{{name}}</option>
```

**After:**
```html
<option value="{{name}}">{{displayName name}}</option>
```

**Result:** "default" now displays as "Default" in the search dropdown, matching the visual style used elsewhere in the UI.

### 2. Upload Dropdown - Auto-Select Default
**Location:** Upload Documents tab > Select Knowledge Base dropdown

**Before:**
```html
<option value="{{name}}">{{displayName name}}</option>
```

**After:**
```html
<option value="{{name}}" {{#if (eq name "default")}}selected{{/if}}>{{displayName name}}</option>
```

**Result:** The "default" knowledge base is now pre-selected when users visit the Upload Documents tab, making it faster to upload files without manual selection.

## User Experience Impact

### Before
1. User navigates to Upload Documents
2. Must manually select a knowledge base from dropdown
3. "default" appears lowercase in search dropdown

### After
1. User navigates to Upload Documents
2. "Default" is already selected - can immediately drag/drop files
3. "Default" appears in Title case everywhere for consistency

## Technical Details

**displayName Helper Function:**
```javascript
function displayName(name) {
    return name
        .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
```

This helper:
- Converts hyphens/underscores to spaces
- Capitalizes first letter of each word
- Lowercases remaining letters
- Example: "default" → "Default", "my-docs" → "My Docs"

**Handlebars Conditional:**
```handlebars
{{#if (eq name "default")}}selected{{/if}}
```

This uses Handlebars' built-in `eq` helper to check if the current knowledge base name equals "default" and adds the `selected` attribute if true.

## Consistency

The changes ensure consistency across the UI:
- ✅ Manage tab: Already used `{{displayName name}}` for KB names
- ✅ Search dropdown: Now uses `{{displayName name}}`
- ✅ Upload dropdown: Now uses `{{displayName name}}` + auto-selects "default"

## Files Modified

- `src/ui/manager/templates/index.hbs` - Template file with both changes
- `dist/ui/manager/templates/index.hbs` - Compiled template (auto-generated)
