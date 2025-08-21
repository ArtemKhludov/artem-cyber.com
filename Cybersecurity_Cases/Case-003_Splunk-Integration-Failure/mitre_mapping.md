# ATT&CK note: Case 003 (Splunk misconfiguration)

**Case date:** 2025-08-20

## Scope

Pure **misconfiguration** and visibility risk. Mapping **T1078** to file permission errors is a stretch (not credential abuse). Prefer honest framing.

## Optional mapping

| ID | When it is fair |
|----|------------------|
| T1562.001 | Visibility impaired because logs never indexed where hunters search |

Other rows (T1082, T1070) often mix **noise** with **evasion** language. Use **SRE / platform** language first; add ATT&CK only if a report template forces it.

Official ATT&CK matrix: https://attack.mitre.org/

## Example SPL

```spl
index=_internal source="*splunkd.log" "outputs.conf" OR "forwarder" OR "indexer"
```

```spl
index=_internal source="*splunkd.log" "permission denied" OR "access denied"
```
