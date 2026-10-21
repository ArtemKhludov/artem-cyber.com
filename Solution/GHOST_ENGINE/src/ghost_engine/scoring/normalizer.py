"""
Single funnel from raw GraphQL JSON to scoring-ready job dicts.

Use JobNormalizer(site_id=...) — site-specific parsers register here; do not read raw JSON ad hoc.
"""

from __future__ import annotations

import json
from typing import Any, Mapping

from ghost_engine.adapters.upwork_graphql_parser import (
    UpworkJobRecord,
    normalize_listing_card,
    normalize_opening_job,
    parse_upwork_graphql_payload,
    posted_at_from_upwork_node,
)
from ghost_engine.utils.logger import get_logger

log = get_logger(__name__)

# Parsers implemented today (Node 2+ adds more site_id keys).
_UPWORK_SITE_IDS: frozenset[str] = frozenset({"upwork"})

# Eight contract keys + client rating (buyer.stats.score).
NORMALIZED_JOB_KEYS: tuple[str, ...] = (
    "id",
    "title",
    "description",
    "budget",
    "hourly_rate",
    "country",
    "is_verified",
    "total_spent",
    "client_rating",
)


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
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


def _coerce_int(value: Any) -> int | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value == int(value) else None
    if isinstance(value, str):
        try:
            return int(value.strip())
        except ValueError:
            return None
    return None


def _hourly_range_max(hourly_rate: Any) -> float | None:
    """Parse max numeric rate from strings like '5-10', '10', '12+', 'up_to_50'."""
    if not isinstance(hourly_rate, str):
        return None
    s = hourly_rate.strip()
    if not s:
        return None
    if s.startswith("up_to_"):
        return _coerce_float(s[6:])
    if s.endswith("+"):
        return _coerce_float(s[:-1])
    if "-" in s:
        left, _, right = s.partition("-")
        hi = _coerce_float(right.strip())
        if hi is not None:
            return hi
        return _coerce_float(left.strip())
    return _coerce_float(s)


def _buyer_block(payload: Mapping[str, Any]) -> Mapping[str, Any] | None:
    jpd = _dig(payload, "data", "jobPubDetails")
    if _is_mapping(jpd):
        buyer = jpd.get("buyer")
        if _is_mapping(buyer):
            return buyer
    jad = _dig(payload, "data", "jobAuthDetails")
    if _is_mapping(jad):
        buyer = jad.get("buyer")
        if _is_mapping(buyer):
            return buyer
    return None


def _upwork_opening_node_for_gri(payload: Mapping[str, Any]) -> Mapping[str, Any] | None:
    """
    GRI helpers expect the rich job node (clientActivity, sandsData, …).

    Public job page uses ``jobPubDetails.opening``; authenticated RJP uses
    ``jobAuthDetails.opening.job`` (wrapper opening holds qualifications sibling).
    """
    pub_op = _dig(payload, "data", "jobPubDetails", "opening")
    if _is_mapping(pub_op):
        return pub_op
    jad_op = _dig(payload, "data", "jobAuthDetails", "opening")
    if not _is_mapping(jad_op):
        return None
    inner = jad_op.get("job")
    return inner if _is_mapping(inner) else jad_op


def _client_rating_from_buyer(buyer: Mapping[str, Any] | None) -> float | None:
    if not buyer:
        return None
    stats = buyer.get("stats")
    if not _is_mapping(stats):
        return None
    return _coerce_float(stats.get("score"))


def _apply_smart_budget(rec: UpworkJobRecord) -> None:
    """
    Fixed: keep parsed fixed amount. Hourly: use max hourly rate as numeric budget signal.
    If both appear, hourly max wins (Upwork API drift).

    Feed nodes often include a stub ``hourlyBudget`` (0–0) on FIXED posts; ignore when max is zero
    so we do not wipe a valid ``amount`` (see trash BUDGET_TOO_LOW / matrix on real fixed budgets).
    """
    max_h = _hourly_range_max(rec.get("hourly_rate"))
    if max_h is not None and max_h > 0.0:
        rec["budget"] = max_h


def _merge_title_description(rec: UpworkJobRecord, title: Any, description: Any) -> None:
    if rec.get("title") is None and isinstance(title, str) and title.strip():
        rec["title"] = title.strip()
    if rec.get("description") is None and isinstance(description, str) and description.strip():
        rec["description"] = description.strip()


