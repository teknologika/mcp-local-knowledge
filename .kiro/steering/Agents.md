---
inclusion: always
---


# AGENTS.md — Codebase Dedupe Protocol

## Goal
Prevent duplicate implementations and “wrong file” edits by making **codebase-search** the *only valid source* for claims about what already exists in this repo during this session.

This project has a strict rule: **you must not create new code, new files, or new implementations unless you have first searched the codebase using the MCP tool and compared against the results.**

## Tools you MUST use for codebase discovery
Use **codebase-search** tools for discovery and evidence:

- `list_codebases`
- `search_codebases`
- `get_chunk_content`
- `get_file_content`
- `get_codebase_stats`

After updates run `update_codebase_scan` to refresh the codebase search results.

These are the only approved discovery tools for “what exists already.” 

## Hard rule: No creation without a Dedupe Ticket
Before you do *any* of the following, you must produce a Dedupe Ticket and run the searches it specifies:

Creation triggers include: adding a new file, adding a new module/class/function, introducing a new utility/helper, duplicating a configuration pattern, or proposing a new “approach/framework” that sounds like it could already exist.

A **Dedupe Ticket** is a short structured note you write in your response (keep it compact):

**Dedupe Ticket**
- Intent signature: `<one sentence describing exactly what you are about to add/change>`
- Queries: `<2–4 searches you will run in search_codebases>`
- Top matches: `<up to 5 result identifiers or file paths returned by the tool>`
- Decision: `reuse | extend | new`
- Rationale: `<why reuse/extend is sufficient, or why new is justified>`

You must actually call `search_codebases` before finalizing the ticket. Do not guess.

## Execution protocol
When asked to implement or change code:

1) If the request implies any creation trigger, begin by calling `search_codebases` (and `list_codebases` if you have not yet selected the codebase in this session).
2) Review results and decide `reuse | extend | new`.
3) Only then propose edits, and prefer extending existing implementations over creating new ones.
4) After making significant edits run update_codebase_scan to re-index the codebase

## What you may not do
You may not claim “there is no existing implementation” or “this doesn’t exist” unless you have run `search_codebases` in this session and the results support that claim. “I didn’t see it” is not acceptable without a tool call.

You may not create “parallel” implementations alongside existing ones unless the Dedupe Ticket explicitly justifies why reuse/extension is not viable.

## Graceful degradation
If the MCP server is unavailable or returning errors:
State **DEGRADED MODE** at the top of your reply and stop before making changes. Ask for the MCP server to be enabled/fixed, or ask for explicit user approval to proceed best-effort without search. Do not proceed silently.

## Tool intent alignment
When you need to know what exists, where it is, or how similar code is structured, you must treat `search_codebases` as authoritative. Do not infer from local context alone.


### 4. Start Using in Your AI Assistant

Once configured, your AI assistant can use these tools:

- **list_codebases**: See all indexed codebases
- **search_codebases**: Search for code semantically
- **get_codebase_stats**: View detailed statistics
- **open_codebase_manager**: Launch and open the Manager UI in your browser



## General Rules
- Read `README.md` for project overview.
- create and use a `.scratchpad/` directory for temporary planning, complex task breakdowns, and tracking state.
- **Cleanup:** Delete or archive non-essential files in `.scratchpad/` upon task completion.

## Constraints
- Do not store permanent project documentation in `.scratchpad/`.
- Ensure no files in `.scratchpad/` are committed to git.

## Tools

You have a number of tools and MCP servers available.
 - When you are asked a question about a codebase use codebase_search before looking on local disk
 - DMA is the acronym for Datacom Migration Assistant

 - iif you are asked a question about a customer, company or similar use knowlege_searh first 
