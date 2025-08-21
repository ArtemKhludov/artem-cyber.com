# Playbook: Splunk UF shows green, search shows empty

**ID:** ENG-PB-003  
**Version:** 1.1  
**Aligned to case date:** 2025-08-20  
**Owner:** Artem Khludov

## Phase 0: Prove roles

1. `find $SPLUNK_HOME -name outputs.conf` on **both** UF and Enterprise. Indexer-only Enterprise must not forward cooked data away.  
2. `splunk btool outputs list --debug` on each node.

Lab write-ups often use **macOS** paths such as `/Applications/Splunk` and `/Applications/SplunkForwarder`; on Linux replace with your `$SPLUNK_HOME`.

## Phase 1: Stop collisions

1. Split **mgmt** ports if UF and Enterprise share one OS instance (lab pattern).  
2. Remove **`$SPLUNK_HOME/etc/system/local/outputs.conf`** forward stanza from indexer-only nodes after sign-off.

## Phase 2: Clean inputs

1. `splunk btool inputs list` and disable legacy stanzas you do not need (examples seen in the field: `audit_trail`, `Splunk_TA_aws`).  
2. Fix file ACLs on monitored paths.

## Phase 3: Validate

```spl
index=_internal source=*splunkd.log* TcpInputProc OR TcpOutputFd earliest=-15m
| stats count by host, component
```

## Prevention

- Diagram **sources → UF → indexer** before install.  
- Version-control `local/` for nodes that own SOC visibility.

## Further reading

- Splunk docs: `outputs.conf`, `inputs.conf`, forwarder vs indexer roles for your Splunk version.