def _fallback_records(payload: Mapping[str, Any]) -> list[UpworkJobRecord]:
    """Extra .get() chains when top-level GraphQL operation name/shape changes."""
    out: list[UpworkJobRecord] = []
    buyer = _buyer_block(payload)

    opening = _dig(payload, "data", "jobPubDetails", "opening")
    if _is_mapping(opening):
        out.append(normalize_opening_job(opening, buyer))
        return out

    jad = _dig(payload, "data", "jobAuthDetails")
    if _is_mapping(jad):
        jad_op = jad.get("opening")
        if _is_mapping(jad_op):
            job_inner = jad_op.get("job")
            bb = jad.get("buyer") if _is_mapping(jad.get("buyer")) else buyer
            if _is_mapping(job_inner):
                out.append(normalize_opening_job(job_inner, bb))
            else:
                out.append(normalize_opening_job(jad_op, bb))
            return out

    # Alternate nesting (defensive; paths may appear in future responses).
    for path in (
        ("data", "job", "opening"),
        ("data", "opening"),
        ("data", "jobOpening"),
    ):
        node = _dig(payload, *path)
        if _is_mapping(node):
            out.append(normalize_opening_job(node, buyer))
            return out

    data = payload.get("data")
    if not _is_mapping(data):
        return out

    for v in data.values():
        if isinstance(v, list) and v:
            first = v[0]
            if (
                _is_mapping(first)
                and isinstance(first.get("title"), str)
                and (
                    isinstance(first.get("description"), str)
                    or first.get("ciphertext") is not None
                )
            ):
                out.append(normalize_listing_card(first, buyer))
                break

    return out


def _rows_for_site(site_id: str, payload: Mapping[str, Any]) -> list[UpworkJobRecord]:
    """Dispatch to site-specific extractors; unknown sites return []."""
    sid = (site_id or "").strip().lower()
    if sid not in _UPWORK_SITE_IDS:
        log.debug("normalizer.no_parser_for_site", site_id=site_id)
        return []
    rows = parse_upwork_graphql_payload(payload)
    if not rows:
        rows = _fallback_records(payload)
    return rows


def _attach_client_rating(rows: list[UpworkJobRecord], rating: float | None) -> list[dict[str, Any]]:
    """Prefer per-row listing ``client_avg_rating`` over a single batch ``buyer.stats.score``."""
    merged: list[dict[str, Any]] = []
    for rec in rows:
        item = dict(rec)
        per = _coerce_float(item.get("client_avg_rating"))
        item["client_rating"] = per if per is not None else rating
        merged.append(item)
    return merged


def _enrich_client_stats_from_listing_client(
    stats: dict[str, Any],
    row_d: Mapping[str, Any],
) -> None:
    """Fill empty client_stats keys from listing-card fields (after buyer enrichment)."""
    if stats.get("feedback_count") is None:
        tr = _coerce_int(row_d.get("client_total_reviews"))
        if tr is not None:
            stats["feedback_count"] = tr
    if stats.get("client_feedback_score") is None:
        cs = _coerce_float(row_d.get("client_avg_rating"))
        if cs is not None:
            stats["client_feedback_score"] = cs


