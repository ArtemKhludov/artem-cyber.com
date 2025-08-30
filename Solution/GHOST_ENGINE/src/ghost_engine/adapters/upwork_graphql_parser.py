"""
Defensive normalization of Upwork GraphQL JSON job shapes (sniffed HTTP/WS payloads).

Extracts stable fields for scoring / storage without KeyError. Unknown API branches
return None for the corresponding key; callers run OPSEC/sanitization downstream.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Mapping

from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Canonical record emitted by this module (always all keys present).
UpworkJobRecord = dict[str, Any]

_JOB_KEYS: tuple[str, ...] = (
    "id",
    "title",
    "description",
    "budget",
    "hourly_rate",
    "engagement_type",
    "country",
    "is_verified",
    "total_spent",
    "client_total_hires",
    "client_jobs_posted",
    "client_avg_rating",
    "client_total_reviews",
    "total_applicants",
)


def _blank_record() -> UpworkJobRecord:
    return {k: None for k in _JOB_KEYS}


@lru_cache(maxsize=1)
def _extra_graphql_list_roots() -> tuple[str, ...]:
    """Optional ``data.<alias>`` list roots from ``config/base.yaml`` → ``upwork_graphql_parse.extra_data_roots``."""
    try:
        from ghost_engine.config.settings import get_settings

        u = get_settings().base_config.get("upwork_graphql_parse")
        if not isinstance(u, dict):
            return ()
        raw = u.get("extra_data_roots")
        if not isinstance(raw, list):
            return ()
        return tuple(str(x).strip() for x in raw if isinstance(x, str) and str(x).strip())
    except Exception:
        return ()


def _is_mapping(obj: Any) -> bool:
    return isinstance(obj, Mapping)


def _dig(obj: Any, *keys: str) -> Any:
    cur: Any = obj
    for key in keys:
        if not _is_mapping(cur):
            return None
        cur = cur.get(key)
    return cur


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    return None


def _first_bool(*candidates: Any) -> bool | None:
    for c in candidates:
        b = _coerce_bool(c)
        if b is not None:
            return b
    return None


def _posted_at_from_job_node(node: Mapping[str, Any], *, _depth: int = 0) -> str | None:
    """Best-effort ISO-ish timestamp string for listing/search cards (L0 max_job_age_hours)."""
    if _depth > 4:
        return None
    for key in (
        "postedOn",
        "publishTime",
        "publishedOn",
        "createdOn",
        "postedDateTime",
        "publishDateTime",
        "createdDateTime",
        "publishedTime",
    ):
        v = node.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    opening = node.get("opening")
    if _is_mapping(opening):
        inner = _posted_at_from_job_node(opening, _depth=_depth + 1)
        if inner:
            return inner
    info = node.get("info")
    if _is_mapping(info):
        co = info.get("createdOn")
        if isinstance(co, str) and co.strip():
            return co.strip()
    fj = node.get("firstJobPostOpening") or node.get("firstJobPost")
    if _is_mapping(fj):
        inner = _posted_at_from_job_node(fj, _depth=_depth + 1)
        if inner:
            return inner
    return None


def _job_identity(node: Mapping[str, Any]) -> str | None:
    raw_id = node.get("id")
    if raw_id is not None and raw_id != "":
        return str(raw_id)
    cipher = node.get("ciphertext") or node.get("ciphertext_id") or node.get("job_ciphertext")
    if isinstance(cipher, str) and cipher.strip():
        return cipher.strip()
    return None


def _clear_degenerate_hourly_for_fixed(rec: UpworkJobRecord) -> None:
    """Upwork often sends hourlyBudget 0–0 on FIXED listings; strip so downstream logic does not treat it as hourly."""
    et = rec.get("engagement_type")
    if not isinstance(et, str) or et.strip().upper() != "FIXED":
        return
    hr = rec.get("hourly_rate")
    if not isinstance(hr, str):
        return
    s = hr.strip().replace(" ", "")
    if s in ("0", "0-0", "0.0", "0.0-0.0", "0-0.0", "0.0-0"):
        rec["hourly_rate"] = None


def _format_hourly_range(min_v: Any, max_v: Any) -> str | None:
    lo = _coerce_float(min_v)
    hi = _coerce_float(max_v)
    if lo is None and hi is None:
        return None
    if lo is not None and hi is not None:
        if lo == hi:
            return f"{lo:g}"
        return f"{lo:g}-{hi:g}"
    if lo is not None:
        return f"{lo:g}+"
    return f"up_to_{hi:g}"


def _country_from_buyer(buyer: Mapping[str, Any] | None) -> str | None:
    if not buyer:
        return None
    loc = buyer.get("location")
    if not _is_mapping(loc):
        return None
    c = loc.get("country")
    if isinstance(c, str) and c.strip():
        return c.strip()
    if _is_mapping(c):
        name = c.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
        code = c.get("code")
        if isinstance(code, str) and code.strip():
            return code.strip()
    return None


def _total_spent_from_buyer(buyer: Mapping[str, Any] | None) -> float | None:
    if not buyer:
        return None
    stats = buyer.get("stats")
    if _is_mapping(stats):
        v = _coerce_float(stats.get("totalCharges"))
        if v is not None:
            return v
    ts = buyer.get("totalSpent")
    if _is_mapping(ts):
        for key in ("rawValue", "displayValue"):
            v = _coerce_float(ts.get(key))
            if v is not None:
                return v
    return _coerce_float(buyer.get("totalSpent"))


def _listing_client_has_trust_signals(cl: Mapping[str, Any] | None) -> bool:
    """Per-job card client block with spend or verified payment (prefer over sparse global buyer)."""
    if not _is_mapping(cl):
        return False
    spent = _total_spent_from_buyer(cl)
    if spent is not None and spent > 0.0:
        return True
    pvs = cl.get("paymentVerificationStatus")
    if pvs is True:
        return True
    if isinstance(pvs, (int, float)) and int(pvs) == 1:
        return True
    return False


def _is_verified_from_buyer(buyer: Mapping[str, Any] | None) -> bool | None:
    if not buyer:
        return None
    pvs = buyer.get("paymentVerificationStatus")
    if pvs is True:
        return True
    if isinstance(pvs, (int, float)) and int(pvs) == 1:
        return True
    return _first_bool(
        buyer.get("isPaymentMethodVerified"),
        buyer.get("paymentVerified"),
        buyer.get("identityVerified"),
        _dig(buyer, "company", "isVerified"),
        _dig(buyer, "company", "profile", "isVerified"),
    )


def normalize_opening_job(
    opening: Mapping[str, Any],
    buyer: Mapping[str, Any] | None,
) -> UpworkJobRecord:
    """Map jobPubDetails.opening (+ optional buyer) to canonical keys."""
    rec = _blank_record()
    info = opening.get("info")
    info_d: Mapping[str, Any] = info if _is_mapping(info) else {}

    rec["id"] = _job_identity(info_d) or _job_identity(opening)
    rec["title"] = info_d.get("title") if isinstance(info_d.get("title"), str) else None
    desc = opening.get("description")
    rec["description"] = desc if isinstance(desc, str) else None

    job_type = info_d.get("type")
    if isinstance(job_type, str) and job_type.strip():
        rec["engagement_type"] = job_type.strip().upper()

    budget_obj = opening.get("budget")
    if _is_mapping(budget_obj):
        rec["budget"] = _coerce_float(budget_obj.get("amount"))

    ext = opening.get("extendedBudgetInfo")
    if _is_mapping(ext):
        rec["hourly_rate"] = _format_hourly_range(
            ext.get("hourlyBudgetMin"),
            ext.get("hourlyBudgetMax"),
        )
    if rec["hourly_rate"] is None and job_type == "HOURLY":
        rec["hourly_rate"] = _format_hourly_range(
            opening.get("hourlyBudgetMin"),
            opening.get("hourlyBudgetMax"),
        )
    if rec["hourly_rate"] is None and job_type == "HOURLY":
        ob = opening.get("hourlyBudget")
        if _is_mapping(ob):
            rec["hourly_rate"] = _format_hourly_range(ob.get("min"), ob.get("max"))

    rec["country"] = _country_from_buyer(buyer)
    rec["is_verified"] = _is_verified_from_buyer(buyer)
    rec["total_spent"] = _total_spent_from_buyer(buyer)
    pa = _posted_at_from_job_node(opening)
    if pa:
        rec["posted_at"] = pa
    _clear_degenerate_hourly_for_fixed(rec)
    return rec


def normalize_listing_card(
    node: Mapping[str, Any],
    buyer: Mapping[str, Any] | None,
) -> UpworkJobRecord:
    """Map a job-like dict (e.g. similarJobs item) to canonical keys."""
    rec = _blank_record()
    rec["id"] = _job_identity(node)
    t = node.get("title")
    rec["title"] = t if isinstance(t, str) else None
    d = node.get("description")
    rec["description"] = d if isinstance(d, str) else None

    amount = _dig(node, "amount", "amount")
    rec["budget"] = _coerce_float(amount)
    max_amt = node.get("maxAmount")
    if rec["budget"] is None:
        rec["budget"] = _coerce_float(max_amt)

    # Feed/search cards often use nested hourlyBudget.{min,max}; legacy uses top-level hourlyBudgetMin/Max.
    h_min = node.get("hourlyBudgetMin")
    h_max = node.get("hourlyBudgetMax")
    hb = node.get("hourlyBudget")
    if _is_mapping(hb):
        if h_min is None:
            h_min = hb.get("min")
        if h_max is None:
            h_max = hb.get("max")
    rec["hourly_rate"] = _format_hourly_range(h_min, h_max)

    jt = node.get("type")
    if isinstance(jt, str) and jt.strip():
        rec["engagement_type"] = jt.strip().upper()

    cl = node.get("client") if _is_mapping(node.get("client")) else None
    if _listing_client_has_trust_signals(cl):
        ctx = cl
    elif buyer is not None:
        ctx = buyer
    elif cl is not None:
        ctx = cl
    else:
        ctx = None
    rec["country"] = _country_from_buyer(ctx)
    rec["is_verified"] = _is_verified_from_buyer(ctx)
    rec["total_spent"] = _total_spent_from_buyer(ctx)
    if _is_mapping(ctx):
        rec["client_total_hires"] = _coerce_non_negative_int(ctx.get("totalHires"))
        rec["client_jobs_posted"] = _coerce_non_negative_int(ctx.get("totalPostedJobs"))
        rec["client_avg_rating"] = _coerce_float(ctx.get("totalFeedback"))
        rec["client_total_reviews"] = _coerce_non_negative_int(ctx.get("totalReviews"))
    rec["total_applicants"] = _coerce_non_negative_int(node.get("totalApplicants"))
    pa = _posted_at_from_job_node(node)
    if pa:
        rec["posted_at"] = pa
    _clear_degenerate_hourly_for_fixed(rec)
    return rec


def parse_upwork_graphql_payload(payload: Any) -> list[UpworkJobRecord]:
    """
    Parse top-level GraphQL JSON body: return zero or more canonical job dicts.

    Supports shapes seen in sniffed traffic:
    - data.jobPubDetails.opening (+ buyer context for similarJobs)
    - data.jobAuthDetails.opening.job (authenticated job page / RJP; buyer sibling)
    - data.jobPubDetails.similarJobs
    - data.similarJobs (standalone list)
    """
    if not _is_mapping(payload):
        return []
    data = payload.get("data")
    if not _is_mapping(data):
        return []

    out: list[UpworkJobRecord] = []
    buyer_ctx: Mapping[str, Any] | None = None

    jpd = data.get("jobPubDetails")
    if _is_mapping(jpd):
        buyer_raw = jpd.get("buyer")
        buyer_ctx = buyer_raw if _is_mapping(buyer_raw) else None

        opening = jpd.get("opening")
        if _is_mapping(opening):
            out.append(normalize_opening_job(opening, buyer_ctx))

        sim = jpd.get("similarJobs")
        if isinstance(sim, list):
            for item in sim:
                if _is_mapping(item):
                    out.append(normalize_listing_card(item, buyer_ctx))

    jad = data.get("jobAuthDetails")
    if _is_mapping(jad):
        buyer_jad = jad.get("buyer")
        buyer_j = buyer_jad if _is_mapping(buyer_jad) else None
        op_j = jad.get("opening")
        if _is_mapping(op_j):
            job_inner = op_j.get("job")
            if _is_mapping(job_inner):
                out.append(normalize_opening_job(job_inner, buyer_j))
            else:
                out.append(normalize_opening_job(op_j, buyer_j))

    sim_top = data.get("similarJobs")
    if isinstance(sim_top, list):
        for item in sim_top:
            if _is_mapping(item):
                out.append(normalize_listing_card(item, None))

    # --- NEW: Support for generic Search results (all search aliases) ---
    search = data.get("jobSearch") or data.get("jobSearchResults") or data.get("jobsSearch")
    if _is_mapping(search):
        edges = search.get("edges")
        if isinstance(edges, list):
            for edge in edges:
                node = edge.get("node") if _is_mapping(edge) else None
                if _is_mapping(node):
                    out.append(normalize_listing_card(node, None))

    # Saved-search / feed snapshot (find-work often uses alias userSavedSearches).
    uss = data.get("userSavedSearches")
    if _is_mapping(uss):
        for key in ("results", "savedSearches", "items"):
            chunk = uss.get(key)
            if isinstance(chunk, list):
                for item in chunk:
                    if _is_mapping(item):
                        out.append(normalize_listing_card(item, None))
                break

    psj = data.get("getPersonSavedJobs")
    if _is_mapping(psj):
        inner = psj.get("personSavedJobs")
        if isinstance(inner, list):
            for item in inner:
                if _is_mapping(item):
                    out.append(normalize_listing_card(item, None))

    for root_key in _extra_graphql_list_roots():
        chunk = data.get(root_key)
        if isinstance(chunk, list):
            for item in chunk:
                if _is_mapping(item):
                    out.append(normalize_listing_card(item, buyer_ctx))

    # --- LAST RESORT: Scan ANY key for a list of job-like objects ---
    if not out:
        for k, v in data.items():
            if isinstance(v, list) and v:
                first = v[0]
                if _is_mapping(first) and (first.get("title") or first.get("ciphertext")):
                    for item in v:
                        if _is_mapping(item):
                            out.append(normalize_listing_card(item, None))

    result = _dedupe_records(out)
    if not result and data:
        keys = sorted(str(k) for k in data.keys() if k is not None)
        log.debug(
            "upwork_graphql.parse_empty_nonempty_data",
            data_keys=keys[:64],
            data_key_count=len(keys),
        )
    return result


def _dedupe_records(records: list[UpworkJobRecord]) -> list[UpworkJobRecord]:
    seen: set[str] = set()
    unique: list[UpworkJobRecord] = []
    for rec in records:
        key = rec.get("id") or ""
        if isinstance(key, str) and key:
            if key in seen:
                continue
            seen.add(key)
        unique.append(rec)
    return unique


def posted_at_from_upwork_node(node: Mapping[str, Any]) -> str | None:
    """Public wrapper for scoring/normalizer (listing cards, saved search nodes)."""
    return _posted_at_from_job_node(node)


def canonical_keys() -> tuple[str, ...]:
    """Stable key order for schemas / CSV headers."""
    return _JOB_KEYS


def _coerce_non_negative_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return max(0, value)
    if isinstance(value, float):
        if value != value:  # NaN
            return None
        return max(0, int(value))
    if isinstance(value, str):
        try:
            return max(0, int(value.strip()))
        except ValueError:
            return None
    return None


def try_parse_chat_messages(payload: Any) -> list[dict[str, Any]]:
    """
    Extract chat messages from Upwork GraphQL JSON (HTTP response body).
    Returns list of dicts: {'thread_id', 'sender_name', 'text', 'timestamp'}.

    Paths cover:
    - data.messageThread.messages
    - data.viewer.messageThreads.edges.node.lastMessage
    """
    if not _is_mapping(payload):
        return []
    data = payload.get("data")
    if not _is_mapping(data):
        return []

    messages: list[dict[str, Any]] = []

    # 1. Single thread view (messages list)
    thread = data.get("messageThread")
    if _is_mapping(thread):
        tid = thread.get("id")
        msgs = thread.get("messages")
        if isinstance(msgs, list):
            for m in msgs:
                if _is_mapping(m):
                    sender = _dig(m, "sender", "name") or _dig(m, "sender", "displayName")
                    text = m.get("body") or m.get("text")
                    ts = m.get("createdTime") or m.get("timestamp")
                    if tid and text:
                        messages.append({
                            "thread_id": str(tid),
                            "sender_name": str(sender or "Unknown"),
                            "text": str(text),
                            "timestamp": ts
                        })

    # 2. Threads list (last messages)
    viewer = data.get("viewer")
    if _is_mapping(viewer):
        threads_obj = viewer.get("messageThreads")
        if _is_mapping(threads_obj):
            edges = threads_obj.get("edges")
            if isinstance(edges, list):
                for edge in edges:
                    node = _dig(edge, "node")
                    if _is_mapping(node):
                        tid = node.get("id")
                        last = node.get("lastMessage")
                        if _is_mapping(last):
                            sender = _dig(last, "sender", "name")
                            text = last.get("body") or last.get("text")
                            ts = last.get("createdTime")
                            if tid and text:
                                messages.append({
                                    "thread_id": str(tid),
                                    "sender_name": str(sender or "Unknown"),
                                    "text": str(text),
                                    "timestamp": ts
                                })

    return messages


def try_parse_inbox_unread_count(payload: Any) -> int | None:
    """
    Best-effort unread thread/message count from Upwork GraphQL JSON (HTTP response body).

    Paths are conservative; unknown shapes return ``None``. **DOM badge**
    (``nav_messages_button``) remains fallback — see ``UpworkAdapter.check_new_messages``.
    """
    if not _is_mapping(payload):
        return None
    data = payload.get("data")
    if not _is_mapping(data):
        return None

    candidates: list[int] = []

    viewer = data.get("viewer")
    if _is_mapping(viewer):
        inbox = viewer.get("inbox")
        if _is_mapping(inbox):
            for key in ("unreadCount", "unreadThreadCount", "totalUnread"):
                n = _coerce_non_negative_int(inbox.get(key))
                if n is not None:
                    candidates.append(n)
        threads = viewer.get("messageThreads")
        if _is_mapping(threads):
            n = _coerce_non_negative_int(threads.get("unreadCount"))
            if n is not None:
                candidates.append(n)
        for key in ("unreadMessageCount", "unreadThreadCount"):
            n = _coerce_non_negative_int(viewer.get(key))
            if n is not None:
                candidates.append(n)

    notifications = data.get("notifications")
    if _is_mapping(notifications):
        for key in ("unreadCount", "totalUnread"):
            n = _coerce_non_negative_int(notifications.get(key))
            if n is not None:
                candidates.append(n)

    if not candidates:
        return None
    return max(candidates)


def index_posted_at_by_core_from_graphql_snippets(
    snippets: Any,
) -> dict[str, str]:
    """
    Merge job ciphertext core -> ``posted_at`` ISO string from recent sniffed GraphQL bodies.

    Used by feed driver temporal cutoff; best-effort when cards lack dates in the deque.
    """
    out: dict[str, str] = {}
    if snippets is None:
        return out
    try:
        it = list(snippets)
    except TypeError:
        return out
    for payload in it:
        if not _is_mapping(payload):
            continue
        for rec in parse_upwork_graphql_payload(payload):
            rid = rec.get("id")
            pa = rec.get("posted_at")
            if not isinstance(rid, str) or not rid.strip():
                continue
            if not isinstance(pa, str) or not pa.strip():
                continue
            core = rid.strip().lstrip("~")
            if core:
                out[core] = pa.strip()
    return out
