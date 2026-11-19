# Doorway replay protocol

Five starting decisions come from the committed visit-departure trace. Each replay starts from the corresponding day-96 save raised to rules 259. Only the designated visitor and recipient are eligible for the experiment, starting at the specified decision tick. Match the original activity ID, coordinates and whereabouts timestamp. Follow every subsequent visit by that pair until day 97. The two later decisions by Isla II and Ulric are independent counterfactuals. Do not add their outcomes to the earlier forks as if they happened on one timeline.

* Native runs exercise unchanged choices and must reproduce the committed endpoint hash and initial failure.
* Door runs use the household home in the visitor’s recent firsthand room memory. Use the regular path and admission checks. Looking for the recipient indoors happens after entry. The welfare handler decides whether a handover is needed and possible.
* Closed runs turn off admissions only during this visitor’s attempted doorway entry. After a refusal, suppress another welfare offer from the same recent room record. A newer sighting may justify another attempt. A held decision tick is not a launched retry.

All arms require final conservation. Launch, admission, hold and end events are in the JSON files. These arms test access to a particular person and retries for the rest of that day. They do not estimate the settlement-wide effect of enabling the change.

From the worktree root, build with node scripts/build_visit_door.mjs <bundle.cjs>. Run node <bundle.cjs> --load C:/dev/lw_saves/rules256/<seed>-day96.save.json --rules-up 259 --tick <tick> --arm <native|door|closed> --out review_evidence/visit-door/<tick>-<arm>.json. Use Aspen for 230957, 231029 and 231102, and gen-4 for 232179 and 232412. Then run node scripts/visit_door_tables.mjs.