class JobNormalizer:
    """
    Filter-funnel: raw JSON (str or dict) -> list of flat dicts for scoring.

    Each dict has: id, title, description, budget, hourly_rate, country,
    is_verified, total_spent, client_rating.

    :param site_id: Registry site key (e.g. upwork, contra). Only ``upwork`` has a parser today.
    """

    __slots__ = ("_site_id",)

    def __init__(self, site_id: str = "upwork") -> None:
        self._site_id = (site_id or "upwork").strip().lower()

    def normalize(self, raw_json: Any) -> list[dict[str, Any]]:
        payload = self._parse_payload(raw_json)
        if payload is None:
            return []

        buyer = _buyer_block(payload)
        rating = _client_rating_from_buyer(buyer)

        rows = _rows_for_site(self._site_id, payload)

        for rec in rows:
            _apply_smart_budget(rec)
            self._fill_title_description_fallbacks(payload, rec, buyer)

        return _attach_client_rating(rows, rating)

    def _parse_payload(self, raw_json: Any) -> Mapping[str, Any] | None:
        if raw_json is None:
            return None
        if isinstance(raw_json, Mapping):
            return raw_json
        if isinstance(raw_json, (bytes, bytearray)):
            raw_json = raw_json.decode("utf-8", errors="replace")
        if isinstance(raw_json, str):
            try:
                parsed = json.loads(raw_json)
            except json.JSONDecodeError as exc:
                log.warning("normalizer.json_invalid", error=str(exc))
                return None
            return parsed if _is_mapping(parsed) else None
        log.warning("normalizer.unsupported_type", type_name=type(raw_json).__name__)
        return None

    def _fill_title_description_fallbacks(
        self,
        payload: Mapping[str, Any],
        rec: UpworkJobRecord,
        buyer: Mapping[str, Any] | None,
    ) -> None:
        """Try alternate key paths if primary parse left title/description empty."""
        if rec.get("title") is not None and rec.get("description") is not None:
            return

        candidates: list[tuple[Any, Any]] = []

        info = _dig(payload, "data", "jobPubDetails", "opening", "info")
        if _is_mapping(info):
            candidates.append((info.get("title"), None))

        opening = _dig(payload, "data", "jobPubDetails", "opening")
        if _is_mapping(opening):
            candidates.append((opening.get("title"), opening.get("description")))

        job_node = _dig(payload, "data", "job")
        if _is_mapping(job_node):
            candidates.append((job_node.get("title"), job_node.get("description")))

        for title, desc in candidates:
            _merge_title_description(rec, title, desc)
            if rec.get("title") is not None and rec.get("description") is not None:
                return
        
        # --- NEW: Last resort walk for any field name containing title/desc ---
        if rec.get("title") is None or rec.get("description") is None:
            for k, v in payload.get("data", {}).items() if _is_mapping(payload.get("data")) else []:
                if _is_mapping(v):
                    _merge_title_description(rec, v.get("title"), v.get("description"))
                elif isinstance(v, list) and v and _is_mapping(v[0]):
                    _merge_title_description(rec, v[0].get("title"), v[0].get("description"))


# --- JobSignal (L0/L1 sieve contract) -----------------------------------------

JOB_SIGNAL_KEYS: tuple[str, ...] = (
    "job_id",
    "title",
    "description",
    "budget_type",
    "budget_value",
    "client_stats",
    "source_site",
)


def _empty_job_signal(source_site: str) -> dict[str, Any]:
    return {
        "job_id": None,
        "title": None,
        "description": None,
        "budget_type": "unknown",
        "budget_value": None,
        "client_stats": {
            "country": None,
            "total_spent": None,
            "hire_rate": None,
            "avg_rating": None,
            "is_payment_verified": None,
            "avg_hourly_rate_paid": None,
            "feedback_count": None,
            "client_feedback_score": None,
        },
        "source_site": source_site,
        **_default_gri_field_defaults(),
    }


def _enrich_client_stats_from_buyer(
    stats: dict[str, Any],
    buyer: Mapping[str, Any] | None,
) -> None:
    """
    Optional client telemetry for L0/L1: avg hourly paid to freelancers, review volume/score.

    Paths are defensive; unknown API shapes leave keys unset (caller may merge into pre-filled dict).
    """
    if not _is_mapping(buyer):
        return
    st = buyer.get("stats")
    st_d: Mapping[str, Any] = st if _is_mapping(st) else {}

    ah: float | None = None
    for key in (
        "avgHourlyRatePaid",
        "averageHourlyRatePaid",
        "avgHourlyJobsPaid",
        "averageHourlyPaidToFreelancers",
        "avgPaidHourlyRate",
    ):
        ah = _coerce_float(st_d.get(key))
        if ah is not None:
            break
    if ah is None:
        for key in ("avgHourlyRatePaid", "averageHourlyRatePaid"):
            ah = _coerce_float(buyer.get(key))
            if ah is not None:
                break

    fc = _coerce_int(st_d.get("feedbackCount"))
    if fc is None:
        fc = _coerce_int(st_d.get("feedback_count"))

    cscore = _coerce_float(st_d.get("score"))
    if cscore is None:
        cscore = _coerce_float(st_d.get("clientFeedbackScore"))

    # Do not assign None — avoids wiping values filled earlier (e.g. listing card enrich).
    if ah is not None:
        stats["avg_hourly_rate_paid"] = ah
    if fc is not None:
        stats["feedback_count"] = fc
    if cscore is not None:
        stats["client_feedback_score"] = cscore

    tjwh = _coerce_int(st_d.get("totalJobsWithHires"))
    if tjwh is not None:
        stats["total_jobs_with_hires"] = tjwh

    jobs = buyer.get("jobs")
    if _is_mapping(jobs):
        oc = _coerce_int(jobs.get("openCount"))
        if oc is not None:
            stats["buyer_open_jobs_count"] = oc


