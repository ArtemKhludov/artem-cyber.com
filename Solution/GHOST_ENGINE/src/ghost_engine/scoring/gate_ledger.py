"""
Structured traversal reports for job scoring: each gate — pass / fail / skip, why, next step.

Used by the LangGraph scoring subgraph (merge_notify) and adapter structlog.
"""

from __future__ import annotations

from typing import Any, Mapping

from ghost_engine.scoring.normalizer import scoring_signal_nonempty


def _row(
    gate: str,
    outcome: str,
    code: str,
    why: str,
    proceeds: bool,
    next_step: str,
) -> dict[str, Any]:
    return {
        "gate": gate,
        "outcome": outcome,
        "code": code,
        "why": why,
        "proceeds": proceeds,
        "next": next_step,
    }


def _finalize(job_id: Any, steps: list[dict[str, Any]], flow_continues: bool) -> dict[str, Any]:
    parts: list[str] = []
    for s in steps:
        parts.append(f"{s['gate']}:{s['outcome']}({s['code']})→{s['next']}")
    summary_ru = " | ".join(parts)
    return {
        "job_id": job_id,
        "steps": steps,
        "summary_ru": summary_ru,
        "flow_continues": flow_continues,
    }


def build_scoring_traversal_report(state: Mapping[str, Any]) -> dict[str, Any]:
    """
    Reconstruct how far the job got through ``build_scoring_graph`` from final state.

    Gates: normalize → l0 → gri_pipeline → l2_llm (pass/skip).
    """
    steps: list[dict[str, Any]] = []
    sig = state.get("job_signal")
    jid = sig.get("job_id") if isinstance(sig, dict) else None

    if not isinstance(sig, dict) or not scoring_signal_nonempty(sig):
        code = str(state.get("l0_code") or "NO_SIGNAL")
        why = (
            "Нет нормализованного job_signal"
            if not isinstance(sig, dict)
            else "После normalize сигнал пустой (нет job_id/title и т.д.)"
        )
        steps.append(
            _row(
                "normalize",
                "fail",
                code,
                why,
                False,
                "Остановка графа: не формируем GRI, в trash только при отдельном пути адаптера",
            )
        )
        return _finalize(jid, steps, False)

    steps.append(
        _row(
            "normalize",
            "pass",
            "OK",
            "GraphQL/сырой ответ сведён к job_signal",
            True,
            "Шлюз L0 (scoring.yaml)",
        )
    )

    l0_ok = state.get("l0_passed") is True
    l0c = str(state.get("l0_code") or "")
    l0d = str(state.get("l0_detail") or "").strip()
    if not l0_ok:
        steps.append(
            _row(
                "l0",
                "fail",
                l0c,
                l0d or "Сработало правило жёсткого фильтра",
                False,
                "Стоп: запись в trash JSONL, уведомление о вакансии не ставится",
            )
        )
        return _finalize(jid, steps, False)

    hold = bool(state.get("l0_soft_hold_missing_budget"))
    l0_why = l0d or "Все проверки L0 пройдены"
    if hold:
        l0_why += "; SOFT_HOLD_MISSING_BUDGET → needs_manual_review"
    steps.append(
        _row(
            "l0",
            "pass",
            l0c,
            l0_why,
            True,
            "Цепочка GRI: market → client → effort → roi → budget_infer → estimates",
        )
    )

    applied_bi = state.get("budget_llm_infer_applied") is True
    skipped_bi = state.get("budget_llm_infer_skipped") is True
    bi_reason = str(state.get("budget_llm_infer_skip_reason") or "").strip()
    if applied_bi:
        bd = state.get("gri_breakdown")
        conf_l = ""
        if isinstance(bd, dict):
            c = bd.get("budget_llm_confidence")
            if isinstance(c, (int, float)):
                conf_l = f", confidence={float(c):.2f}"
        steps.append(
            _row(
                "budget_infer",
                "pass",
                "APPLIED",
                f"Ollama JSON → budget_value + пересчёт GRI (B_source=llm_budget_infer{conf_l})",
                True,
                "estimates → l2_eligibility (серый коридор L2)",
            )
        )
    elif skipped_bi:
        _bi_skip_expl: dict[str, str] = {
            "disabled": "budget_llm_infer.enabled=false в scoring.yaml",
            "l0_failed": "внутреннее: L0 не прошёл до узла (не ожидается)",
            "budget_value_present": "триаж: уже есть budget_value",
            "hourly_max_present": "триаж: уже есть hourly_budget_max",
            "b_source_mismatch": "триаж: B_source ≠ require_b_source_equals",
            "no_breakdown": "триаж: нет gri_breakdown",
            "not_gray_zone": "триаж: GRI вне l2_gray_zone",
            "no_gri": "триаж: нет числового gri",
            "no_gray_config": "триаж: нет gri.l2_gray_zone в конфиге",
            "no_signal": "триаж: нет job_signal в state",
            "rate_limit": "лимит max_calls_per_minute",
            "sortie_limit": "лимит max_calls_per_sortie (сброс в begin_feed_sortie)",
            "bad_state": "нет job_signal / gri_components перед вызовом Ollama",
            "ollama_unreachable": "Ollama HTTP/сеть/таймаут",
            "bad_ollama_shape": "некорректный ответ API generate",
            "unparseable_json": "тело ответа не JSON",
            "pydantic_reject": "JSON не прошёл Pydantic-схему",
            "empty_signal": "пустой title+description для промпта",
            "low_confidence_or_null": "confidence < min или equiv_usd_fixed null",
        }
        why_bi = _bi_skip_expl.get(bi_reason, bi_reason or "unknown")
        steps.append(
            _row(
                "budget_infer",
                "skip",
                bi_reason or "unknown",
                why_bi,
                True,
                "estimates → l2_eligibility (fail-open по политике YAML)",
            )
        )
    else:
        steps.append(
            _row(
                "budget_infer",
                "skip",
                "no_flags",
                "Нет budget_llm_infer_* в state (legacy/мок графа) — узел не отражён",
                True,
                "estimates → l2_eligibility",
            )
        )

    gri = state.get("gri")
    tier = state.get("job_tier")
    persona = str(state.get("persona_tag") or "")
    gri_s = f"{float(gri):.4f}" if isinstance(gri, (int, float)) else "n/a"
    steps.append(
        _row(
            "gri_pipeline",
            "pass",
            "GRI_ASSEMBLED",
            f"Итог GRI={gri_s}, tier={tier}, persona={persona} (после roi и, при необходимости, budget_infer)",
            True,
            "Снимок price/hours → допуск L2 gray zone",
        )
    )

    if state.get("l2_llm_skipped"):
        reason = str(state.get("l2_llm_skip_reason") or "unknown")
        expl = {
            "not_gray_zone": "GRI вне интервала l2_gray_zone в scoring.yaml",
            "llm_disabled": "l2_gray_zone.llm_enabled выключен",
            "bad_state": "Нет данных для Ollama-судьи",
        }.get(reason, reason)
        steps.append(
            _row(
                "l2_llm",
                "skip",
                reason,
                expl,
                True,
                "merge_notify: лог structlog gri_metrics, дальше адаптер (cover / notify policy)",
            )
        )
    else:
        rec = str(state.get("l2_recommend") or "")
        fit = state.get("l2_fit_score")
        fit_s = f"{float(fit):.3f}" if isinstance(fit, (int, float)) else "n/a"
        steps.append(
            _row(
                "l2_llm",
                "pass",
                rec or "OK",
                f"Ollama-судья: fit_score={fit_s}, recommend={rec}",
                True,
                "При reject в серой зоне tier мог смениться на MANUAL/TRASH",
            )
        )

    return _finalize(jid, steps, True)
