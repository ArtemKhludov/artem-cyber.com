"""HTML summaries for Telegram (escape untrusted job fields)."""

from __future__ import annotations

import html

from ghost_engine.notify.contract import ApprovedJobNotifyPayload
from ghost_engine.scoring.engine import TAG_SECURITY_VALUED


def _clip(s: str, max_len: int) -> str:
    t = s.strip().replace("\n", " ")
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"


_MAX_COVER_IN_TELEGRAM = 3000


def _gri_prefix_html(item: ApprovedJobNotifyPayload) -> str:
    """Compact prefix for batch lines (still shows GRI + tier hint)."""
    if item.gri is None:
        return ""
    gf = float(item.gri)
    fire = "🔥 " if gf >= 0.85 else "⚡ " if gf >= 0.65 else ""
    return f"[GRI: {gf:.2f}] {fire}"


def _score_line_html(item: ApprovedJobNotifyPayload) -> str:
    """fix_1 §4: Score (GRI as fit proxy)."""
    if item.gri is None:
        return ""
    gf = float(item.gri)
    fire = "🔥 " if gf >= 0.85 else "⚡ " if gf >= 0.65 else ""
    return f"<b>Score:</b> {fire}{gf:.2f} <i>(GRI)</i>"


def format_single_job_detailed(item: ApprovedJobNotifyPayload) -> str:
    """Single job card HTML for operators (Telegram parse_mode=HTML). Aligns with fix_1 §4 summary block."""
    js = item.job_signal
    title = js.get("title") if isinstance(js.get("title"), str) else ""
    title_esc = html.escape(title.strip() or "(no title)")

    bv = js.get("budget_value")
    try:
        budget_num = float(bv) if bv is not None else None
    except (TypeError, ValueError):
        budget_num = None
    curr = js.get("budget_currency") if isinstance(js.get("budget_currency"), str) else ""
    if budget_num is not None:
        budget_line = f"{budget_num:g} {curr}".strip() if curr else f"{budget_num:g}"
        budget_display = f"${budget_num:g}" + (f" {curr}".strip() if curr else "")
    else:
        bud_s = js.get("budget") if isinstance(js.get("budget"), str) else ""
        budget_line = bud_s.strip() if bud_s else "n/a"
        budget_display = budget_line
    budget_esc = html.escape(budget_line)
    budget_summary_esc = html.escape(budget_display)

    country_raw = js.get("country")
    if not (isinstance(country_raw, str) and country_raw.strip()):
        country_raw = js.get("client_country")
    if not (isinstance(country_raw, str) and country_raw.strip()):
        stats = js.get("stats")
        if isinstance(stats, dict):
            c2 = stats.get("country")
            country_raw = c2 if isinstance(c2, str) else ""
    country_esc = html.escape(country_raw.strip() if isinstance(country_raw, str) else "n/a")

    jid = html.escape(str(item.job_id or "?"))
    site = html.escape(item.site_id)
    flag = "\n⚠️ <i>manual review</i>" if item.needs_manual_review else ""
    
    # Dynamic Tags (Clusters)
    tags_line = ""
    if item.job_tags:
        clean_tags = [html.escape(str(t).strip().upper()) for t in item.job_tags if t]
        if clean_tags:
            tags_line = f"\n🏷 <i>Tags:</i> <code>{', '.join(clean_tags)}</code>"

    tension = ""
    if item.opsec.get("high_gri_opsec_tension"):
        tension = (
            "\n🎯⚠️ <i>High GRI + semantic/opsec risk — verify client intent before auto-reply</i>"
        )
    persona_line = ""
    if isinstance(item.persona_tag, str) and item.persona_tag.strip():
        persona_line = f"\n<i>persona:</i> <code>{html.escape(item.persona_tag.strip())}</code>"

    summary_lines: list[str] = [
        f"<b>Title:</b> {title_esc}",
        f"<b>Budget:</b> <b>{budget_summary_esc}</b>",
    ]
    if item.estimated_price_usd is not None:
        ep = float(item.estimated_price_usd)
        ep_s = str(int(ep)) if ep == int(ep) else f"{ep:.2f}".rstrip("0").rstrip(".")
        summary_lines.append(f"<b>Estimation:</b> <b>${html.escape(ep_s)}</b>")
    if item.estimated_time_hours is not None:
        th = float(item.estimated_time_hours)
        summary_lines.append(f"<b>Time:</b> <b>{html.escape(f'{th:.1f}')}h</b>")
    score_line = _score_line_html(item)
    if score_line:
        summary_lines.append(score_line)
    summary_block = "\n".join(summary_lines)

    url_line = ""
    jpu = item.job_public_url
    if isinstance(jpu, str) and jpu.strip().lower().startswith("http"):
        url_esc = html.escape(jpu.strip(), quote=True)
        url_line = f"\n<b>URL:</b> <a href=\"{url_esc}\">open job</a>"
    conf_line = ""
    if item.estimate_confidence is not None:
        conf_line = f"\n<i>estimate confidence:</i> <code>{html.escape(f'{float(item.estimate_confidence):.2f}')}</code>"

    meta = (
        f"{summary_block}\n"
        f"<code>{site}</code> | L1={item.l1_score} | <code>{jid}</code>"
        f"{flag}{tags_line}{tension}{persona_line}\n"
        f"<i>Platform budget (raw):</i> {budget_esc}\n"
        f"<b>Country:</b> <b>{country_esc}</b>{url_line}{conf_line}"
    )

    cl = item.cover_letter
    if isinstance(cl, str) and cl.strip():
        body = cl.strip()
        if len(body) > _MAX_COVER_IN_TELEGRAM:
            body = body[: _MAX_COVER_IN_TELEGRAM - 1] + "…"
        cover_block = f"\n\n<b>Отклик</b>\n<pre>{html.escape(body)}</pre>"
    else:
        cover_block = "\n\n<i>Отклик ещё не сгенерирован.</i>"

    return f"{meta}{cover_block}"


def format_notify_batch_html(
    items: list[ApprovedJobNotifyPayload],
    *,
    max_lines: int,
    title_preview_len: int = 72,
) -> str:
    """One batched operator message; items already bounded by producer."""
    n = len(items)
    header = html.escape(f"GHOST — {n} new job(s)")
    lines: list[str] = [f"<b>{header}</b>"]
    shown = items[:max(1, max_lines)]
    for p in shown:
        title = p.job_signal.get("title") if isinstance(p.job_signal.get("title"), str) else ""
        title_esc = html.escape(_clip(title, title_preview_len))
        jid = html.escape(str(p.job_id or "?"))
        site = html.escape(p.site_id)
        flag = " ⚠️ <i>manual</i>" if p.needs_manual_review else ""
        ups = ""
        if p.job_tags and TAG_SECURITY_VALUED in p.job_tags:
            ups = " 🛡 <i>DevSec</i>"
        ten = " 🎯⚠️" if p.opsec.get("high_gri_opsec_tension") else ""
        gri_bit = _gri_prefix_html(p).replace("\n", "").strip()
        prefix = f"{gri_bit} " if gri_bit else ""
        lines.append(
            f"• {prefix}<code>{site}</code> | L1={p.l1_score} | <code>{jid}</code> — {title_esc}{flag}{ups}{ten}"
        )
    if n > len(shown):
        lines.append(html.escape(f"… and {n - len(shown)} more in queue (raise max_lines)."))
    return "\n".join(lines)