def _buyer_from_graphql_payload(payload: Mapping[str, Any]) -> Mapping[str, Any] | None:
    for path in (
        ("data", "jobPubDetails", "buyer"),
        ("data", "jobAuthDetails", "buyer"),
        ("data", "job", "buyer"),
        ("data", "buyer"),
    ):
        b = _dig(payload, *path)
        if _is_mapping(b):
            return b
    return None


def _hire_rate_from_opening(opening: Any) -> float | None:
    if not _is_mapping(opening):
        return None
    ca = opening.get("clientActivity")
    if not _is_mapping(ca):
        return None
    hired = _coerce_float(ca.get("totalHired"))
    apps = _coerce_float(ca.get("totalApplicants"))
    if hired is None or apps is None or apps <= 0:
        return None
    return max(0.0, min(1.0, hired / apps))


def _default_gri_field_defaults() -> dict[str, Any]:
    """Canonical extensions to job_signal for GRI (all sites; null when unknown)."""
    return {
        "posted_at": None,
        "sniffed_at": None,
        "total_applicants": None,
        "invitations_sent": None,
        "invited_to_interview": None,
        "number_of_positions_to_hire": None,
        "contractor_tier": None,
        "workload": None,
        "engagement_weeks": None,
        "engagement_label": None,
        "segmentation_employment_ongoing": False,
        "ontology_skills": None,
        "hourly_budget_max": None,
        "proposals_tier": None,
        "competition_unknown": False,
        "opening_status": None,
        "opening_premium": None,
        "last_buyer_activity": None,
        "sourcing_update_count": None,
        "qualification_min_hours_week": None,
        "qualification_countries": None,
        "qualification_location_check_required": None,
    }


def _extract_opening_gri_fields(opening: Any) -> dict[str, Any]:
    out = _default_gri_field_defaults()
    if not _is_mapping(opening):
        return out

    posted: str | None = None
    for key in ("postedOn", "publishTime"):
        v = opening.get(key)
        if isinstance(v, str) and v.strip():
            posted = v.strip()
            break
    if posted is None:
        inf = opening.get("info")
        if _is_mapping(inf):
            co = inf.get("createdOn")
            if isinstance(co, str) and co.strip():
                posted = co.strip()
    out["posted_at"] = posted

    ost = opening.get("status")
    out["opening_status"] = ost.strip() if isinstance(ost, str) and ost.strip() else None

    inf0 = opening.get("info")
    if _is_mapping(inf0):
        prm = inf0.get("premium")
        if isinstance(prm, bool):
            out["opening_premium"] = prm

    ca = opening.get("clientActivity")
    if _is_mapping(ca):
        out["total_applicants"] = _coerce_int(ca.get("totalApplicants"))
        out["invitations_sent"] = _coerce_int(ca.get("invitationsSent"))
        out["invited_to_interview"] = _coerce_int(ca.get("totalInvitedToInterview"))
        out["number_of_positions_to_hire"] = _coerce_int(ca.get("numberOfPositionsToHire"))
        lba = ca.get("lastBuyerActivity")
        if isinstance(lba, str) and lba.strip():
            out["last_buyer_activity"] = lba.strip()

    ct = opening.get("contractorTier")
    out["contractor_tier"] = ct.strip() if isinstance(ct, str) and ct.strip() else None
    wl = opening.get("workload")
    out["workload"] = wl.strip() if isinstance(wl, str) and wl.strip() else None

    ed = opening.get("engagementDuration")
    if _is_mapping(ed):
        out["engagement_weeks"] = _coerce_int(ed.get("weeks"))
        el = ed.get("label")
        if isinstance(el, str) and el.strip():
            out["engagement_label"] = el.strip()

    seg = opening.get("segmentationData")
    ongoing = False
    if isinstance(seg, list):
        for item in seg:
            if not _is_mapping(item):
                continue
            typ = str(item.get("type") or "").upper()
            val = str(item.get("value") or "").upper()
            lbl = str(item.get("label") or "").upper()
            if "EMPLOYMENT" in typ or "EMPLOYMENT" in val or "ONGOING" in lbl:
                ongoing = True
                break
    out["segmentation_employment_ongoing"] = ongoing

    skills_out: list[dict[str, Any]] = []
    sands = opening.get("sandsData")
    if _is_mapping(sands):
        occ = sands.get("occupation")
        if _is_mapping(occ):
            pl = occ.get("prefLabel")
            if isinstance(pl, str) and pl.strip():
                skills_out.append({"prefLabel": pl.strip(), "relevance": "OCCUPATION"})
        for key in ("ontologySkills", "additionalSkills"):
            arr = sands.get(key)
            if not isinstance(arr, list):
                continue
            for s in arr:
                if not _is_mapping(s):
                    continue
                pref = s.get("prefLabel")
                rel = s.get("relevance")
                if isinstance(pref, str) and pref.strip():
                    skills_out.append(
                        {
                            "prefLabel": pref.strip(),
                            "relevance": rel if isinstance(rel, str) else None,
                        }
                    )
    out["ontology_skills"] = skills_out if skills_out else None

    hm: float | None = None
    ext = opening.get("extendedBudgetInfo")
    if _is_mapping(ext):
        hm = _coerce_float(ext.get("hourlyBudgetMax"))
        if hm is None:
            hm = _coerce_float(ext.get("hourlyBudgetMin"))
    if hm is None:
        hm = _coerce_float(opening.get("hourlyBudgetMax"))
    if hm is None:
        hm = _coerce_float(opening.get("hourlyBudgetMin"))
    out["hourly_budget_max"] = hm

    tier_str: str | None = None
    for k in ("proposalApplicantRange", "proposalsRange", "proposalCountTier", "applicantsRange"):
        v = opening.get(k)
        if isinstance(v, str) and v.strip():
            tier_str = v.strip()
            break
    out["proposals_tier"] = tier_str

    ann = opening.get("annotations")
    if _is_mapping(ann):
        cf = ann.get("customFields")
        if _is_mapping(cf):
            suc = cf.get("sourcingUpdateCount")
            if suc is not None:
                out["sourcing_update_count"] = _coerce_int(suc)

    return out


