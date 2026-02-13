#!/bin/bash

# Script to rename all "codebase" references to "knowledgebase"
# This is a comprehensive refactoring script

set -e

echo "🔄 Starting comprehensive codebase → knowledgebase rename..."

# Function to perform replacements in files
replace_in_files() {
    local pattern=$1
    local replacement=$2
    local file_pattern=$3
    
    echo "  Replacing '$pattern' with '$replacement' in $file_pattern files..."
    
    # Use find with -type f to only match files, exclude node_modules and dist
    find . -type f \( -name "$file_pattern" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/dist/*" \
        ! -path "*/.git/*" \
        -exec sed -i.bak "s/$pattern/$replacement/g" {} \; \
        -exec rm {}.bak \;
}

# 1. API Routes
echo "📡 Updating API routes..."
replace_in_files "/api/codebases" "/api/knowledgebases" "*.ts"
replace_in_files "/api/codebases" "/api/knowledgebases" "*.js"
replace_in_files "/api/codebases" "/api/knowledgebases" "*.hbs"
replace_in_files "/api/codebases" "/api/knowledgebases" "*.html"

# 2. Variable names - codebases (plural)
echo "📝 Updating variable names (plural)..."
replace_in_files "\\bcodebases\\b" "knowledgeBases" "*.ts"
replace_in_files "\\bcodebases\\b" "knowledgeBases" "*.js"
replace_in_files "{{codebases" "{{knowledgeBases" "*.hbs"

# 3. Variable names - codebase (singular)
echo "📝 Updating variable names (singular)..."
replace_in_files "\\bcodebase\\b" "knowledgeBase" "*.ts"
replace_in_files "\\bcodebase\\b" "knowledgeBase" "*.js"

# 4. Variable names - codebaseName
echo "📝 Updating codebaseName..."
replace_in_files "codebaseName" "knowledgeBaseName" "*.ts"
replace_in_files "codebaseName" "knowledgeBaseName" "*.js"
replace_in_files "codebaseName" "knowledgeBaseName" "*.json"
replace_in_files "codebaseName" "knowledgeBaseName" "*.md"

# 5. Variable names - CodebaseService
echo "📝 Updating service names..."
replace_in_files "codebaseService" "knowledgeBaseService" "*.ts"
replace_in_files "codebaseService" "knowledgeBaseService" "*.js"

# 6. Table name prefix
echo "🗄️  Updating table prefixes..."
replace_in_files "codebase_" "knowledgebase_" "*.ts"

# 7. Configuration paths
echo "⚙️  Updating configuration paths..."
replace_in_files "\\.codebase-memory" ".knowledge-base" "*.json"
replace_in_files "\\.codebase-memory" ".knowledge-base" "*.ts"
replace_in_files "\\.codebase-memory" ".knowledge-base" "*.md"
replace_in_files "~/\\.codebase-memory" "~/.knowledge-base" "*.json"

# 8. UI Text - "Codebase" to "Knowledge Base"
echo "🎨 Updating UI text..."
replace_in_files "Codebase Memory" "Knowledge Base" "*.html"
replace_in_files "Codebase Memory" "Knowledge Base" "*.hbs"
replace_in_files "Codebase Manager" "Knowledge Base Manager" "*.html"
replace_in_files "Codebase Manager" "Knowledge Base Manager" "*.hbs"
replace_in_files "Codebase Manager" "Knowledge Base Manager" "*.js"

# 9. localStorage keys
echo "💾 Updating localStorage keys..."
replace_in_files "codebase-theme" "knowledgebase-theme" "*.js"
replace_in_files "codebase-memory-test" "knowledge-base-test" "*.ts"

# 10. Comments and documentation
echo "📚 Updating comments..."
replace_in_files "codebase tables" "knowledge base tables" "*.ts"
replace_in_files "indexed codebases" "indexed knowledge bases" "*.md"
replace_in_files "indexed codebases" "indexed knowledge bases" "*.ts"

# 11. Function names
echo "🔧 Updating function names..."
replace_in_files "list_codebases" "list_knowledgebases" "*.md"
replace_in_files "search_codebases" "search_knowledgebases" "*.md"
replace_in_files "get_codebase_stats" "get_knowledgebase_stats" "*.md"
replace_in_files "open_codebase_manager" "open_knowledgebase_manager" "*.md"

# 12. Route paths in templates
echo "🛣️  Updating route paths..."
replace_in_files "/codebase/" "/knowledgebase/" "*.hbs"
replace_in_files "/codebase/" "/knowledgebase/" "*.html"

# 13. Handlebars helpers
echo "🔨 Updating template variables..."
replace_in_files "selectedCodebase" "selectedKnowledgeBase" "*.hbs"
replace_in_files "selectedCodebase" "selectedKnowledgeBase" "*.js"
replace_in_files "uploadKnowledgeBase" "uploadKnowledgeBase" "*.hbs"

echo "✅ Rename complete!"
echo ""
echo "⚠️  Important: Review the changes and run tests:"
echo "   npm run build"
echo "   npm test"
echo ""
echo "📝 Files that may need manual review:"
echo "   - API client code that calls the old endpoints"
echo "   - Database migration scripts"
echo "   - External documentation"
