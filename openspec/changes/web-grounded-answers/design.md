## Architecture and reuse

The existing Node sidecar owns a short tool loop before its final SSE request. DeepSeek selects `web_search`, `read_page` or `finish_research` using native function calls with `reasoning_effort=none`. There are at most two planning rounds and four executed tools. The final request cannot call more tools. Existing answer streaming and cancellation remain in use.

The managed adapter sends the user's typed question separately as `research_question` for explainers and branches, never for document rewriting. Research planning receives only that field (up to 16384 characters), without parent/document messages. Round one permits search or finish; round two permits source-ID reads or finish. Both advertised tools and executor enforce this split. Final synthesis receives the original document context plus evidence, with no tools enabled. Missing/empty question metadata preserves the legacy answer-only path. Ambiguous follow-ups therefore cannot infer a search subject from private documents; the user must name the subject in the question.

`web_search` calls the fixed `searxng.vane.svc.cluster.local:8080/search` JSON endpoint, returning bounded titles, snippets, dates and URLs. `read_page` takes a source ID from those results, never an arbitrary model-supplied URL. Source IDs map to server-observed URLs; the server appends Markdown reference links and a source list. Search/read errors are safe tool results, and lack of retrieved evidence produces an explicit notice rather than an unmarked claim of current knowledge.

Local GitHub references inspected: Vane, SearXNG and Searcharvester. Existing SearXNG already supplies the retrieval API; deploying another research stack would duplicate it. Vane `/api/search` adds an answering model and has a known hanging-task failure mode. The bounded sidecar loop reuses the current Spark-only key instead.

Do not apply a publication-date filter to search: the live candidate's month filter hid the maintained official releases page and returned recent but irrelevant pages. Keep current-date context and use targeted query terms. Final synthesis explicitly ends research and answers or states an evidence gap, rather than promising another search.

## Network and trust boundaries

Only the configured internal search service is called with search arguments. Page GETs accept HTTP/HTTPS on default ports, reject credentials and special-use addresses, resolve only public IPv4 and pin the selected address in the actual connection. Validate every redirect, cap redirects, response size and duration, and send no user cookies, authorization or model key. Deny Azure's platform address as well as private, link-local, loopback, CGNAT, multicast and reserved ranges. NetworkPolicy allows SearXNG and public ports80/443 with matching exclusions.

Tool content is untrusted data. The planning/answer policy forbids following source instructions, sending document contents or secrets in search queries, and inventing citations. Only source IDs returned by search can be opened. HTML is converted to bounded plain text without executing scripts or loading subresources. The extractor is deliberately lightweight; unsupported content types and oversized pages produce a visible evidence gap.

Independent review found that a prompt-only restriction would allow an untrusted snippet to influence a second search containing private document text. The explicit question boundary and enforced one-way search-to-read transition remove that path mechanically. Unknown citation markers never create links and produce a verification notice.

## Failure, compatibility and rollback

All model calls retain the fixed model, secret and no-fallback policy. Research uses a bounded deadline within the existing overall request deadline. Client disconnect aborts model and tool requests. If no tools are needed, stream the normal answer. If research fails, disclose that current information was not verified. Read-only health endpoints remain local. Update both ConfigMap files and its rollout checksum atomically. Revert sidecar and egress policy together to roll back.

## Verification

RED/GREEN integration: a current-facts request must call search, read a discovered source, pass tool evidence back to Spark and emit source links. Check no-tool behavior, tool failures/limits, malicious source instructions, invalid arguments and malformed planner responses. Test public URL normalization, private/mixed DNS, pinned lookup, redirect-to-private, content/size caps and cancellation against local HTTP fixtures. Run existing managed tests, types, purity, build, Helm lint/render/server dry-run and independent security review. Live acceptance: ask a current release question through the mTLS site, inspect its cited primary source, check ordinary document generation still works, verify target readiness and CI.

## Least Confident Decisions

- Two planning rounds should cover one search and one page-reading round. If evidence is insufficient, disclose it; do not silently raise the budget.
- Public IPv4-only reading matches the cluster egress. IPv6-only sites are unsupported rather than bypassing address checks.
- Lightweight text extraction can include navigation or omit complex page content. Return bounded evidence and avoid claiming exhaustive reading.