def _extract_qualifications_fields(jpd: Any) -> dict[str, Any]:
    """jobPubDetails.qualifications (sibling of opening) — plan §10.1."""
    out: dict[str, Any] = {
        "qualification_min_hours_week": None,
        "qualification_countries": None,
        "qualification_location_check_required": None,
    }
    if not _is_mapping(jpd):
        return out
    q = jpd.get("qualifications")
    if not _is_mapping(q):
        return out
    mh = _coerce_float(q.get("minHoursWeek"))
    if mh is None:
        mh = _coerce_float(q.get("minOdeskHours"))
    out["qualification_min_hours_week"] = mh
    countries = q.get("countries")
    if isinstance(countries, list):
        out["qualification_countries"] = [
            c.strip() for c in countries if isinstance(c, str) and c.strip()
        ]
    loc = q.get("locationCheckRequired")
    if isinstance(loc, bool):
        out["qualification_location_check_required"] = loc
    return out


def _finalize_upwork_job_signal(
    sig: dict[str, Any],
    raw_json: Mapping[str, Any],
    *,
    sniffed_at: str | None,
) -> dict[str, Any]:
    q_keys = (
        "qualification_min_hours_week",
        "qualification_countries",
        "qualification_location_check_required",
    )
    merged_q: dict[str, Any] = {k: None for k in q_keys}
    for container in (
        _dig(raw_json, "data", "jobPubDetails"),
        _dig(raw_json, "data", "jobAuthDetails", "opening"),
    ):
        if not _is_mapping(container):
            continue
        qx = _extract_qualifications_fields(container)
        for k in q_keys:
            if merged_q.get(k) is not None:
                continue
            v = qx.get(k)
            if v is None:
                continue
            if k == "qualification_countries" and v == []:
                continue
            merged_q[k] = v
    for k, v in merged_q.items():
        if v is None:
            continue
        if k == "qualification_countries" and v == []:
            continue
        sig[k] = v
    if sniffed_at:
        sig["sniffed_at"] = sniffed_at
    sig.setdefault("competition_unknown", False)
    return sig


def _infer_budget_type(row: Mapping[str, Any], opening_info_type: Any) -> str:
    """
    Prefer GraphQL job type (opening.info.type or listing ``type`` / ``engagement_type``),
    then hourly_range / numeric budget heuristics.
    """
    gt = opening_info_type
    if gt is None:
        gt = row.get("engagement_type")
    if isinstance(gt, str):
        u = gt.strip().upper()
        if u == "HOURLY":
            return "hourly"
        if u == "FIXED":
            return "fixed"
    if row.get("hourly_rate"):
        return "hourly"
    if row.get("budget") is not None:
        return "fixed"
    return "unknown"


def _row_to_job_signal(
    row: Mapping[str, Any],
    opening: Any,
    source_site: str,
    buyer: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    info_type: Any = None
    if _is_mapping(opening):
        inf = opening.get("info")
        if _is_mapping(inf):
            info_type = inf.get("type")
    row_d = dict(row)
    bt = _infer_budget_type(row_d, info_type)
    hr_open = _hire_rate_from_opening(opening) if _is_mapping(opening) else None
    list_rating = row_d.get("client_avg_rating")
    stats: dict[str, Any] = {
        "country": row_d.get("country"),
        "total_spent": row_d.get("total_spent"),
        "hire_rate": hr_open,
        "avg_rating": list_rating
        if list_rating is not None
        else row_d.get("client_rating"),
        "is_payment_verified": row_d.get("is_verified"),
        "avg_hourly_rate_paid": None,
        "feedback_count": None,
        "client_feedback_score": None,
    }
    _enrich_client_stats_from_buyer(stats, buyer)
    _enrich_client_stats_from_listing_client(stats, row_d)
    if stats.get("hire_rate") is None:
        cth = _coerce_int(row_d.get("client_total_hires"))
        ctj = _coerce_int(row_d.get("client_jobs_posted"))
        if cth is not None and ctj is not None and ctj > 0:
            stats["hire_rate"] = max(0.0, min(1.0, float(cth) / float(ctj)))
    if stats.get("total_jobs_with_hires") is None:
        tjh = _coerce_int(row_d.get("client_total_hires"))
        if tjh is not None:
            stats["total_jobs_with_hires"] = tjh
    gri_extras = _extract_opening_gri_fields(opening) if _is_mapping(opening) else _default_gri_field_defaults()
    ta = _coerce_int(row_d.get("total_applicants"))
    if ta is not None and gri_extras.get("total_applicants") is None:
        gri_extras["total_applicants"] = ta
    pr = row_d.get("posted_at")
    if isinstance(pr, str) and pr.strip():
        ex = gri_extras.get("posted_at")
        if not (isinstance(ex, str) and ex.strip()):
            gri_extras["posted_at"] = pr.strip()
    return {
        "job_id": row_d.get("id"),
        "title": row_d.get("title"),
        "description": row_d.get("description"),
        "budget_type": bt,
        "budget_value": row_d.get("budget"),
        "client_stats": stats,
        "source_site": source_site,
        **gri_extras,
    }


def normalize_upwork_job_signals(
    raw_json: Mapping[str, Any],
    source_site: str,
    *,
    sniffed_at: str | None = None,
) -> list[dict[str, Any]]:
    """
    Extract every job card / opening from one sniffed GraphQL payload (feed batch, search edges, etc.).

    Previously only ``rows[0]`` / ``jobs[0]`` was scored — one Load More response with 10 jobs produced
    a single graph run. Callers should iterate this list and invoke scoring per signal.
    """
    opening = _upwork_opening_node_for_gri(raw_json)
    buyer = _buyer_block(raw_json)
    rows = JobNormalizer("upwork").normalize(raw_json)

    if not rows:
        jpd = _dig(raw_json, "data", "jobPubDetails")
        if _is_mapping(jpd):
            jobs = jpd.get("jobs")
            if isinstance(jobs, list):
                built: list[dict[str, Any]] = []
                for j in jobs:
                    if not _is_mapping(j):
                        continue
                    row = normalize_listing_card(j, buyer)
                    _apply_smart_budget(row)
                    row_d = dict(row)
                    gr = _client_rating_from_buyer(buyer)
                    per = _coerce_float(row_d.get("client_avg_rating"))
                    row_d["client_rating"] = per if per is not None else gr
                    built.append(row_d)
                rows = built

    if not rows:
        sig = _empty_job_signal(source_site)
        return [_finalize_upwork_job_signal(sig, raw_json, sniffed_at=sniffed_at)]

    seen_ids: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in rows:
        sig = _row_to_job_signal(row, opening, source_site, buyer)
        fin = _finalize_upwork_job_signal(sig, raw_json, sniffed_at=sniffed_at)
        jid = str(fin.get("job_id") or "").strip()
        if jid:
            if jid in seen_ids:
                continue
            seen_ids.add(jid)
        out.append(fin)
    return out


def _normalize_upwork_job_signal(
    raw_json: Mapping[str, Any],
    source_site: str,
    *,
    sniffed_at: str | None = None,
) -> dict[str, Any]:
    multi = normalize_upwork_job_signals(raw_json, source_site, sniffed_at=sniffed_at)
    return multi[0] if multi else _finalize_upwork_job_signal(
        _empty_job_signal(source_site), raw_json, sniffed_at=sniffed_at
    )


def _walk_first_job_like(obj: Any, depth: int = 0, max_depth: int = 12) -> Mapping[str, Any] | None:
    if depth > max_depth:
        return None
    if isinstance(obj, Mapping):
        title_like: str | None = None
        for key in ("title", "name", "headline"):
            raw = obj.get(key)
            if isinstance(raw, str) and len(raw.strip()) > 1:
                title_like = raw.strip()
                break
        if title_like is not None:
            if any(
                k in obj
                for k in (
                    "description",
                    "body",
                    "summary",
                    "details",
                    "id",
                    "ciphertext",
                    "budget",
                    "amount",
                    "slug",
                    "hourlyBudgetMin",
                    "hourlyBudgetMax",
                    "minHourlyRate",
                    "maxHourlyRate",
                )
            ):
                return obj
        for v in obj.values():
            hit = _walk_first_job_like(v, depth + 1, max_depth)
            if hit is not None:
                return hit
    elif isinstance(obj, list):
        for item in obj[:40]:
            hit = _walk_first_job_like(item, depth + 1, max_depth)
            if hit is not None:
                return hit
    return None


def _generic_country(node: Mapping[str, Any]) -> str | None:
    for path in (
        ("client", "country"),
        ("buyer", "location", "country"),
        ("employer", "country"),
        ("company", "country"),
    ):
        c = _dig(node, *path)
        if isinstance(c, str) and c.strip():
            return c.strip()
        if _is_mapping(c) and isinstance(c.get("name"), str) and c["name"].strip():
            return c["name"].strip()
    return None


def _normalize_generic_job_signal(raw_json: Mapping[str, Any], source_site: str) -> dict[str, Any]:
    root = raw_json.get("data")
    node = _walk_first_job_like(root if _is_mapping(root) else raw_json)
    if node is None:
        return _empty_job_signal(source_site)

    title: str | None = None
    for _tk in ("title", "name", "headline"):
        tv = node.get(_tk)
        if isinstance(tv, str) and len(tv.strip()) > 1:
            title = tv.strip()
            break
    desc: str | None = None
    for _dk in ("description", "body", "summary", "details"):
        dv = node.get(_dk)
        if isinstance(dv, str) and dv.strip():
            desc = dv
            break
    raw_jid = node.get("id") or node.get("ciphertext") or node.get("slug") or node.get("uuid")
    job_id = str(raw_jid) if raw_jid is not None and raw_jid != "" else None

    amt = _dig(node, "amount", "amount")
    bv = _coerce_float(amt)
    if bv is None:
        bv = _coerce_float(_dig(node, "budget", "amount"))
    if bv is None:
        bv = _coerce_float(_dig(node, "budget", "min"))
    if bv is None:
        bv = _coerce_float(_dig(node, "budget", "max"))
    if bv is None:
        bv = _coerce_float(node.get("fixedPrice"))
    hr_lo = _coerce_float(node.get("hourlyBudgetMin"))
    hr_hi = _coerce_float(node.get("hourlyBudgetMax"))
    if hr_lo is None:
        hr_lo = _coerce_float(node.get("minHourlyRate"))
    if hr_hi is None:
        hr_hi = _coerce_float(node.get("maxHourlyRate"))
    if hr_lo is None:
        hr_lo = _coerce_float(_dig(node, "hourlyRate", "min"))
    if hr_hi is None:
        hr_hi = _coerce_float(_dig(node, "hourlyRate", "max"))
    budget_type = "unknown"
    budget_value = bv
    if hr_lo is not None or hr_hi is not None:
        budget_type = "hourly"
        nums = [x for x in (hr_lo, hr_hi) if x is not None]
        budget_value = max(nums) if nums else None
    elif bv is not None:
        budget_type = "fixed"

    gri_defaults = _default_gri_field_defaults()
    pa_node = posted_at_from_upwork_node(node)
    if pa_node:
        gri_defaults["posted_at"] = pa_node
    if budget_type == "hourly":
        hm = hr_hi if hr_hi is not None else hr_lo
        if hm is not None:
            gri_defaults["hourly_budget_max"] = hm

    spent = _coerce_float(_dig(node, "client", "totalSpent"))
    if spent is None:
        spent = _coerce_float(_dig(node, "buyer", "stats", "totalCharges"))

    rating = _coerce_float(_dig(node, "client", "rating"))
    if rating is None:
        rating = _coerce_float(_dig(node, "buyer", "stats", "score"))

    verified: bool | None = None
    v = _dig(node, "buyer", "isPaymentMethodVerified")
    if isinstance(v, bool):
        verified = v

    stats: dict[str, Any] = {
        "country": _generic_country(node),
        "total_spent": spent,
        "hire_rate": None,
        "avg_rating": rating,
        "is_payment_verified": verified,
        "avg_hourly_rate_paid": None,
        "feedback_count": None,
        "client_feedback_score": None,
    }

    payload_buyer = _buyer_from_graphql_payload(raw_json)
    node_buyer = _dig(node, "buyer")
    if _is_mapping(payload_buyer):
        _enrich_client_stats_from_buyer(stats, payload_buyer)
    elif _is_mapping(node_buyer):
        _enrich_client_stats_from_buyer(stats, node_buyer)

    out = {
        "job_id": job_id,
        "title": title,
        "description": desc,
        "budget_type": budget_type,
        "budget_value": budget_value,
        "client_stats": stats,
        "source_site": source_site,
        **gri_defaults,
    }
    ost = node.get("opening_status") if isinstance(node.get("opening_status"), str) else node.get("status")
    if isinstance(ost, str) and ost.strip():
        out["opening_status"] = ost.strip().upper()
    return out


def normalize_upwork_job(raw_json: dict[str, Any]) -> dict[str, Any]:
    """Upwork-only convenience; same as ``normalize_job_signal('upwork', raw_json)``."""
    if not _is_mapping(raw_json):
        return _empty_job_signal("upwork")
    return _normalize_upwork_job_signal(raw_json, "upwork")


def normalize_job_signal(
    site_id: str,
    raw_json: Mapping[str, Any],
    *,
    sniffed_at: str | None = None,
    competition_unknown: bool | None = None,
) -> dict[str, Any]:
    """
    Build JobSignal for L0/L1 from raw GraphQL JSON.

    * ``upwork`` — structured paths (jobPubDetails, jobs[0], similarJobs).
    * Other registered sites — best-effort walk under ``data`` for job-like objects.
    * ``sniffed_at`` — ISO time when payload was captured (freshness fallback if ``posted_at`` missing).
    * ``competition_unknown`` — force plan §6A neutral competition (default: True for non-Upwork).
    """
    sid = (site_id or "unknown").strip().lower()
    if not _is_mapping(raw_json):
        return _empty_job_signal(sid)
    if sid in _UPWORK_SITE_IDS:
        return _normalize_upwork_job_signal(raw_json, sid, sniffed_at=sniffed_at)
    sig = _normalize_generic_job_signal(raw_json, sid)
    if sniffed_at:
        sig["sniffed_at"] = sniffed_at
    if competition_unknown is not None:
        sig["competition_unknown"] = bool(competition_unknown)
    elif sid not in _UPWORK_SITE_IDS:
        sig.setdefault("competition_unknown", True)
    return sig


def normalize_job_signals(
    site_id: str,
    raw_json: Mapping[str, Any],
    *,
    sniffed_at: str | None = None,
    competition_unknown: bool | None = None,
) -> list[dict[str, Any]]:
    """
    All job signals from one GraphQL body (Upwork: full feed batch). Other sites: singleton list.
    """
    sid = (site_id or "unknown").strip().lower()
    if not _is_mapping(raw_json):
        return []
    if sid in _UPWORK_SITE_IDS:
        return normalize_upwork_job_signals(raw_json, sid, sniffed_at=sniffed_at)
    one = normalize_job_signal(
        sid,
        raw_json,
        sniffed_at=sniffed_at,
        competition_unknown=competition_unknown,
    )
    return [one]


def scoring_signal_nonempty(signal: Mapping[str, Any]) -> bool:
    """True if payload is worth running L0/L1 (avoid noise on empty suggestions)."""
    if signal.get("job_id"):
        return True
    t = signal.get("title")
    return isinstance(t, str) and len(t.strip()) > 2


def normalized_job_keys() -> tuple[str, ...]:
    """Stable column order for exporters / L0 rules."""
    return NORMALIZED_JOB_KEYS
